import React, { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getOrganizations } from '@/app/actions/admin-organizations';
import { backfillUnlinkedOrganizations } from '@/app/actions/business-clients';
import AdminCustomersUnifiedClient from './AdminCustomersUnifiedClient';

export const metadata = {
  title: 'לקוחות וארגונים | Admin',
};

export default async function AdminCustomersPage() {
  // Auto-sync: backfill any orgs that were created before the auto-link fix
  await backfillUnlinkedOrganizations();

  const res = await getOrganizations({ limit: 500 });
  const orgs = res.success ? res.data ?? [] : [];
  const error = res.success ? null : (res.error ?? 'שגיאה בטעינה');

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <AdminCustomersUnifiedClient orgs={orgs} error={error} />
    </Suspense>
  );
}
