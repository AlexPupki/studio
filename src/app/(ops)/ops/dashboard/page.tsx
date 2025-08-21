import { db } from "@/lib/server/db";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { bookings } from "@/lib/server/db/schema";

export default async function OpsDashboard() {
  const latestBookings = await db.query.bookings.findMany({
    limit: 10,
    orderBy: [desc(bookings.createdAt)],
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Панель оператора</CardTitle>
          <CardDescription>
            Обзор последних бронирований и действий в системе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-2">
             <Button asChild variant="secondary">
                <Link href="/ops/dashboard">Бронирования</Link>
            </Button>
            <Button variant="outline" asChild>
                <Link href="/ops/logs">Журнал действий</Link>
            </Button>
             <Button variant="outline" asChild>
                <Link href="/ops/catalog">Каталог</Link>
            </Button>
             <Button variant="outline" asChild>
                <Link href="/ops/content">Контент</Link>
            </Button>
          </div>
           <h3 className="text-lg font-semibold mb-2">Последние бронирования</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Дата</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {latestBookings.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={6} className="text-center">Пока нет ни одного бронирования.</TableCell>
                 </TableRow>
             )}
              {latestBookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-mono">{booking.code}</TableCell>
                  <TableCell>
                    <Badge variant={booking.state === 'confirm' ? 'default' : 'secondary'}>
                      {booking.state}
                    </Badge>
                  </TableCell>
                  <TableCell>{booking.customerName}</TableCell>
                  <TableCell>{booking.customerPhoneE164}</TableCell>
                  <TableCell>{booking.qty}</TableCell>
                  <TableCell>
                    {booking.createdAt?.toLocaleDateString('ru-RU')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
