import { auth } from "@clerk/nextjs/server";
import { cookies } from 'next/headers';
import { BILLING_PACKAGES } from '@/lib/billing/pricing';
import LoginPageClient from './LoginPageClient';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

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
  const validPlan = (planKey && Object.prototype.hasOwnProperty.call(BILLING_PACKAGES, planKey)) ? planKey : null;

  const seatsRaw = resolvedSearchParams ? resolvedSearchParams['seats'] : undefined;
  const seatsStr = String(Array.isArray(seatsRaw) ? seatsRaw[0] : seatsRaw || '').trim();
  const validSeats = (seatsStr && Number.isFinite(Number(seatsStr)) && Number(seatsStr) > 0) ? seatsStr : null;

  const moduleRaw = resolvedSearchParams ? resolvedSearchParams['module'] : undefined;
  const validModule = String(Array.isArray(moduleRaw) ? moduleRaw[0] : moduleRaw || '').trim() || null;

  // Best-effort: persist plan info to cookies for the onboarding flow.
  // cookies().set() can throw in Server Components on some Next.js versions — never crash the page.
  if (validPlan) {
    try {
      const jar = await cookies();
      jar.set('pending_plan', validPlan, { path: '/', sameSite: 'lax', maxAge: 60 * 60 });
      if (validSeats) {
        jar.set('pending_seats', validSeats, { path: '/', sameSite: 'lax', maxAge: 60 * 60 });
      }
      if (validModule) {
        jar.set('pending_module', validModule, { path: '/', sameSite: 'lax', maxAge: 60 * 60 });
      }
    } catch {
      // cookies().set() is not supported in all Server Component contexts — ignore
    }
  }
  
  return (
    <LoginPageClient
      initialUserId={userId}
      pendingPlan={validPlan}
      pendingSeats={validSeats}
      pendingModule={validModule}
    />
  );
}
