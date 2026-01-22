import React from 'react';
import { LandingPaymentLinksPanel } from '@/components/saas/LandingPaymentLinksPanel';

export const dynamic = 'force-dynamic';

export default async function AdminLandingPaymentLinksPage() {
  return (
    <div>
      <LandingPaymentLinksPanel />
    </div>
  );
}
