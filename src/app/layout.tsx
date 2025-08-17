import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { GoogleAnalytics } from '@/components/google-analytics';
import { Inter, Manrope } from 'next/font/google';
import { SidebarProvider } from '@/components/ui/sidebar';
import { MainLayout } from '@/components/main-layout';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Grand Tour Sochi',
  description: 'Эксклюзивные туры и впечатления в Сочи',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased`}>
        <GoogleAnalytics />
        <SidebarProvider>
          <MainLayout>{children}</MainLayout>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
