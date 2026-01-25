'use client';

import React from 'react';
import { Users } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { GlobalUsersPanel } from '@/components/saas/GlobalUsersPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminGlobalUsersPageClient() {
  const { tenants, addToast } = useData();

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="משתמשים" subtitle="ניהול משתמשים גלובלי" icon={Users} />
      <GlobalUsersPanel tenants={(Array.isArray(tenants) ? tenants : []) as any} addToast={addToast} hideHeader />
    </div>
  );
}
