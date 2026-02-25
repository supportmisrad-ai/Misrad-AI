import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CustomersDashboardClient from './CustomersDashboardClient';
import { getOrganizations } from '@/app/actions/admin-organizations';
import prisma from '@/lib/prisma';

export const metadata = {
  title: 'דשבורד לקוחות | Admin',
};

async function CustomersDashboardLoader() {
  const [result, orphanedUsersCount] = await Promise.all([
    getOrganizations({}),
    prisma.organizationUser.count({
      where: { organization_id: null },
    }).catch(() => 0),
  ]);

  const organizations = result.success ? result.data ?? [] : [];
  const error = result.success ? null : result.error ?? null;

  return (
    <CustomersDashboardClient
      organizations={organizations}
      error={error}
      orphanedUsersCount={orphanedUsersCount}
    />
  );
}

export default function CustomersDashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <CustomersDashboardLoader />
    </Suspense>
  );
}
