import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import type { Browser } from 'puppeteer';

export const dynamic = 'force-dynamic';

function getOrigin(req: NextRequest): string {
  const proto = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: 'Falta el id de inspección' }, { status: 400 });
  }

  const origin = getOrigin(request);
  const templateUrl = `${origin}/templates/forata057?id=${encodeURIComponent(id)}&pdf=1`;

  let browser: Browser | null = null;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--font-render-hinting=medium'],
    });
    const page = await browser.newPage();
    // Asegurar fondos y estilos de impresión
    await page.emulateMediaType('print');
    // Cargar la plantilla y esperar a que la red esté inactiva para mejorar carga de recursos
    await page.goto(templateUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    // Esperar señal de readiness emitida por la plantilla una vez cargados los datos
    await page.waitForFunction(() => (window as any).__forata057_ready === true, { timeout: 30000 }).catch(() => {});
    // Esperar que todas las imágenes estén cargadas (firmas y logos)
    await page.waitForFunction(
      () => Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
      { timeout: 10000 }
    ).catch(() => {});
    // Breve margen para layout final
    await new Promise((res) => setTimeout(res, 300));
    // Esperar fuentes si aplica
    await page.evaluate(() => (document as any).fonts?.ready).catch(() => {});

    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });

    await page.close();
    await browser.close();
    browser = null;

    const filename = `FOR-ATA-057-${id}.pdf`;
    return new Response(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error('PDF endpoint error:', error);
    return NextResponse.json(
      { error: 'No se pudo generar el PDF', details: String(error?.message || error) },
      { status: 500 }
    );
  }
}