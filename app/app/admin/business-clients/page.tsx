import BusinessClientsClient from './BusinessClientsClient';
import { getBusinessClients, syncOrganizationsToBusinessClients } from '@/app/actions/business-clients';

export const metadata = {
  title: 'לקוחות עסקיים | Admin',
  description: 'ניהול לקוחות עסקיים B2B',
};

export default async function BusinessClientsPage() {
  // Auto-sync: ensure all organizations are linked to business clients.
  // The sync is efficient — only processes orgs with client_id=null,
  // returns immediately if everything is already linked.
  await syncOrganizationsToBusinessClients().catch(() => {});

  const result = await getBusinessClients({});
  const initialClients = result.ok && 'clients' in result ? result.clients : [];

  return (
    <div className="p-6">
      <BusinessClientsClient initialClients={initialClients} />
    </div>
  );
}
