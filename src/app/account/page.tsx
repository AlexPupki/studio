import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getCurrentUser,
  logout,
} from '@/lib/server/auth/auth.actions';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/server/db';
import { bookings } from '@/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }
  
  // For now, get the name from the latest booking.
  // In a real app, user profile should be a separate entity.
  const latestBooking = await db.query.bookings.findFirst({
    where: eq(bookings.customerPhoneE164, user.phoneE164),
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
  });

  const userBookings = await db.query.bookings.findMany({
    where: eq(bookings.customerPhoneE164, user.phoneE164),
    limit: 10,
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
  });

  const userName = latestBooking?.customerName || 'Клиент';
  const membershipLevel = 'Standard'; // Placeholder

  return (
    <div className="p-4 md:p-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Личный кабинет</CardTitle>
          <CardDescription>
            Добро пожаловать, {userName}! Здесь вы можете управлять своим аккаунтом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Ваш номер телефона:</h3>
              <p className="text-muted-foreground">{user.phoneE164}</p>
            </div>
             <div>
              <h3 className="font-medium">Уровень членства:</h3>
              <p className="text-muted-foreground">{membershipLevel}</p>
            </div>
            <div>
              <h3 className="font-medium">Дата регистрации:</h3>
              <p className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
            <form action={logout}>
              <Button variant="outline" type="submit">
                Выйти
              </Button>
            </form>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle>История бронирований</CardTitle>
            <CardDescription>Ваши последние 10 бронирований.</CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Код</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead>Дата</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {userBookings.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center">У вас еще нет бронирований.</TableCell>
                    </TableRow>
                  )}
                  {userBookings.map((booking) => (
                    <TableRow key={booking.id}>
                        <TableCell className="font-mono">{booking.code}</TableCell>
                         <TableCell>
                            <Badge variant={booking.state === 'confirm' ? 'default' : 'secondary'}>
                              {booking.state}
                            </Badge>
                         </TableCell>
                        <TableCell>{booking.qty}</TableCell>
                        <TableCell>{booking.createdAt?.toLocaleDateString('ru-RU')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
            </Table>
        </CardContent>
         <CardFooter>
            <Button asChild variant="secondary">
                <Link href="/account/bookings">Смотреть все</Link>
            </Button>
         </CardFooter>
      </Card>
    </div>
  );
}
