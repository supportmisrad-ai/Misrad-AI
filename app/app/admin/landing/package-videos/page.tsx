import React from 'react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Video } from 'lucide-react';
import { LandingPackageVideosPanel } from '@/components/saas/LandingPackageVideosPanel';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminLandingPackageVideosPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="וידאו לחבילות" subtitle="ניהול קישורי סרטון לדפי נחיתה של חבילות" icon={Video} />
      <LandingPackageVideosPanel hideHeader />
    </div>
  );
}
