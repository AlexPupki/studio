import { getCurrentUser } from '@/lib/server/auth/auth.actions';
import { MainLayout } from '@/components/main-layout';
import { redirect } from 'next/navigation';

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  // A simple check. In a real app, this should check for specific roles.
  if (!user) {
    redirect('/login?next=/ops/dashboard');
  }

  return <MainLayout>{children}</MainLayout>;
}
