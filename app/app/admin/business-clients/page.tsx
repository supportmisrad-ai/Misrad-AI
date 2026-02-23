import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import BusinessClientsClient from './BusinessClientsClient';
import { getBusinessClients, backfillUnlinkedOrganizations } from '@/app/actions/business-clients';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  // Auto-sync: backfill any orgs that were created before the auto-link fix
  await backfillUnlinkedOrganizations();

  const result = await getBusinessClients({});
  const initialClients = result.ok && 'clients' in result ? result.clients : [];

  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        }
      >
        <BusinessClientsClient initialClients={initialClients} />
      </Suspense>
    </div>
  );
}
