
import { Browser, Page } from 'puppeteer-core';

export class PuppeteerService {
    private static browser: Browser | null = null;

    /**
     * Genera un PDF a partir de una URL usando Puppeteer
     */
    static async generatePdf(url: string, cookies: any[] = []): Promise<Buffer> {
        console.warn('PDF Generation is temporarily disabled.');
        // Retornar un buffer vacío o error controlado para permitir el build
        throw new Error("PDF generation is temporarily disabled for system updates. Please try again later.");

        /* 
        // Disabled for deployment fix
        const isDev = process.env.NODE_ENV === 'development';
        let browser: Browser | null = null;
        try {
            // ... implementation ...
        } catch (error) {
           console.error('Error', error);
           throw error;
        }
        */
    }
}
