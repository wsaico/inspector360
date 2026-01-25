
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

        // 3. (NUEVO) Fetch de datos Server-Side para inyección
        // Esto evita que Puppeteer tenga que navegar y hacer fetch (que falla por auth/cookies)

        // A. Obtener inspección con equipos (Explicit Select)
        const { data: inspection, error: inspError } = await supabase
            .from('inspections')
            .select(`
                *,
                equipment (
                    id,
                    code,
                    type,
                    checklist_data,
                    inspector_signature_url,
                    updated_at,
                    created_at,
                    hour
                )
            `)
            .eq('id', id)
            .single();

        if (inspError || !inspection) {
            console.error('Error fetching inspection server-side:', inspError);
            return new NextResponse('Error fetching inspection data', { status: 404 });
        }

        // Debug Log
        if (inspection.equipment && inspection.equipment.length > 0) {
            const firstEq = inspection.equipment[0];
            const cData = firstEq.checklist_data;
            console.log(`[PDF DEBUG] Eq ${firstEq.code} Data Type:`, typeof cData);
            if (cData && typeof cData === 'object') {
                console.log(`[PDF DEBUG] Eq ${firstEq.code} Keys:`, Object.keys(cData));
            }
        }

        if (inspError || !inspection) {
            console.error('Error fetching inspection server-side:', inspError);
            return new NextResponse('Error fetching inspection data', { status: 404 });
        }

        // B. Obtener observaciones
        const { data: observations, error: obsError } = await supabase
            .from('observations')
            .select('*')
            .eq('inspection_id', id);

        // C. Construir objeto de datos completo
        const initialData = {
            ...inspection,
            observations: observations || [],
            // Asegurarnos que equipment sea un array (supabase puede devolverlo nulo si join falla, aunque con inner join no debería)
            equipment: inspection.equipment || []
        };

        // 4. Construir URL
        // 4. Construir URL basada estrictamente en el Host del request (para coincidir con cookies)
        const baseUrl = `${protocol}://${host}`;

        const renderUrl = `${baseUrl}/templates/${template}?id=${id}&pdf=1&print=true`;

        console.log(`[PDF API] Generando PDF con Server-Side Injection para: ${id}`);

        // 5. Generar PDF pasando cookies e initialData
        const pdfBuffer = await PuppeteerService.generatePdf(renderUrl, puppeteerCookies, initialData);

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
