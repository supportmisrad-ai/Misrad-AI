'use client';

import React, { useMemo } from 'react';
import ReportsView from '@/components/system/ReportsView';
import type { Campaign, Lead } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { mapCampaignDto } from '@/components/system/utils/mapCampaign';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';

export default function SystemReportsClient({
  orgSlug: _orgSlug,
  initialLeads,
  initialCampaigns,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
}) {
  const leads: Lead[] = useMemo(() => (initialLeads || []).map(mapDtoToLead), [initialLeads]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);

  return <ReportsView leads={leads} campaigns={campaigns} />;
}
