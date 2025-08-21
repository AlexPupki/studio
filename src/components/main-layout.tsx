
'use client';

import React from 'react';
import Link from 'next/link';
import { Mountain, LogIn } from 'lucide-react';
import { Button } from './ui/button';

export function MainLayout({ children }: { children: React.ReactNode }) {

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
           <Link href="/" className="flex items-center gap-2 mr-6">
             <Mountain className="size-6 text-primary" />
             <span className="font-bold font-heading">Grand Tour Sochi</span>
           </Link>
           <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/routes" className="transition-colors hover:text-foreground">
                Маршруты
            </Link>
             <Link href="/blog" className="transition-colors hover:text-foreground">
                Блог
            </Link>
             <Link href="/about" className="transition-colors hover:text-foreground">
                О нас
            </Link>
           </nav>
           <div className="flex flex-1 items-center justify-end gap-2">
            <Button asChild>
                <Link href="/account">
                    <LogIn className="mr-2 h-4 w-4"/>
                    Личный кабинет
                </Link>
            </Button>
           </div>
        </div>
      </header>
       <main className="flex-1">
            {children}
       </main>
       <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Grand Tour Sochi. Все права защищены.
          </p>
          <nav className="flex gap-4">
             <Link href="/privacy" className="text-sm text-muted-foreground hover:underline">
                Политика конфиденциальности
             </Link>
             <Link href="/terms" className="text-sm text-muted-foreground hover:underline">
                Условия использования
             </Link>
          </nav>
        </div>
       </footer>
    </div>
  );
}
