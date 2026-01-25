
import { NextRequest, NextResponse } from 'next/server';
import { PuppeteerService } from '@/lib/pdf/puppeteer-service';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const searchParams = req.nextUrl.searchParams;
        const template = searchParams.get('template') || 'forata057';

        // 1. Validar autenticación
        const cookieStore = await cookies();
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Extraer cookies para pasar a Puppeteer
        // 2. Extraer cookies para pasar a Puppeteer
        // Fix: cookies() returns a Promise<ReadonlyRequestCookies> in modern Next.js
        const allCookies = cookieStore.getAll();

        // Determinar dominio para cookies
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = host.split(':')[0]; // Remove port if present

        const puppeteerCookies = allCookies.map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: domain,
            path: '/',
        }));

        // 3. Construir la URL interna que Puppeteer visitará
        // Prioridad: NEXT_PUBLIC_APP_URL > VERCEL_URL > Request Host > Localhost
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

        if (!baseUrl) {
            if (process.env.VERCEL_URL) {
                baseUrl = `https://${process.env.VERCEL_URL}`;
            } else {
                baseUrl = `${protocol}://${host}`;
            }
        }

        // Le pasamos print=true para que el componente sepa que debe esperar imágenes,
        // y pdf=1 para que se renderice en modo "compacto/impresión" sin botones extra.
        const renderUrl = `${baseUrl}/templates/${template}?id=${id}&pdf=1&print=true`;

        console.log(`[PDF API] Generando PDF para: ${renderUrl}`);

        // 4. Generar PDF pasando cookies
        const pdfBuffer = await PuppeteerService.generatePdf(renderUrl, puppeteerCookies);

        // 5. Retornar el PDF como stream
        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${template}-${id}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error en API PDF:', error);
        return new NextResponse(error.message || 'Error interno generador PDF', { status: 500 });
    }
}
