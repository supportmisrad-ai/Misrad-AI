'use client';

import React from 'react';
import TeamsView from '@/components/system/TeamsView';
import {
  createSalesTeamAction,
  addTeamMemberAction,
  deleteSalesTeamAction,
  deleteTeamMemberAction,
} from '@/app/actions/system-sales-teams';
import type { SalesTeamDTO } from '@/app/actions/system-sales-teams';

export default function SystemTeamsClient({
  orgSlug,
  initialTeams = [],
}: {
  orgSlug: string;
  initialTeams?: SalesTeamDTO[];
}) {
  return (
    <TeamsView
      orgSlug={orgSlug}
      initialTeams={initialTeams}
      createTeamAction={createSalesTeamAction}
      addMemberAction={addTeamMemberAction}
      deleteTeamAction={deleteSalesTeamAction}
      deleteMemberAction={deleteTeamMemberAction}
    />
  );
}
