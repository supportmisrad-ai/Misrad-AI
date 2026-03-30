/**
 * Ping Admin Layout — הגנה על מודול Ping (בטא)
 */

import { redirect } from 'next/navigation';
import { hasPingBetaAccess } from '@/lib/ping/guard';

export default async function PingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hasAccess = await hasPingBetaAccess();

  if (!hasAccess) {
    redirect('/app/admin');
  }

  return <>{children}</>;
}
