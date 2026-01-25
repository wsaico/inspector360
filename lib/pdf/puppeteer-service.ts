
import { Browser, Page } from 'puppeteer-core';

export class PuppeteerService {
    private static browser: Browser | null = null;

    /**
     * Genera un PDF a partir de una URL usando Puppeteer
     */
    static async generatePdf(url: string, cookies: any[] = [], initialData: any = null): Promise<Buffer> {
        const isDev = process.env.NODE_ENV === 'development';
        let browser: Browser | null = null;

        try {
            if (isDev) {
                // LOCAL DEVELOPMENT: Use 'puppeteer' (full browser)
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const puppeteer = require('puppeteer');
                browser = await puppeteer.launch({
                    args: [],
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                    headless: true,
                }) as unknown as Browser;
            } else {
                // PRODUCTION (VERCEL): Use 'puppeteer-core' + '@sparticuz/chromium'
                // This keeps the bundle size small and compatible with Serverless
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const chromium = require('@sparticuz/chromium');
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                const puppeteerCore = require('puppeteer-core');

                browser = await puppeteerCore.launch({
                    args: chromium.args,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: await chromium.executablePath(),
                    headless: chromium.headless === 'true' || chromium.headless === true,
                }) as unknown as Browser;
            }

            if (!browser) {
                throw new Error('Failed to launch browser instance');
            }

            const page = await browser.newPage();

            // Set session cookies for authentication
            if (cookies && cookies.length > 0) {
                await page.setCookie(...cookies);
            }

            // Navigate to the template URL
            if (initialData) {
                await page.evaluateOnNewDocument((data) => {
                    (window as any).__PRELOADED_DATA__ = data;
                }, initialData);
            }

            await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

            // Wait for the hydration signal from the template
            await page.waitForFunction('window.__forata057_ready === true', { timeout: 60000 });

            // Generate PDF
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
            console.error('Error generating PDF with Puppeteer:', error);
            throw error;
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
