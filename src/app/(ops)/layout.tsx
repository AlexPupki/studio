
import { getCurrentUser } from '@/lib/server/auth/auth.actions';
import { OpsLayout } from './ops-layout';
import { redirect } from 'next/navigation';

export default async function ProtectedOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login?next=/ops/dashboard');
  }

  // More granular role checks can be done here or in middleware
  const canAccessOps = user.roles.some(role => role.startsWith('ops.'));
  if (!canAccessOps) {
      redirect('/account?error=forbidden');
  }


  return <OpsLayout user={user}>{children}</OpsLayout>;
}
