// src/app/(auth)/login/page.tsx
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';

// Схема валидации для формы входа
const LoginSchema = z.object({
  phone: z.string().min(10, { message: 'Номер телефона должен содержать минимум 10 цифр' }),
  terms: z.boolean().refine((val) => val === true, {
    message: 'Вы должны согласиться с условиями',
  }),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      phone: '',
      terms: false,
    },
  });

  // Обработчик отправки формы
  async function onSubmit(values: z.infer<typeof LoginSchema>) {
    setIsLoading(true);
    console.log('Login form submitted:', values);
    // TODO: Вызвать серверный экшен requestLoginCodeAction
    
    // Имитация задержки сети
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast({
      title: 'Код отправлен (симуляция)',
      description: `На номер ${values.phone} отправлен код подтверждения.`,
    });
    
    // TODO: Реализовать редирект на /verify с передачей номера телефона
    
    setIsLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Вход или регистрация</CardTitle>
          <CardDescription>Введите ваш номер телефона, чтобы получить код</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {/* Поле для ввода номера телефона */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер телефона</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+7 (999) 000-00-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Чекбокс согласия с политикой */}
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal text-muted-foreground">
                        Я согласен с{' '}
                        <Link href="/privacy" className="underline hover:text-primary">
                          Политикой конфиденциальности
                        </Link>{' '}
                        и{' '}
                        <Link href="/terms" className="underline hover:text-primary">
                          Пользовательским соглашением
                        </Link>
                        .
                      </FormLabel>
                       <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              {/* Основная кнопка действия */}
              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Получить код'}
              </Button>
              
              {/* Ссылка для помощи */}
              <p className="text-center text-sm text-muted-foreground">
                Проблемы со входом?{' '}
                <Link href="/support" className="underline hover:text-primary">
                  Нужна помощь?
                </Link>
              </p>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
