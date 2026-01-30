'use client';

import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { SystemControlPanel } from '@/components/saas/SystemControlPanel';
import { useData } from '@/context/DataContext';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminSystemFlagsPage() {
  const { organization, updateSystemFlag } = useData();

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="מתגי מערכת" subtitle="ניהול סטטוס מסכים גלובלי" icon={SlidersHorizontal} />
      <SystemControlPanel organization={organization} updateSystemFlag={updateSystemFlag} hideHeader />
    </div>
  );
}
