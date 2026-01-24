
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
        const supabase = createClient(cookieStore);
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Construir la URL interna que Puppeteer visitará
        // Nota: En producción, usar process.env.NEXT_PUBLIC_APP_URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // Le pasamos print=true para que el componente sepa que debe esperar imágenes,
        // y pdf=1 para que se renderice en modo "compacto/impresión" sin botones extra.
        const renderUrl = `${baseUrl}/templates/${template}?id=${id}&pdf=1&print=true`;

        console.log(`[PDF API] Generando PDF para: ${renderUrl}`);

        // 3. Generar PDF
        const pdfBuffer = await PuppeteerService.generatePdf(renderUrl);

        // 4. Retornar el PDF como stream
        return new NextResponse(pdfBuffer, {
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
