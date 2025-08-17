import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";


export default function Home() {
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Добро пожаловать в Grand Tour Sochi</CardTitle>
          <CardDescription>Проект успешно настроен и готов к работе.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Это стартовая страница вашего приложения. Вы можете начать разработку с аутентификации.</p>
          <Button asChild>
            <Link href="/login">Перейти ко входу</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
