import React from 'react';
import { LandingPaymentLinksPanel } from '@/components/saas/LandingPaymentLinksPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { CreditCard } from 'lucide-react';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminLandingPaymentLinksPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="תשלום" subtitle="לינקים לתשלום וסליקה" icon={CreditCard} />
      <LandingPaymentLinksPanel hideHeader />
    </div>
  );
}
