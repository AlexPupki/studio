
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Авторизация | Grand Tour Sochi',
  description: 'Вход или регистрация в личном кабинете',
};

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The logic to redirect authenticated users is now handled in middleware.ts
  // to avoid running into Next.js static rendering issues with cookies().
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      {children}
    </div>
  );
}
