import React from 'react';
import { LandingPageVideosPanel } from '@/components/saas/LandingPageVideosPanel';

export const dynamic = 'force-dynamic';

export default async function AdminLandingVideosPage() {
  return (
    <div>
      <LandingPageVideosPanel />
    </div>
  );
}
