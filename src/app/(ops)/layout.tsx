
import { getCurrentUser } from '@/lib/server/auth/user.actions';
import { OpsLayout } from './ops-layout';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function ProtectedOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    // This case is primarily handled by middleware, but as a fallback.
    const pathname = headers().get('x-next-pathname') || '/ops';
    redirect('/ops/login?next=' + pathname);
  }

  const canAccessOps = user.roles.some(role => role.startsWith('ops.') || role === 'admin');
  if (!canAccessOps) {
      redirect('/account?error=forbidden');
  }

  return <OpsLayout user={user}>{children}</OpsLayout>;
}
