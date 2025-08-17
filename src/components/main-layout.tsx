
'use client';

import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Newspaper, Mountain, User, LogIn, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Mountain className="size-6 text-primary" />
             <h1 className="font-heading text-xl font-bold">Grand Tour</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === '/'}>
                <Link href="/">
                  <Home />
                  <span>Главная</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card p-4">
            <div className="md:hidden">
                 <SidebarTrigger />
            </div>
            <div className='flex items-center gap-4'>
            </div>
        </header>
        <main className="flex flex-1 flex-col p-4">
            {children}
        </main>
      </SidebarInset>
    </div>
  );
}
