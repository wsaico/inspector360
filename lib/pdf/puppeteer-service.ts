
import puppeteer, { Browser, Page } from 'puppeteer';
import chromium from '@sparticuz/chromium';

export class PuppeteerService {
    private static browser: Browser | null = null;

    /**
     * Genera un PDF a partir de una URL usando Puppeteer
     */
    static async generatePdf(url: string, cookies: any[] = []): Promise<Buffer> {
        const isDev = process.env.NODE_ENV === 'development';

        // Configuración para entorno local vs producción (Vercel/Serverless)
        const options = isDev
            ? {
                args: [],
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined, // Usa el cromo local instalado por puppeteer
                headless: true,
            }
            : {
                args: chromium.args,
                defaultViewport: (chromium as any).defaultViewport,
                executablePath: await chromium.executablePath(),
                headless: (chromium as any).headless === 'true' || (chromium as any).headless === true, // handle potential string/boolean inconsistency
                ignoreHTTPSErrors: true,
            };

        try {
            this.browser = await puppeteer.launch(options as any);
            const page = await this.browser.newPage();

            // Configurar cookies de sesión si se proporcionan
            if (cookies && cookies.length > 0) {
                await page.setCookie(...cookies);
            }

            // Navegar a la URL
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

            // Esperar a que window.__forata057_ready sea true (señal de que React terminó de cargar datos)
            await page.waitForFunction('window.__forata057_ready === true', { timeout: 30000 });

            // Opción A: Imprimir PDF con formato A4 horizontal
            const pdf = await page.pdf({
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '0mm',
                    right: '0mm',
                    bottom: '0mm',
                    left: '0mm',
                },
            });

            return Buffer.from(pdf);

        } catch (error) {
            console.error('Error generando PDF con Puppeteer:', error);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
        }
    }
}
