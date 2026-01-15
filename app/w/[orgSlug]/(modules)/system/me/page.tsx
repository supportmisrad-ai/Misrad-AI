import { getSystemBootstrap } from '@/lib/services/system-service';
import SystemModuleEntryClient from '../SystemModuleEntryClient';

export const dynamic = 'force-dynamic';

export default async function SystemMePage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { initialCurrentUser, initialOrganization } = await getSystemBootstrap(orgSlug);

  return (
    <SystemModuleEntryClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialTab="me"
    />
  );
}
