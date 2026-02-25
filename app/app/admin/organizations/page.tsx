import React, { Suspense } from 'react';
import { getOrganizations } from '@/app/actions/admin-organizations';
import AdminOrganizationsClient from './AdminOrganizationsClient';
import { Loader2 } from 'lucide-react';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

async function OrgsLoader({ initialOpen }: { initialOpen: boolean }) {
  const res = await getOrganizations({ limit: 200 });
  const orgs = res.success ? res.data ?? [] : [];

  if (!res.success) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="text-slate-900 font-black">שגיאה בטעינה</div>
        <div className="text-sm text-slate-600 mt-2">{res.error || 'שגיאה לא ידועה'}</div>
      </div>
    );
  }

  return <AdminOrganizationsClient orgs={orgs} initialOpen={initialOpen} />;
}

export default async function AdminOrganizationsPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined> | Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = searchParams ? await Promise.resolve(searchParams) : {};
  const newParam = Array.isArray(sp?.new) ? sp.new[0] : sp?.new;
  const initialOpen = newParam === '1' || newParam === 'true';

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <OrgsLoader initialOpen={initialOpen} />
    </Suspense>
  );
}
