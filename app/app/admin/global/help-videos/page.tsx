import React from 'react';
import { Video } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { HelpVideosPanel } from '@/components/saas/HelpVideosPanel';

export const dynamic = 'force-dynamic';

export default async function AdminGlobalHelpVideosPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="ניהול סרטוני הדרכה" subtitle="How-to קצרים לפי מודול" icon={Video} />
      <HelpVideosPanel hideHeader />
    </div>
  );
}
