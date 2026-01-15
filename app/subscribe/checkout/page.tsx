import { auth } from '@clerk/nextjs/server';
import SubscribeCheckoutPageClient from './SubscribeCheckoutPageClient';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';

export const dynamic = 'force-dynamic';

export default async function SubscribeCheckoutPage() {
  const { userId } = await auth();
  const systemFlags = await getSystemFeatureFlags();
  return <SubscribeCheckoutPageClient initialUserId={userId} initialSystemFlags={systemFlags} />;
}
