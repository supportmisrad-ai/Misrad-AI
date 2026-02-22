'use client';

import React from 'react';
import { Megaphone } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { AnnouncementsPanel } from '@/components/saas/AnnouncementsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminClientAnnouncementsPageClient() {
  const { currentUser, addToast } = useData();
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הודעות" subtitle="ניהול הודעות ועדכונים ללקוחות" icon={Megaphone} />
      <AnnouncementsPanel currentUser={currentUser} addToast={addToast} />
    </div>
  );
}
