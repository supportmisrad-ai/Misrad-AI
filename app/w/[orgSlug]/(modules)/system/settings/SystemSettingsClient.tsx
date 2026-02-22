'use client';

import React from 'react';
import SettingsView from '@/components/system/system.os/components/SettingsView';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemLeadDTO } from '@/app/actions/system-leads';

export default function SystemSettingsClient({
  orgSlug,
  initialLeads,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
}) {
  const leads = initialLeads.map(mapDtoToLead);

  return <SettingsView leads={leads} orgSlug={orgSlug} />;
}
