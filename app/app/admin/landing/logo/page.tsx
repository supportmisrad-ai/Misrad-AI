import React from 'react';
import { LandingPageLogoPanel } from '@/components/saas/LandingPageLogoPanel';

export const dynamic = 'force-dynamic';

export default async function AdminLandingLogoPage() {
  return (
    <div>
      <LandingPageLogoPanel />
    </div>
  );
}
