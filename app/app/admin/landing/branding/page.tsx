import React from 'react';
import { GlobalBrandingPanel } from '@/components/saas/GlobalBrandingPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Palette } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminLandingBrandingPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="מיתוג" subtitle="לוגו ברירת־מחדל לכל המערכת" icon={Palette} />
      <GlobalBrandingPanel hideHeader />
    </div>
  );
}
