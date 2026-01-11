import { notFound } from 'next/navigation';
import { getSystemBootstrap } from '@/lib/services/system-service';
import SystemModuleEntryClient from '../SystemModuleEntryClient';

export const dynamic = 'force-dynamic';

const TAB_IDS = new Set([
  'workspace',
  'sales_pipeline',
  'sales_leads',
  'calendar',
  'comms',
  'dialer',
  'tasks',
  'mkt_campaigns',
  'mkt_content',
  'mkt_forms',
  'mkt_partners',
  'finance',
  'quotes',
  'products',
  'operations',
  'reports',
  'headquarters',
  'system',
  'personal_area',
  'notifications_center',
  'focus_mode',
  'data_connectivity',
  'ai_analytics',
  'settings',
]);

export default async function SystemCatchAllPage({
  params,
}: {
  params: Promise<{ orgSlug: string; path: string[] }>;
}) {
  const { orgSlug, path } = await params;

  const tab = Array.isArray(path) && path.length ? path[0] : null;
  if (!tab || !TAB_IDS.has(tab)) {
    notFound();
  }

  const { initialCurrentUser, initialOrganization } = await getSystemBootstrap(orgSlug);

  return (
    <SystemModuleEntryClient
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      initialTab={tab}
    />
  );
}
