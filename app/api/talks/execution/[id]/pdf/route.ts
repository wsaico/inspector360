
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

        // 1. Validar autenticación
        const cookieStore = await cookies();
        const supabase = await createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // 2. Extraer cookies para pasar a Puppeteer
        const allCookies = cookieStore.getAll();
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const domain = host.split(':')[0];

        const puppeteerCookies = allCookies.map((c: any) => ({
            name: c.name,
            value: c.value,
            domain: domain,
            path: '/',
        }));

        // 3. Fetch de datos completos para inyección
        const { data: execution, error: execError } = await supabase
            .from('talk_executions')
            .select(`
                *,
                schedule:talk_schedules (
                    *,
                    bulletin:bulletins (*)
                ),
                bulletin:bulletins (*),
                presenter:employees (*),
                attendees:talk_attendees (
                    *,
                    employee:employees (*)
                )
            `)
            .eq('id', id)
            .single();

        if (execError || !execution) {
            return new NextResponse('Error fetching talk execution data', { status: 404 });
        }

        // Get station info
        const { data: station } = await supabase
            .from('stations')
            .select('*')
            .eq('code', execution.station_code)
            .single();

        const initialData = { ...execution, station_info: station };

        // 4. Construir URL
        const baseUrl = `${protocol}://${host}`;
        const renderUrl = `${baseUrl}/templates/safety-talk?id=${id}&pdf=1&print=true`;

        console.log(`[SafetyTalk PDF] Generando para ejecución: ${id}`);

        // 5. Generar PDF (false = Portrait orientation)
        const pdfBuffer = await PuppeteerService.generatePdf(renderUrl, puppeteerCookies, initialData, false);

        // 6. Preparar nombre de archivo
        // Formato: ESTACION_CODIGO_NOMBRE DE LA CHARLA_FECHA
        const stationCode = station?.code || execution.station_code || 'TALMA';
        const bulletin = execution.schedule?.bulletin || execution.bulletin;
        // El usuario pide explícitamente: ESTACION_TITULO_FECHA (sin código)
        const bulletinTitle = bulletin?.title?.substring(0, 50) || 'Charla-Seguridad';
        const executionDate = execution.executed_at ? execution.executed_at.split('T')[0] : new Date().toISOString().split('T')[0];

        // Limpiar nombre para evitar caracteres inválidos
        const sanitize = (str: string) => str.replace(/[/\\?%*:|"<>]/g, '-').trim();
        const safeFilename = sanitize(`${stationCode}_${bulletinTitle}_${executionDate}`);

        // 7. Retornar el PDF
        return new NextResponse(pdfBuffer as any, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${safeFilename}.pdf"`,
            },
        });

    } catch (error: any) {
        console.error('Error en API SafetyTalk PDF:', error);
        return new NextResponse(error.message || 'Error interno generador PDF', { status: 500 });
    }
}
