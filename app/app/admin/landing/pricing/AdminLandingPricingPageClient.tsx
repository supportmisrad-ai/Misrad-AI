'use client';

import React from 'react';
import { Package } from 'lucide-react';
import { ComprehensivePricingPanel } from '@/components/saas/ComprehensivePricingPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminLandingPricingPageClient() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="תמחור" subtitle="ניהול חבילות דפי הנחיתה" icon={Package} />
      <ComprehensivePricingPanel hideHeader />
    </div>
  );
}
