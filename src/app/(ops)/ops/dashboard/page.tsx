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

export default async function OpsDashboard() {
  const bookings = await db.query.bookings.findMany({
    limit: 50,
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Панель оператора</CardTitle>
          <CardDescription>
            Управление бронированиями и инвойсами.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Клиент</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Кол-во</TableHead>
                <TableHead>Дата</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
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
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Открыть
                    </Button>
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
