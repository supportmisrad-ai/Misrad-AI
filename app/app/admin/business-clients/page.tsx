import BusinessClientsClient from './BusinessClientsClient';
import { getBusinessClients, backfillUnlinkedOrganizations } from '@/app/actions/business-clients';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  // ⚠️ DISABLED: backfillUnlinkedOrganizations auto-creates business_clients for unlinked orgs
  // We don't want this behavior - orgs should be independent unless explicitly linked
  // backfillUnlinkedOrganizations().catch(() => {});

  const result = await getBusinessClients({});
  const initialClients = result.ok && 'clients' in result ? result.clients : [];

  return (
    <div className="p-6">
      <BusinessClientsClient initialClients={initialClients} />
    </div>
  );
}
