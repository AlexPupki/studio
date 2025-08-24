
'use server';

export const runtime = 'nodejs';

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
} from '@/lib/server/auth/user.actions';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/server/db';
import { bookings } from '@/lib/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MainLayout } from '@/components/main-layout';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?next=/account');
  }
  
  const latestBooking = await db.query.bookings.findFirst({
    where: eq(bookings.customerPhoneE164, user.phoneE164),
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
  });

  const userBookings = await db.query.bookings.findMany({
    where: eq(bookings.customerPhoneE164, user.phoneE164),
    limit: 5,
    orderBy: (bookings, { desc }) => [desc(bookings.createdAt)],
  });

  const userName = latestBooking?.customerName || 'Клиент';
  const membershipLevel = 'Standard'; // Placeholder

  return (
    <MainLayout>
        <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-10">
        <div className="space-y-2">
            <h1 className="text-4xl font-bold font-heading tracking-tight">Личный кабинет</h1>
            <p className="text-lg text-muted-foreground">Добро пожаловать, {userName}! Здесь вы можете управлять своим аккаунтом и бронированиями.</p>
        </div>
        
        <Card className="shadow-lg">
            <CardHeader>
            <CardTitle className="font-heading text-2xl">Ваш профиль</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                    <h3 className="font-medium text-sm text-muted-foreground">Номер телефона</h3>
                    <p className="text-lg">{user.phoneE164}</p>
                </div>
                <div className="space-y-1">
                    <h3 className="font-medium text-sm text-muted-foreground">Уровень членства</h3>
                    <p className="text-lg">{membershipLevel}</p>
                </div>
                <div className="space-y-1">
                    <h3 className="font-medium text-sm text-muted-foreground">Дата регистрации</h3>
                    <p className="text-lg">
                        {new Date(user.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                </div>
            </div>
            </CardContent>
            <CardFooter>
                 <form action={logout}>
                    <Button variant="outline" type="submit">
                        Выйти из аккаунта
                    </Button>
                </form>
            </CardFooter>
        </Card>

        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="font-heading text-2xl">Последние бронирования</CardTitle>
                <CardDescription>Ниже показаны ваши последние 5 бронирований.</CardDescription>
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
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">У вас еще нет бронирований.</TableCell>
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
        </Card>
        </div>
    </MainLayout>
  );
}
