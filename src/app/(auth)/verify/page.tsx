// src/app/(auth)/verify/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';


// Схема валидации для формы верификации
const VerifySchema = z.object({
  code: z.string().length(6, { message: 'Код должен состоять из 6 цифр' }),
});

export default function VerifyPage() {
  const [isLoading, setIsLoading] = React.useState(false);
  const searchParams = useSearchParams();
  // TODO: Получать номер телефона из параметров URL
  const phone = searchParams.get('phone') || '+7 (999) ***-**-12';

  const form = useForm<z.infer<typeof VerifySchema>>({
    resolver: zodResolver(VerifySchema),
    defaultValues: {
      code: '',
    },
  });

  // Обработчик отправки формы
  async function onSubmit(values: z.infer<typeof VerifySchema>) {
    setIsLoading(true);
    console.log('Verify form submitted:', values);
    // TODO: Вызвать серверный экшен verifyLoginCodeAction
    
    // Имитация задержки сети
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: 'Успешная авторизация (симуляция)',
      description: 'Вы будете перенаправлены в личный кабинет.',
    });
    
     // TODO: Реализовать редирект на /account после успешной верификации

    setIsLoading(false);
  }

  // TODO: Реализовать логику таймера и повторной отправки кода
  const [cooldown, setCooldown] = React.useState(60);
  const isResendDisabled = cooldown > 0;

  React.useEffect(() => {
    if (isResendDisabled) {
      const timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isResendDisabled]);
  

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Подтверждение номера</CardTitle>
          <CardDescription>
            Мы отправили код на номер {phone}.
            <Link href="/login" className="ml-2 font-medium text-primary hover:underline">
              Изменить
            </Link>
          </CardDescription>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardContent>
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="text"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="000000"
                                    maxLength={6}
                                    className="text-center text-2xl tracking-[0.5em]"
                                />
                            </FormControl>
                            <FormMessage className="text-center pt-2" />
                        </FormItem>
                        )}
                    />
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <Button className="w-full" type="submit" disabled={isLoading}>
                        {isLoading ? 'Проверка...' : 'Подтвердить и войти'}
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                        {isResendDisabled ? (
                            `Отправить код повторно через ${cooldown} сек.`
                        ) : (
                            <Button variant="link" size="sm" onClick={() => console.log('Resend code')} className="p-0 h-auto">
                                Отправить код еще раз
                            </Button>
                        )}
                    </p>
                </CardFooter>
            </form>
        </Form>
      </Card>
    </div>
  );
}
