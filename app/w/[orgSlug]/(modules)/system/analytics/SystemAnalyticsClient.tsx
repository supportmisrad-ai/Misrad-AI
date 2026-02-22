'use client';

import React, { useMemo } from 'react';
import AIAnalyticsView from '@/components/system/AIAnalyticsView';
import type { Campaign, Lead, Task } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { mapNexusTaskToUiTask } from '@/components/system/utils/mapTask';
import { mapCampaignDto } from '@/components/system/utils/mapCampaign';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import type { Task as NexusTask } from '@/types';

export default function SystemAnalyticsClient({
  initialLeads,
  initialCampaigns,
  initialTasks,
}: {
  initialLeads: SystemLeadDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialTasks: NexusTask[];
}) {
  const leads: Lead[] = useMemo(() => (initialLeads || []).map(mapDtoToLead), [initialLeads]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);
  const tasks: Task[] = useMemo(() => (initialTasks || []).map(mapNexusTaskToUiTask), [initialTasks]);

  return <AIAnalyticsView leads={leads} campaigns={campaigns} tasks={tasks} invoices={[]} />;
}
