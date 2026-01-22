import React from 'react';
import { GlobalBrandingPanel } from '@/components/saas/GlobalBrandingPanel';

export const dynamic = 'force-dynamic';

export default async function AdminLandingBrandingPage() {
  return (
    <div>
      <GlobalBrandingPanel />
    </div>
  );
}
