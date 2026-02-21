import React from 'react';
import { Video } from 'lucide-react';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { VideoManagementPanel } from '@/components/saas/VideoManagementPanel';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function AdminGlobalHelpVideosPage() {
  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="ניהול סרטונים" subtitle="תמיכה · הדרכות · שיווק — כל הסרטונים במקום אחד" icon={Video} />
      <VideoManagementPanel />
    </div>
  );
}
