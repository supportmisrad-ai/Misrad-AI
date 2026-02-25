import BusinessClientsClient from './BusinessClientsClient';
import { getBusinessClients, backfillUnlinkedOrganizations } from '@/app/actions/business-clients';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  // Auto-backfill: link any organizations with client_id=null to a BusinessClient.
  // Uses backfillUnlinkedOrganizations (no auth required, SSR-safe).
  // Returns 0 immediately if all orgs are already linked.
  await backfillUnlinkedOrganizations().catch(() => {});

  const result = await getBusinessClients({});
  const initialClients = result.ok && 'clients' in result ? result.clients : [];

  return (
    <div className="p-6">
      <BusinessClientsClient initialClients={initialClients} />
    </div>
  );
}
