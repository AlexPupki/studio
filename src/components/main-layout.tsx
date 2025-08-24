
'use client';

import React from 'react';
import Link from 'next/link';
import { BookMarked, Home, LogIn, Mountain, Newspaper, User } from 'lucide-react';
import { Button } from './ui/button';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
     { href: '/routes', label: 'Маршруты', icon: BookMarked },
     { href: '/blog', label: 'Блог', icon: Newspaper },
     { href: '/account', label: 'Кабинет', icon: User },
  ];


  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
           <Link href="/" className="flex items-center gap-2 mr-6">
             <Mountain className="size-6 text-primary" />
             <span className="font-bold font-heading">Grand Tour Sochi</span>
           </Link>
           <nav className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
            {navLinks.map(link => (
                 <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                </Link>
            ))}
           </nav>
           <div className="hidden md:flex flex-1 items-center justify-end gap-2">
            <Button asChild>
                <Link href="/account">
                    <LogIn className="mr-2 h-4 w-4"/>
                    Личный кабинет
                </Link>
            </Button>
           </div>
        </div>
      </header>
       <main className="flex-1 pb-16 md:pb-0">
            {children}
       </main>
       {/* Mobile Bottom Nav */}
       <nav className="md:hidden fixed bottom-0 inset-x-0 bg-background border-t shadow-lg z-50">
            <div className="flex justify-around items-center h-16">
                <Link href="/" className={cn("flex flex-col items-center gap-1 text-xs transition-colors hover:text-primary", pathname === "/" ? "text-primary" : "text-muted-foreground")}>
                    <Home className="h-5 w-5"/>
                    <span>Главная</span>
                </Link>
                {navLinks.map(link => (
                    <Link key={link.href} href={link.href} className={cn("flex flex-col items-center gap-1 text-xs transition-colors hover:text-primary", pathname.startsWith(link.href) ? "text-primary" : "text-muted-foreground")}>
                        <link.icon className="h-5 w-5"/>
                        <span>{link.label}</span>
                    </Link>
                ))}
            </div>
       </nav>
       <footer className="hidden md:block border-t py-6 md:py-8">
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
