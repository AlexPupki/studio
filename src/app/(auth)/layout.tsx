import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/server/auth/auth.actions';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Авторизация | Grand Tour Sochi',
  description: 'Вход или регистрация в личном кабинете',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect('/account');
  }

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      {children}
    </div>
  );
}
