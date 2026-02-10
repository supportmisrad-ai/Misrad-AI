'use client';

import React from 'react';
import { DollarSign } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { ModuleControlPanel } from '@/components/saas/ModuleControlPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminFinanceControlPageClient() {
  const { organization, updateSystemFlag } = useData();
  
  if (!organization) return null;
  
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="בקרה" subtitle="בקרת מודול Finance" icon={DollarSign} />
      <ModuleControlPanel 
        moduleKey="finance"
        organization={organization} 
        updateSystemFlag={updateSystemFlag} 
        hideHeader 
      />
    </div>
  );
}
