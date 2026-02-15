'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { AnnouncementsPanel } from '@/components/saas/AnnouncementsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export default function AdminSystemAnnouncementsPageClient() {
  const { currentUser, addToast } = useData();
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הודעות" subtitle="הודעות מערכת" icon={MessageSquare} />
      <AnnouncementsPanel currentUser={currentUser} addToast={addToast} hideHeader />
    </div>
  );
}
