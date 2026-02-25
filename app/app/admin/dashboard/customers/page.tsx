import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CustomersDashboardClient from './CustomersDashboardClient';
import { getOrganizations } from '@/app/actions/admin-organizations';
import prisma from '@/lib/prisma';

export const metadata = {
  title: 'דשבורד לקוחות | Admin',
};

async function loadDashboardData() {
  const [result, orphanedUsersCount] = await Promise.all([
    getOrganizations({}),
    // Count users who signed up but have no organization (webhook/upsert failed)
    prisma.organizationUser.count({
      where: { organization_id: null },
    }).catch(() => 0),
  ]);
  
  if (!result.success || !result.data) {
    return { organizations: [], error: result.error ?? null, orphanedUsersCount: 0 };
  }
  
  return { organizations: result.data, error: null, orphanedUsersCount };
}

export default async function CustomersDashboardPage() {
  const data = await loadDashboardData();
  
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <CustomersDashboardClient 
        organizations={data.organizations}
        error={data.error ?? null}
        orphanedUsersCount={data.orphanedUsersCount}
      />
    </Suspense>
  );
}
