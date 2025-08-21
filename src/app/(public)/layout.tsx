
import { MainLayout } from '@/components/main-layout';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayout>{children}</MainLayout>;
}
