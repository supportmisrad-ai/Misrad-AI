'use client';

import React, { useMemo } from 'react';
import ReportsView from '@/components/system/ReportsView';
import type { Campaign, Lead, Task } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { mapNexusTaskToUiTask } from '@/components/system/utils/mapTask';
import { mapCampaignDto } from '@/components/system/utils/mapCampaign';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import type { Task as NexusTask } from '@/types';

export default function SystemReportsClient({
  orgSlug: _orgSlug,
  initialLeads,
  initialCampaigns,
  initialTasks,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialTasks: NexusTask[];
}) {
  const leads: Lead[] = useMemo(() => (initialLeads || []).map(mapDtoToLead), [initialLeads]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);
  const tasks: Task[] = useMemo(() => (initialTasks || []).map(mapNexusTaskToUiTask), [initialTasks]);

  return <ReportsView leads={leads} campaigns={campaigns} tasks={tasks} />;
}
