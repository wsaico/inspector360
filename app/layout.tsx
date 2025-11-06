import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { SessionMonitor } from '@/components/session-monitor';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Inspector 360° | Sistema de Inspección Técnica',
  description: 'Sistema de Inspección Técnica de Equipos - FOR-ATA-057',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <SessionMonitor />
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
