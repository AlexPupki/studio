// src/app/account/page.tsx
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { logoutAction } from '@/lib/iam/auth.actions.server';
import { redirect } from 'next/navigation';

export default function AccountPage() {
  
  // Серверный экшен для выхода из системы, обернутый в form
  // для соответствия лучшим практикам React.
  async function handleLogout() {
    'use server';
    await logoutAction();
    redirect('/login');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Личный кабинет</CardTitle>
        <CardDescription>Добро пожаловать! Здесь будет информация о ваших бронированиях и бонусах.</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Здесь будет контент личного кабинета */}
        <p>Раздел находится в разработке.</p>
      </CardContent>
      <CardFooter>
         <form action={handleLogout}>
            <Button type="submit" variant="outline">Выйти</Button>
         </form>
      </CardFooter>
    </Card>
  );
}
