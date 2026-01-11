import { auth } from "@clerk/nextjs/server";
import CheckoutPageClient from './CheckoutPageClient';

// Force dynamic rendering to prevent build-time Clerk errors and handle auth server-side
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Use server-side auth to check session state
  const { userId } = await auth();
  
  return (
    <CheckoutPageClient initialUserId={userId} />
  );
}
