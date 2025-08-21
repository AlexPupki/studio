
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function OpsDashboard() {
  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Панель оператора</CardTitle>
          <CardDescription>
            Обзор и управление системой.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button variant="secondary" asChild>
              <Link href="/ops/bookings">Бронирования</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ops/logs">Журнал действий</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ops/routes">Каталог</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/ops/content">Контент</Link>
            </Button>
          </div>
          <div className="border rounded-lg p-8 text-center text-muted-foreground">
            <p>Раздел управления бронированиями.</p>
             <p className="text-sm">Для навигации используйте меню выше.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    