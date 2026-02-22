import SystemFieldMapClient from './SystemFieldMapClient';
import { getFieldTeamsAction } from '@/app/actions/system-field-teams';

export default async function SystemFieldMapPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const { teams } = await getFieldTeamsAction(orgSlug).catch(() => ({ teams: [] }));

  return <SystemFieldMapClient orgSlug={orgSlug} initialTeams={teams} />;
}
