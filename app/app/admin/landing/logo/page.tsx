import React from 'react';
import { LandingPageLogoPanel } from '@/components/saas/LandingPageLogoPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Image } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLandingLogoPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="לוגו" subtitle="ניהול לוגו דף הנחיתה" icon={Image} />
      <LandingPageLogoPanel hideHeader />
    </div>
  );
}
