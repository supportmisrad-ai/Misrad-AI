import { auth } from '@clerk/nextjs/server';
import { isSuperAdminEmail } from '@/lib/constants/roles';
import { redirect } from 'next/navigation';

export default async function BookingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sessionClaims } = await auth();
  const email = (sessionClaims as any)?.email || (sessionClaims as any)?.primary_email;

  if (!isSuperAdminEmail(email)) {
    redirect('/app'); // חסימת גישה למי שאינו סופר-אדמין
  }

  return <>{children}</>;
}
