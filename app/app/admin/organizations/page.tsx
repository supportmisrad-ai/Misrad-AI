import React from 'react';
import { getOrganizations } from '@/app/actions/admin-organizations';
import AdminOrganizationsClient from './AdminOrganizationsClient';

export const dynamic = 'force-dynamic';

export default async function AdminOrganizationsPage() {
  const res = await getOrganizations({ limit: 200 });
  const orgs = res.success ? (res.data as any[]) : [];

  return (
    <div>
      {!res.success ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="text-slate-900 font-black">שגיאה בטעינה</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'שגיאה לא ידועה'}</div>
        </div>
      ) : (
        <AdminOrganizationsClient orgs={orgs} />
      )}
    </div>
  );
}
