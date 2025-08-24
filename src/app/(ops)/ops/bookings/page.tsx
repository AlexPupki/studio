
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
import { desc } from "drizzle-orm";
import { bookings } from "@/lib/server/db/schema";
import { Button } from "@/components/ui/button";

export default async function OpsBookingsPage() {
  const latestBookings = await db.query.bookings.findMany({
    limit: 10,
    orderBy: [desc(bookings.createdAt)],
  });

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Последние бронирования</CardTitle>
          <CardDescription>
            Обзор 10 последних бронирований в системе.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block">
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
                      <TableCell colSpan={6} className="text-center h-24">Пока нет ни одного бронирования.</TableCell>
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
          </div>

          {/* Mobile Card List */}
          <ul className="md:hidden space-y-4">
              {latestBookings.length === 0 && (
                  <li className="text-center text-muted-foreground py-8">Пока нет ни одного бронирования.</li>
              )}
              {latestBookings.map((booking) => (
                <li key={booking.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-sm font-semibold">{booking.code}</span>
                    <Badge variant={booking.state === 'confirm' ? 'default' : 'secondary'}>
                        {booking.state}
                    </Badge>
                  </div>
                  <div className="font-medium">{booking.customerName}</div>
                  <div className="text-sm text-muted-foreground">{booking.customerPhoneE164}</div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Кол-во: {booking.qty}</span>
                    <span className="text-muted-foreground">{booking.createdAt?.toLocaleDateString('ru-RU')}</span>
                  </div>
                </li>
              ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
