
import type { Metadata } from 'next';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const fontInter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
});

const fontManrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Grand Tour Sochi',
  description: 'Эксклюзивные туры в Сочи',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontInter.variable,
          fontManrope.variable
        )}
      >
        {children}
      </body>
    </html>
  );
}
