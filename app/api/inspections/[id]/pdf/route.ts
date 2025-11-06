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
  if (envPath && fs.existsSync(envPath)) return envPath;

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

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
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
    // Validar existencia de la inspección usando cliente de Supabase en servidor (sesión del usuario)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      const payload = { error: 'Supabase no configurado', details: 'Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY' };
      return NextResponse.json(payload, { status: 500 });
    }
    // Preparar respuesta base para que Supabase pueda refrescar cookies de sesión
    const baseResponse = new NextResponse();
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
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
            // NextResponse no tiene remove directo; set con maxAge 0
            baseResponse.cookies.set({ name, value: '', ...options, maxAge: 0 });
          } catch {}
        },
      },
    });

    // Fallback: si el cliente envía Authorization: Bearer <token>, usamos ese token
    // para validar la inspección aunque no haya cookies (caso dominios de preview)
    const authHeader = request.headers.get('authorization') || '';
    const bearerToken = authHeader.toLowerCase().startsWith('bearer ')
      ? authHeader.slice(7).trim()
      : '';
    diag['authHeader'] = !!authHeader;
    diag['bearerProvided'] = !!bearerToken;
    const supabaseWithToken = bearerToken
      ? createSupabaseClient(supabaseUrl, supabaseKey, {
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
      // Si falla por permisos/timeout, devolvemos 500; si no existe, 404
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

    const logoParam = encodeURIComponent(`${origin}/logo.png`);
    const targetUrl = `${origin}/templates/forata057?id=${encodeURIComponent(id)}&pdf=1&print=true&logo=${logoParam}`;
    diag['targetUrl'] = targetUrl;

    const isServerless = !!(process.env.AWS_REGION || process.env.VERCEL);
    diag['serverless'] = isServerless;

    if (isServerless) {
      const executablePath = await chromium.executablePath();
      if (!executablePath) {
        throw new Error('chromium.executablePath() no resolvió ruta en entorno serverless');
      }
      diag['executablePath'] = !!executablePath;
      browser = await puppeteerCore.launch({
        headless: true,
        args: [
          ...chromium.args,
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--font-render-hinting=medium',
        ],
        executablePath,
      });
    } else {
      const localChrome = resolveLocalChromePath();
      diag['localChrome'] = localChrome || null;
      if (localChrome) {
        browser = await puppeteerCore.launch({
          headless: true,
          executablePath: localChrome,
          args: ['--no-sandbox', '--font-render-hinting=medium'],
        });
      } else {
        const puppeteer = (await import('puppeteer')).default;
        browser = await puppeteer.launch({
          headless: true,
          args: ['--no-sandbox', '--font-render-hinting=medium'],
        });
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
    console.error('PDF endpoint error:', {
      message: error?.message || String(error),
      stack: error?.stack,
      serverless: !!(process.env.AWS_REGION || process.env.VERCEL),
    });
    const payload: any = { error: 'No se pudo generar el PDF', details: String(error?.message || error) };
    if (debug) payload['diag'] = { debug: true };
    return NextResponse.json(payload, { status: 500 });
  }
}
