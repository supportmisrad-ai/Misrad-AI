'use client';

import React from 'react';
import { User } from 'lucide-react';
import { FounderImagePanel } from '@/components/saas/FounderImagePanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminLandingFounderPageClient() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="מייסד" subtitle="תמונת מייסד בדף הנחיתה" icon={User} />
      <FounderImagePanel hideHeader />
    </div>
  );
}
