'use client';

import React, { useState } from 'react';
import CommunicationView from '@/components/system/CommunicationView';
import { useToast } from '@/components/system/contexts/ToastContext';
import type { Activity, Lead } from '@/components/system/types';
import { createSystemLeadActivity, type SystemCallHistoryDTO, type SystemLeadDTO } from '@/app/actions/system-leads';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemPipelineStageDTO } from '@/app/actions/system-pipeline-stages';
import { useSystemShell } from '../SystemShellGateClient';

export default function SystemDialerClient({
  orgSlug,
  initialLeads,
  callHistory: _callHistory,
  initialStages: _initialStages,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  callHistory: SystemCallHistoryDTO[];
  initialStages: SystemPipelineStageDTO[];
}) {
  const toast = useToast();
  const { currentUser } = useSystemShell();
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map(mapDtoToLead));

  const handleAddActivity = async (leadId: string, activity: Activity) => {
    const res = await createSystemLeadActivity({
      orgSlug,
      leadId,
      type: String(activity.type || 'note'),
      content: String(activity.content || '').trim(),
    });

    if (!res.ok) {
      toast.addToast(res.message || 'שגיאה בשמירת פעילות', 'error');
      return;
    }

    if (res.lead) {
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId)
            ? ({
                ...l,
                activities: (res.lead as any).activities
                  ? (res.lead as any).activities.map((a: any) => ({
                      id: String(a.id),
                      type: String(a.type) as any,
                      content: String(a.content || ''),
                      timestamp: new Date(a.timestamp),
                      direction: a.direction ? (String(a.direction) as any) : undefined,
                      metadata: a.metadata ?? null,
                    }))
                  : l.activities,
              } as any)
            : l
        )
      );
    }
  };

  return (
    <CommunicationView
      leads={leads as any}
      onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity as any)}
      onAddTask={undefined}
      user={currentUser}
    />
  );
}
