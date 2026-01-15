import { notFound, redirect } from 'next/navigation';
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
  'hub',
  'personal_area',
  'notifications_center',
  'focus_mode',
  'data_connectivity',
  'ai_analytics',
  'settings',
]);

export default async function SystemTabPage({
  params,
}: {
  params: Promise<{ orgSlug: string; tab: string }>;
}) {
  const { orgSlug, tab } = await params;

  if (tab === 'system' || tab === 'settings') {
    const from = `/w/${encodeURIComponent(orgSlug)}/system/${encodeURIComponent(tab)}`;
    return redirect(
      `/w/${encodeURIComponent(orgSlug)}/system/hub?origin=system&drawer=system&from=${encodeURIComponent(from)}`
    );
  }

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
