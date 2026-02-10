import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CustomersDashboardClient from './CustomersDashboardClient';
import { getOrganizations } from '@/app/actions/admin-organizations';

export const metadata = {
  title: 'דשבורד לקוחות | Admin',
};

async function loadDashboardData() {
  const result = await getOrganizations({});
  
  if (!result.success || !result.data) {
    return { organizations: [], error: result.error };
  }
  
  return { organizations: result.data, error: null };
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
        error={data.error}
      />
    </Suspense>
  );
}
