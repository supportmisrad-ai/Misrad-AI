import React from 'react';
import { Video } from 'lucide-react';
import { KbRouteVideosPanel } from '@/components/saas/KbRouteVideosPanel';
import AdminPageHeader from '@/components/admin/AdminPageHeader';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalKbVideosPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="Knowledge Base" subtitle="מיפוי Route → סרטון" icon={Video} />
      <KbRouteVideosPanel hideHeader />
    </div>
  );
}
