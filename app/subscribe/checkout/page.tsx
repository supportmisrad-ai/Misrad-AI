import { auth } from '@clerk/nextjs/server';
import SubscribeCheckoutPageClient from './SubscribeCheckoutPageClient';
import { getSystemFeatureFlags } from '@/lib/server/featureFlags';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SubscribeCheckoutPage() {
  const { userId } = await auth();
  const systemFlags = await getSystemFeatureFlags();
  return <SubscribeCheckoutPageClient initialUserId={userId} initialSystemFlags={systemFlags} />;
}
