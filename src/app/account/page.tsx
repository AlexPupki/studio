import { redirect } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  getCurrentUser,
  logout,
} from '@/lib/server/auth/auth.actions';
import { Button } from '@/components/ui/button';

export default async function AccountPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Личный кабинет</CardTitle>
          <CardDescription>
            Здесь вы можете управлять своим аккаунтом.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium">Ваш номер телефона:</h3>
            <p className="text-muted-foreground">{user.phoneE164}</p>
          </div>
          <div>
            <h3 className="font-medium">Дата регистрации:</h3>
            <p className="text-muted-foreground">
              {new Date(user.createdAt).toLocaleDateString('ru-RU')}
            </p>
          </div>

          <form action={logout}>
            <Button variant="outline" type="submit">
              Выйти
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
