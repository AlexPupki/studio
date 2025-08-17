// src/app/(auth)/verify/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { requestLoginCodeAction, verifyLoginCodeAction } from '@/lib/iam/auth.actions.server';
import { maskPhone } from '@/lib/iam/phone.utils';

// Схема валидации для формы верификации
const VerifySchema = z.object({
  code: z.string().length(6, { message: 'Код должен состоять из 6 цифр' }),
});

function VerifyPageContent() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // Получаем телефон из параметров URL
  const phoneE164 = searchParams.get('phone');

  // Управляем таймером обратного отсчета для повторной отправки
  const [cooldown, setCooldown] = React.useState(60);
  const isResendDisabled = cooldown > 0;

  React.useEffect(() => {
    // Запускаем таймер, когда компонент монтируется
    const timerId = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId); // Очищаем таймер при размонтировании
  }, []);

  const form = useForm<z.infer<typeof VerifySchema>>({
    resolver: zodResolver(VerifySchema),
    defaultValues: {
      code: '',
    },
  });

  if (!phoneE164) {
    // Если телефона в URL нет, возвращаем пользователя на страницу входа
    React.useEffect(() => {
      router.replace('/login');
    }, [router]);
    return null; 
  }

  // Обработчик отправки формы верификации
  async function onSubmit(values: z.infer<typeof VerifySchema>) {
    setIsLoading(true);
    try {
        // Вызываем серверный экшен для проверки кода
        const result = await verifyLoginCodeAction({ phoneE164, code: values.code });

        if (result.error) {
            // Показываем ошибку
            toast({
                variant: 'destructive',
                title: 'Ошибка',
                description: result.error,
            });
            form.setError('code', { message: result.error });
        } else if (result.data) {
            // При успехе показываем уведомление и перенаправляем
            toast({
                title: 'Успешная авторизация',
                description: 'Вы будете перенаправлены в личный кабинет.',
            });
            // После успешной верификации Next.js автоматически обновит layout,
            // т.к. middleware (который мы создадим позже) увидит сессию и пропустит на /account.
            router.push('/account');
        }
    } catch (err) {
         toast({
            variant: 'destructive',
            title: 'Непредвиденная ошибка',
            description: 'Что-то пошло не так. Попробуйте снова.',
        });
    } finally {
        setIsLoading(false);
    }
  }

  // Обработчик повторной отправки кода
  async function handleResendCode() {
    if (isResendDisabled) return;
    setIsResending(true);
    try {
        const result = await requestLoginCodeAction({ phoneE164 });
        if (result.error) {
             toast({ variant: 'destructive', title: 'Ошибка', description: result.error });
        } else {
            toast({ title: 'Код отправлен повторно'});
            setCooldown(60); // Сбрасываем таймер
        }
    } catch(err) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось отправить код.' });
    } finally {
        setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Подтверждение номера</CardTitle>
          <CardDescription>
            Мы отправили код на номер {maskPhone(phoneE164)}.
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
                            <Button variant="link" size="sm" onClick={handleResendCode} disabled={isResending} className="p-0 h-auto">
                                {isResending ? 'Отправка...' : 'Отправить код еще раз'}
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

// Обертка для работы с Suspense, т.к. useSearchParams его требует
export default function VerifyPage() {
    return (
        <React.Suspense fallback={<div>Загрузка...</div>}>
            <VerifyPageContent />
        </React.Suspense>
    );
}
