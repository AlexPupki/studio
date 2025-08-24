'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import React from 'react';
import { requestLoginCode, verifyLoginCode } from '@/lib/server/auth/user.actions';
import { maskPhone } from '@/lib/shared/phone.utils';
import Link from 'next/link';

const FormSchema = z.object({
  code: z.string().min(6, {
    message: 'Код должен состоять из 6 цифр.',
  }),
});

export function VerifyForm() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone');
  const nextUrl = searchParams.get('next');

  const [resendCooldown, setResendCooldown] = React.useState(60);
  const [isResending, setIsResending] = React.useState(false);

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      code: '',
    },
  });

  const { isSubmitting } = form.formState;

  React.useEffect(() => {
    if (!phone) {
      router.replace('/login');
    }
  }, [phone, router]);

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);


  if (!phone) {
    return null;
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      const result = await requestLoginCode(phone);
      if (result.success) {
        toast({
          title: 'Код отправлен',
          description: 'Новый код подтверждения был отправлен на ваш номер.',
        });
        setResendCooldown(60);
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error,
        });
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Непредвиденная ошибка',
      });
    } finally {
      setIsResending(false);
    }
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    if (!phone) return;
    try {
      const result = await verifyLoginCode({ phoneE164: phone, code: data.code });
      
      if (result.success && result.redirectTo) {
        toast({
          title: 'Успешно',
          description: 'Вы успешно вошли в систему.',
        });
        // Client-side redirect
        router.push(result.redirectTo);
        router.refresh(); 
      } else {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error || 'Произошла ошибка при проверке кода.',
        });
         if (result.error === 'Неверный код или срок действия кода истек.') {
          form.setError('code', { message: ' ' });
        }
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Непредвиденная ошибка',
        description: 'Произошла ошибка при проверке кода.',
      });
    }
  }

  const maskedPhone = maskPhone(phone);

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Подтверждение номера</CardTitle>
        <CardDescription>
          Мы отправили 6-значный код на номер {maskedPhone}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="sr-only">Код подтверждения</FormLabel>
                  <FormControl>
                    <InputOTP maxLength={6} {...field} inputMode="numeric">
                      <InputOTPGroup className="w-full justify-center">
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-center"/>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Подтвердить и войти
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="flex flex-col items-center justify-center space-y-2">
           <div className="text-sm">
              Не получили код?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={handleResendCode}
                disabled={resendCooldown > 0 || isResending}
              >
                {isResending ? 'Отправка...' : (resendCooldown > 0 ? `Повторить через ${resendCooldown}с` : 'Отправить снова')}
              </Button>
            </div>
             <div className="text-sm">
              <Button
                variant="link"
                className="p-0 h-auto font-normal text-muted-foreground"
                onClick={() => router.push(`/login?${searchParams.toString()}`)}
              >
               Изменить номер телефона
              </Button>
            </div>
      </CardFooter>
    </Card>
  );
}
