import React from 'react';
import { LandingPageVideosPanel } from '@/components/saas/LandingPageVideosPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Video } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLandingVideosPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="וידאו" subtitle="ניהול סרטוני לקוחות בדף הנחיתה" icon={Video} />
      <LandingPageVideosPanel hideHeader />
    </div>
  );
}
