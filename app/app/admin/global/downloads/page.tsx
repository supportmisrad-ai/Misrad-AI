import React from 'react';
import { Download } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminGlobalDownloadsPageClient from './AdminGlobalDownloadsPageClient';

export const dynamic = 'force-dynamic';

export default function AdminGlobalDownloadsPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הורדות" subtitle="ניהול לינקים להורדת Windows / Android" icon={Download} />
      <AdminGlobalDownloadsPageClient />
    </div>
  );
}
