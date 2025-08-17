'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  function handleLogin() {
    // Mock login logic
    console.log('Attempting to log in...');
    // Redirect to verify page after fake request
    router.push('/verify');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Вход или регистрация</CardTitle>
          <CardDescription>
            Введите ваш номер телефона для входа (симуляция)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Номер телефона</Label>
            <Input id="phone" type="tel" placeholder="+7 (999) 000-00-00" />
          </div>
          <Button className="w-full" onClick={handleLogin}>
            Получить код
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
