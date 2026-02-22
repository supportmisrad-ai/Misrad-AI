'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { FeatureRequestsPanel } from '@/components/saas/FeatureRequestsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminClientFeaturesPageClient() {
  const { addToast } = useData();
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="בקשות פיצ'רים" subtitle="ניהול בקשות משתמשים לתכונות חדשות" icon={Lightbulb} />
      <FeatureRequestsPanel addToast={addToast} />
    </div>
  );
}
