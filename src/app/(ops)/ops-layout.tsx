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
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Mountain, LogOut, LayoutDashboard, Route, FileText, ScrollText, User, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { User as UserType } from '@/lib/shared/iam.contracts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { logout } from '@/lib/server/auth/user.actions';
import { cn } from '@/lib/utils';

export function OpsLayout({ children, user }: { children: React.ReactNode, user: UserType }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/ops/login');
  }

  const navItems = [
    { href: '/ops/dashboard', label: 'Обзор', icon: LayoutDashboard, exact: true },
    { href: '/ops/bookings', label: 'Бронирования', icon: FileText },
    { href: '/ops/routes', label: 'Каталог', icon: Route },
    { href: '/ops/content', label: 'Контент', icon: ScrollText },
    { href: '/ops/logs', label: 'Журнал', icon: Settings },
  ];

  return (
     <SidebarProvider>
    <div className="min-h-screen">
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
             <Mountain className="size-6 text-primary" />
             <span className="font-heading text-xl font-bold">GTS Ops</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map(item => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={item.exact ? pathname === item.href : pathname.startsWith(item.href)}>
                        <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
            <div className='flex items-center gap-2'>
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{user.phoneE164.slice(-2)}</AvatarFallback>
                </Avatar>
                <div className='flex flex-col'>
                    <span className="text-sm font-medium">{user.roles[0] || 'Оператор'}</span>
                    <span className="text-xs text-muted-foreground">{user.phoneE164}</span>
                </div>
            </div>
             <form action={handleLogout}>
                <Button variant="ghost" size="icon" type="submit">
                    <LogOut className="h-4 w-4"/>
                </Button>
            </form>
        </SidebarFooter>
      </Sidebar>
      <main className={cn(
        "flex flex-col flex-1",
        "md:ml-[var(--sidebar-width)] group-data-[collapsible=icon]/sidebar-wrapper:md:ml-[var(--sidebar-width-icon)]"
       )}>
        <header className="flex h-14 items-center justify-between border-b bg-card p-4">
            <div className="md:hidden">
                 <SidebarTrigger />
            </div>
            <div className='flex items-center gap-4 ml-auto'>
                <Button variant="outline" asChild>
                    <Link href="/">
                        Вернуться на сайт
                    </Link>
                </Button>
            </div>
        </header>
        <div className="flex-1 overflow-auto bg-muted/40">
            {children}
        </div>
       </main>
    </div>
    </SidebarProvider>
  );
}
