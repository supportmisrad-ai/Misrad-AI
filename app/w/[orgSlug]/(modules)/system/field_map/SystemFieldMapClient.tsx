'use client';

import React from 'react';
import FieldMapView from '@/components/system/FieldMapView';
import {
  createFieldTeamAction,
  addFieldAgentAction,
  deleteFieldTeamAction,
  deleteFieldAgentAction,
} from '@/app/actions/system-field-teams';
import type { FieldTeamDTO } from '@/app/actions/system-field-teams';

export default function SystemFieldMapClient({
  orgSlug,
  initialTeams = [],
}: {
  orgSlug: string;
  initialTeams?: FieldTeamDTO[];
}) {
  return (
    <FieldMapView
      orgSlug={orgSlug}
      initialTeams={initialTeams}
      createTeamAction={createFieldTeamAction}
      addAgentAction={addFieldAgentAction}
      deleteTeamAction={deleteFieldTeamAction}
      deleteAgentAction={deleteFieldAgentAction}
    />
  );
}
