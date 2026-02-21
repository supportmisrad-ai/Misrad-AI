import React from 'react';
import { getOrganizationDetail } from '@/app/actions/admin-org-details';
import OrgDetailClient from './OrgDetailClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminOrgDetailPage(props: PageProps) {
  const { id } = await props.params;
  const res = await getOrganizationDetail({ organizationId: id });

  if (!res.success || !res.data) {
    return (
      <div className="space-y-6 pb-24" dir="rtl">
        <div className="bg-white border border-red-200 rounded-2xl p-8">
          <div className="text-lg font-black text-red-700">שגיאה בטעינת ארגון</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'ארגון לא נמצא'}</div>
        </div>
      </div>
    );
  }

  return <OrgDetailClient data={res.data} />;
}
