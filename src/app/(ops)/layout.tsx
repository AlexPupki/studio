
import { getCurrentUser } from '@/lib/server/auth/user.actions';
import { OpsLayout } from './ops-layout';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function ProtectedOpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Do not render the main OPS layout for the login page itself
  const pathname = headers().get('x-next-pathname');
  if (pathname === '/ops/login') {
    return <>{children}</>;
  }

  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/ops/login?next=' + pathname);
  }

  const canAccessOps = user.roles.some(role => role.startsWith('ops.'));
  if (!canAccessOps) {
      redirect('/account?error=forbidden');
  }

  return <OpsLayout user={user}>{children}</OpsLayout>;
}
