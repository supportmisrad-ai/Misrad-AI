import { auth } from '@clerk/nextjs/server';
import { isSuperAdminEmail } from '@/lib/constants/roles';
import { redirect } from 'next/navigation';

export default async function BookingAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/login');
  }

  // Get the user from our database to check email
  const { prisma } = await import('@/lib/prisma');
  const user = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: userId },
    select: { email: true }
  });

  if (!user || !isSuperAdminEmail(user.email)) {
    redirect('/app'); // חסימת גישה למי שאינו סופר-אדמין
  }

  return <>{children}</>;
}
