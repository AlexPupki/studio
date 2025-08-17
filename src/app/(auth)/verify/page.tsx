// src/app/(auth)/verify/page.tsx
// Страница для ввода кода подтверждения, полученного по SMS.

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function VerifyPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Подтверждение номера</CardTitle>
          {/* TODO: Динамически подставлять замаскированный номер телефона */}
          <CardDescription>
            Мы отправили код на номер +7 (999) ***-**-12. 
            <Link href="/login" className="ml-2 font-medium text-primary hover:underline">Изменить</Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4">
            {/* Поле для ввода кода */}
            <div className="space-y-2">
              <Input 
                id="code" 
                type="text" 
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                maxLength={6}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
            {/* Основная кнопка действия */}
            <Button className="w-full" type="submit">
                Подтвердить и войти
            </Button>
            
            {/* Таймер и кнопка повторной отправки кода */}
            <p className="text-center text-sm text-muted-foreground">
                {/* TODO: Реализовать логику таймера */}
                Отправить код повторно через 60 сек.
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}