'use client';

import React, { useCallback } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { SupportTicketsPanel } from '@/components/saas/SupportTicketsPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import NotificationSettings from './NotificationSettings';

export default function AdminClientSupportPageClient() {
  const { addToast } = useData();
  
  const handleAddToast = useCallback((message: string, type?: 'success' | 'error' | 'info') => {
    addToast(message, type || 'info');
  }, [addToast]);

  return (
    <div className="space-y-6" dir="rtl">
      <AdminPageHeader title="תקלות" subtitle="ניהול דיווחי תקלות" icon={LifeBuoy} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SupportTicketsPanel addToast={handleAddToast} hideHeader />
        </div>
        <div>
          <NotificationSettings />
        </div>
      </div>
    </div>
  );
}
