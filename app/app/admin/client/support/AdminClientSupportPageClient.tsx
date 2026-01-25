'use client';

import React from 'react';
import { LifeBuoy } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SupportTicketsPanel } from '@/components/saas/SupportTicketsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminClientSupportPageClient() {
  const { addToast } = useData();
  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader title="תמיכה" subtitle="ניהול קריאות תמיכה" icon={LifeBuoy} />
      <SupportTicketsPanel addToast={addToast as any} hideHeader />
    </div>
  );
}
