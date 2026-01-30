'use client';

import React from 'react';
import { Building2 } from 'lucide-react';
import { PartnersLogosPanel } from '@/components/saas/PartnersLogosPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminLandingPartnersPageClient() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="שותפים" subtitle="לוגואים בדף הנחיתה" icon={Building2} />
      <PartnersLogosPanel hideHeader />
    </div>
  );
}
