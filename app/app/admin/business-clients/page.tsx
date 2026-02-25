import BusinessClientsClient from './BusinessClientsClient';
import { getBusinessClients, backfillUnlinkedOrganizations } from '@/app/actions/business-clients';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  // Auto-backfill runs fire-and-forget — never blocks the page render.
  backfillUnlinkedOrganizations().catch(() => {});

  const result = await getBusinessClients({});
  const initialClients = result.ok && 'clients' in result ? result.clients : [];

  return (
    <div className="p-6">
      <BusinessClientsClient initialClients={initialClients} />
    </div>
  );
}
