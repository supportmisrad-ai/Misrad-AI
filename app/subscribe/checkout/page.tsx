import { auth } from '@clerk/nextjs/server';
import SubscribeCheckoutPageClient from './SubscribeCheckoutPageClient';

export const dynamic = 'force-dynamic';

export default async function SubscribeCheckoutPage() {
  const { userId } = await auth();
  return <SubscribeCheckoutPageClient initialUserId={userId} />;
}
