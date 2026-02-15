'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SystemOSControlPanel } from '@/components/saas/SystemOSControlPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminSystemControlPageClient() {
  const { organization, updateSystemFlag } = useData();
  if (!organization) return null;
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="בקרה" subtitle="בקרת מערכת System" icon={Settings} />
      <SystemOSControlPanel organization={organization } updateSystemFlag={updateSystemFlag } hideHeader />
    </div>
  );
}
