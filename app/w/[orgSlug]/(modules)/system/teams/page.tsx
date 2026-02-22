import SystemTeamsClient from './SystemTeamsClient';
import { getSalesTeamsAction } from '@/app/actions/system-sales-teams';

export default async function SystemTeamsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  const { teams } = await getSalesTeamsAction(orgSlug).catch(() => ({ teams: [] }));

  return <SystemTeamsClient orgSlug={orgSlug} initialTeams={teams} />;
}
