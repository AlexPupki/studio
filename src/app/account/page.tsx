'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
  const router = useRouter();

  function handleLogout() {
    // Mock logout logic
    console.log('Logging out...');
    router.push('/login');
  }

  return (
    <div className="p-4">
        <Card>
            <CardHeader>
                <CardTitle>Личный кабинет</CardTitle>
                <CardDescription>Добро пожаловать! Этот раздел доступен после входа.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Здесь будет информация о ваших бронированиях и бонусах.</p>
            </CardContent>
            <CardFooter>
                <Button onClick={handleLogout} variant="outline">Выйти</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
