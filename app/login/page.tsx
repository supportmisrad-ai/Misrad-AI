import { auth } from "@clerk/nextjs/server";
import { cookies } from 'next/headers';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import LoginPageClient from './LoginPageClient';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  // Use server-side auth to check session state
  const { userId } = await auth();

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const planRaw = resolvedSearchParams ? resolvedSearchParams['plan'] : undefined;
  const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
  const planKey = String(plan || '').trim();
  if (planKey && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, planKey)) {
    const jar = await cookies();
    jar.set('pending_plan', planKey, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60,
    });
  }
  
  return (
    <LoginPageClient initialUserId={userId} />
  );
}
