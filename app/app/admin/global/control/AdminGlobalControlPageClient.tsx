'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SystemControlPanel } from '@/components/saas/SystemControlPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGlobalControlPageClient() {
  const { organization, updateSystemFlag } = useData();

  if (!organization) return null;

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="בקרה" subtitle="בקרת מערכת גלובלית" icon={Shield} />
      <SystemControlPanel organization={organization} updateSystemFlag={updateSystemFlag} hideHeader />
    </div>
  );
}
