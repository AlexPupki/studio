// src/app/(auth)/login/page.tsx
// Страница для запроса кода аутентификации по номеру телефона.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Вход или регистрация</CardTitle>
          <CardDescription>Введите ваш номер телефона, чтобы получить код</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {/* Поле для ввода номера телефона */}
            <div className="space-y-2">
              <Label htmlFor="phone">Номер телефона</Label>
              <Input id="phone" type="tel" placeholder="+7 (999) 000-00-00" required />
            </div>
            
            {/* Чекбокс согласия с политикой */}
            <div className="flex items-center space-x-2">
              <Checkbox id="terms" required />
              <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground">
                Я согласен с <Link href="/privacy" className="underline hover:text-primary">Политикой конфиденциальности</Link> и <Link href="/terms" className="underline hover:text-primary">Пользовательским соглашением</Link>.
              </Label>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {/* Основная кнопка действия */}
          <Button className="w-full" type="submit">
            Получить код
          </Button>
          
          {/* Ссылка для помощи */}
          <p className="text-center text-sm text-muted-foreground">
            Проблемы со входом? <Link href="/support" className="underline hover:text-primary">Нужна помощь?</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}