import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import puppeteerCore from 'puppeteer-core';
import type { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
// Aumenta el límite de ejecución en Vercel (Node) para generación de PDF
export const maxDuration = 30;

function getOrigin(req: NextRequest): string {
  // Preferir el origin real de Next para evitar puertos incorrectos en dev
  try {
    // nextUrl.origin existe en Next.js y refleja el host/puerto correcto
    const origin = (req as any).nextUrl?.origin as string | undefined;
    if (origin) return origin;
  } catch {}
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function resolveLocalChromePath(): string | undefined {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  if (envPath && fs.existsSync(envPath)) {
    console.log('[Chrome Detection] Found via env var:', envPath);
    return envPath;
  }

  const platform = os.platform();
  const candidates: string[] = [];

  if (platform === 'win32') {
    candidates.push(
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      // Edge como alternativa
      'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      path.join(process.env.LOCALAPPDATA || 'C:\\Users', 'Google', 'Chrome', 'Application', 'chrome.exe')
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    candidates.push('/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser');
  }

  console.log('[Chrome Detection] Platform:', platform);
  console.log('[Chrome Detection] Checking candidates:', candidates.length);

  for (const candidate of candidates) {
    const exists = fs.existsSync(candidate);
    if (exists) {
      console.log('[Chrome Detection] Found:', candidate);
      return candidate;
    }
  }

  console.log('[Chrome Detection] No Chrome found in standard locations');
  return undefined;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const reqUrl = new URL(request.url);
  const debug = reqUrl.searchParams.get('debug') === '1';
  if (!id) {
    return NextResponse.json({ error: 'Falta el id de inspección' }, { status: 400 });
  }

  const origin = getOrigin(request);

  let browser: Browser | null = null;
  try {
    const diag: Record<string, any> = { origin, debug };
    // Validación de inspección con Supabase (omitir en desarrollo si faltan ENV)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const devNoSupabase = (!supabaseUrl || !supabaseKey) && process.env.NODE_ENV === 'development';
    const baseResponse = new NextResponse();
    if (!devNoSupabase) {
      // Preparar cliente de Supabase con cookies y/o Authorization
      const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            try {
              baseResponse.cookies.set({ name, value, ...options });
            } catch {}
          },
          remove(name: string, options: any) {
            try {
              baseResponse.cookies.set({ name, value: '', ...options, maxAge: 0 });
            } catch {}
          },
        },
      });

      const authHeader = request.headers.get('authorization') || '';
      const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
      diag['authHeader'] = !!authHeader;
      diag['bearerProvided'] = !!bearerToken;
      const supabaseWithToken = bearerToken
        ? createSupabaseClient(supabaseUrl!, supabaseKey!, {
            global: { headers: { Authorization: `Bearer ${bearerToken}` } },
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
          })
        : null;

      const client = supabaseWithToken || supabase;
      const { data: inspectionRow, error: dbError } = await client
        .from('inspections')
        .select('id')
        .eq('id', id)
        .single();

      if (dbError) {
        const notFound = dbError?.code === 'PGRST116' || /No rows/.test(dbError?.message || '');
        if (notFound) {
          return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 });
        }
        const payload: any = { error: 'Error consultando la inspección', details: dbError?.message };
        if (debug) payload['diag'] = { ...diag, dbError: dbError?.message };
        return NextResponse.json(payload, { status: 500 });
      }
      if (!inspectionRow?.id) {
        return NextResponse.json({ error: 'Inspección no encontrada' }, { status: 404 });
      }
    } else {
      // En desarrollo sin Supabase: continuar sin validar la existencia en BD
      diag['devNoSupabase'] = true;
    }

    const logoParam = encodeURIComponent(`${origin}/logo.png`);
    const targetUrl = `${origin}/templates/forata057?id=${encodeURIComponent(id)}&pdf=1&print=true&logo=${logoParam}`;
    diag['targetUrl'] = targetUrl;

    // Estrategia: En desarrollo local, priorizar Chrome instalado; en producción usar Chromium serverless
    const isDev = process.env.NODE_ENV === 'development';
    const isServerless = !!(process.env.AWS_REGION || process.env.VERCEL);

    if (isDev && !isServerless) {
      // Desarrollo local: usar Chrome local primero
      const localChrome = resolveLocalChromePath();
      diag['localChrome'] = localChrome || null;

      if (localChrome) {
        browser = await puppeteerCore.launch({
          headless: true,
          executablePath: localChrome,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--font-render-hinting=medium',
          ],
        });
        diag['browserSource'] = 'localChrome';
      } else {
        // Fallback: intentar puppeteer con Chrome incluido
        try {
          const puppeteer = (await import('puppeteer')).default;
          browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--font-render-hinting=medium']
          });
          diag['browserSource'] = 'puppeteer';
        } catch (puppeteerError) {
          throw new Error(`No se encontró Chrome local en el sistema. Por favor instala Google Chrome o configura PUPPETEER_EXECUTABLE_PATH. Error: ${puppeteerError}`);
        }
      }
    } else {
      // Producción/Serverless: usar Chromium de @sparticuz/chromium
      const chromiumPath = await chromium.executablePath();
      diag['chromiumPath'] = !!chromiumPath;

      if (chromiumPath && fs.existsSync(chromiumPath)) {
        browser = await puppeteerCore.launch({
          headless: true,
          args: [
            ...chromium.args,
            '--disable-dev-shm-usage',
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--font-render-hinting=medium',
          ],
          executablePath: chromiumPath,
        });
        diag['browserSource'] = 'chromium';
      } else {
        // Fallback a Chrome local incluso en serverless
        const localChrome = resolveLocalChromePath();
        if (localChrome) {
          browser = await puppeteerCore.launch({
            headless: true,
            executablePath: localChrome,
            args: ['--no-sandbox', '--font-render-hinting=medium'],
          });
          diag['browserSource'] = 'localChrome-fallback';
        } else {
          throw new Error('No se encontró Chromium ni Chrome local para generar PDF en producción');
        }
      }
    }

    const page = await browser.newPage();
    await page.emulateMediaType('print');
    // Inyectar cookies del request en el contexto del navegador
    // Esto permite que la página de template se renderice autenticada (Supabase/SSR)
    try {
      const originUrl = new URL(origin);
      const cookieHeader = request.headers.get('cookie') || '';
      if (cookieHeader) {
        // Asegurar que la primera navegación lleve las cookies
        await page.setExtraHTTPHeaders({ Cookie: cookieHeader });

        // Además registrar cookies en el navegador para subsiguientes requests
        const rawCookies = cookieHeader
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.includes('='));
        diag['cookieCount'] = rawCookies.length;
        const cookieParams = rawCookies.map((s) => {
          const eq = s.indexOf('=');
          const name = s.slice(0, eq);
          const value = s.slice(eq + 1);
          return {
            name,
            value,
            domain: originUrl.hostname,
            path: '/',
            secure: originUrl.protocol === 'https:',
          } as any;
        });
        if (cookieParams.length > 0) {
          await page.setCookie(...cookieParams);
        }
      }
    } catch {}
    // En Vercel, networkidle0 puede no disparar por conexiones persistentes; usar domcontentloaded + banderas propias
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    diag['navigated'] = true;
    await page.waitForFunction(() => (window as any).__forata057_ready === true, { timeout: 5000 }).catch(() => {});
    await page.waitForFunction(() => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0), { timeout: 10000 }).catch(() => {});
    await new Promise((res) => setTimeout(res, 300));
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    try { diag['pdfBytes'] = (pdf as any)?.byteLength ?? (pdf as any)?.length ?? null; } catch {}

    await page.close();
    await browser.close();
    browser = null;

    const filename = `FOR-ATA-057-${id}.pdf`;
    // Construir respuesta final reutilizando headers que incluyen Set-Cookie que pudo agregar Supabase
    if (debug) {
      const final = NextResponse.json({ ok: true, filename, diag }, { headers: baseResponse.headers });
      final.headers.set('Cache-Control', 'no-store');
      return final;
    } else {
      const final = new NextResponse(pdf as any, { headers: baseResponse.headers });
      final.headers.set('Content-Type', 'application/pdf');
      final.headers.set('Content-Disposition', `attachment; filename="${filename}"`);
      final.headers.set('Cache-Control', 'no-store');
      return final;
    }
  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }

    const errorInfo = {
      message: error?.message || String(error),
      stack: error?.stack,
      serverless: !!(process.env.AWS_REGION || process.env.VERCEL),
      isDev: process.env.NODE_ENV === 'development',
      platform: os.platform(),
    };

    console.error('[PDF Generation Error]', errorInfo);

    // Mensajes de error más específicos
    let userMessage = 'No se pudo generar el PDF';
    if (error?.message?.includes('Chrome') || error?.message?.includes('chromium')) {
      userMessage = 'No se encontró Chrome/Chromium en el sistema';
    } else if (error?.message?.includes('timeout')) {
      userMessage = 'Tiempo de espera excedido al generar el PDF';
    } else if (error?.message?.includes('Inspección no encontrada')) {
      userMessage = 'Inspección no encontrada';
    }

    const payload: any = {
      error: userMessage,
      details: debug ? String(error?.message || error) : undefined,
    };

    if (debug) {
      payload['diag'] = errorInfo;
    }

    return NextResponse.json(payload, { status: 500 });
  }
}
