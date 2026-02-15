'use client';

import React from 'react';
import { useData } from '@/context/DataContext';
import { AnnouncementsPanel } from '@/components/saas/AnnouncementsPanel';

export default function AdminClientAnnouncementsPageClient() {
  const { currentUser, addToast } = useData();
  return <AnnouncementsPanel currentUser={currentUser} addToast={addToast} />;
}
