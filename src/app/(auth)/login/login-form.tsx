'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { requestLoginCode } from '@/lib/server/auth/user.actions';

const PhoneSchema = z
  .string()
  .min(10, 'Номер телефона должен состоять минимум из 10 цифр')
  .regex(
    /^\+?[78]?\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/,
    'Неверный формат номера телефона'
  );

const FormSchema = z.object({
  phone: PhoneSchema,
  agreement: z.literal<boolean>(true, {
    errorMap: () => ({
      message: 'Вы должны принять условия, чтобы продолжить',
    }),
  }),
});

export function LoginForm() {
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      phone: '',
      agreement: false,
    },
  });

  const { isSubmitting } = form.formState;

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const result = await requestLoginCode(data.phone);

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Ошибка',
          description: result.error,
        });
        return;
      }

      const params = new URLSearchParams({
        phone: result.phoneE164,
      });
      router.push(`/verify?${params.toString()}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Непредвиденная ошибка',
        description:
          'Произошла ошибка при отправке кода. Пожалуйста, попробуйте еще раз.',
      });
    }
  }

  return (
    <Card className="w-full max-w-md shadow-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Вход или регистрация</CardTitle>
        <CardDescription>
          Введите ваш номер телефона для получения одноразового кода
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Номер телефона</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+7 (999) 123-45-67"
                      {...field}
                      type="tel"
                      autoComplete="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="agreement"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Я согласен с{' '}
                      <Link href="#" className="underline hover:text-primary">
                        условиями использования
                      </Link>
                    </FormLabel>
                    <FormDescription>
                      И даю согласие на обработку персональных данных.
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Получить код
            </Button>
          </form>
        </Form>
      </CardContent>
       <CardFooter className="text-xs text-center text-muted-foreground">
        <p>Мы никогда не передадим ваши данные третьим лицам.</p>
      </CardFooter>
    </Card>
  );
}
