'use client';

import React from 'react';
import { Shield } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { NexusControlPanel } from '@/components/saas/NexusControlPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminNexusControlPageClient() {
  const { organization, updateSystemFlag } = useData();
  if (!organization) return null;
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="בקרה" subtitle="בקרת מערכת Nexus" icon={Shield} />
      <NexusControlPanel organization={organization} updateSystemFlag={updateSystemFlag} hideHeader />
    </div>
  );
}
