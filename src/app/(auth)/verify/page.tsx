'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const router = useRouter();

  function handleVerify() {
    // Mock verify logic
    console.log('Attempting to verify code...');
    // Redirect to account page after fake verification
    router.push('/account');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Подтверждение номера</CardTitle>
          <CardDescription>
            Введите код, который мы вам отправили (любые 6 цифр).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Код подтверждения</Label>
            <Input id="code" type="text" placeholder="000000" />
          </div>
          <Button className="w-full" onClick={handleVerify}>
            Подтвердить и войти
          </Button>
          <div className="text-center">
             <Button variant="link" asChild>
                <Link href="/login">Изменить номер</Link>
             </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
