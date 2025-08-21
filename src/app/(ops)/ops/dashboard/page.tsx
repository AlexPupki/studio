
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Маршруты</CardTitle>
                <CardDescription>Управление услугами и маршрутами.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Button asChild>
                    <Link href="/ops/routes">Перейти к маршрутам</Link>
                 </Button>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Бронирования</CardTitle>
                <CardDescription>Просмотр и управление бронированиями.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Button asChild variant="outline">
                    <Link href="/ops/bookings">Перейти к бронированиям</Link>
                 </Button>
              </CardContent>
            </Card>
             <Card>
              <CardHeader>
                <CardTitle>Журнал действий</CardTitle>
                <CardDescription>Просмотр всех событий в системе.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Button asChild variant="outline">
                    <Link href="/ops/logs">Перейти к журналу</Link>
                 </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
