'use client';

import React, { useState } from 'react';
import CommunicationView from '@/components/system/CommunicationView';
import { useToast } from '@/components/system/contexts/ToastContext';
import type { Activity, Lead } from '@/components/system/types';
import { createSystemLeadActivity, getSystemLeadsPage, type SystemCallHistoryDTO, type SystemLeadDTO } from '@/app/actions/system-leads';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemPipelineStageDTO } from '@/app/actions/system-pipeline-stages';
import { useSystemShell } from '../SystemShellGateClient';
import { getErrorMessage } from '@/lib/shared/unknown';

export default function SystemDialerClient({
  orgSlug,
  initialLeads,
  initialNextCursor,
  initialHasMore,
  callHistory: _callHistory,
  initialStages: _initialStages,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  callHistory: SystemCallHistoryDTO[];
  initialStages: SystemPipelineStageDTO[];
}) {
  const toast = useToast();
  const { currentUser } = useSystemShell();
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map(mapDtoToLead));
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(Boolean(initialHasMore));
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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
      const updated = mapDtoToLead(res.lead);
      setLeads((prev) => prev.map((l) => (String(l.id) === String(updated.id) ? updated : l)));
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    if (!hasMore) return;
    try {
      setIsLoadingMore(true);
      const res = await getSystemLeadsPage({ orgSlug, cursor: nextCursor, pageSize: 200 });
      if (!res.success) {
        toast.addToast(res.error || 'שגיאה בטעינת לידים', 'error');
        return;
      }

      setLeads((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const incoming = (Array.isArray(res.data.leads) ? res.data.leads : []).map(mapDtoToLead);
        const byId = new Map<string, Lead>();
        for (const l of base) byId.set(String(l.id), l);
        for (const l of incoming) byId.set(String(l.id), l);
        return Array.from(byId.values());
      });

      setNextCursor(res.data.nextCursor);
      setHasMore(Boolean(res.data.hasMore));
    } catch (e: unknown) {
      toast.addToast(getErrorMessage(e) || 'שגיאה בטעינת לידים', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  return (
    <>
      <CommunicationView
        leads={leads}
        onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
        onAddTask={undefined}
        user={
          currentUser
            ? {
                ...currentUser,
                phone: currentUser.phone ?? undefined,
              }
            : undefined
        }
      />

      {hasMore ? (
        <div className="p-4 flex justify-center">
          <button
            type="button"
            onClick={() => void handleLoadMore()}
            disabled={isLoadingMore}
            className="bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-black text-sm shadow-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {isLoadingMore ? 'טוען...' : 'טען עוד'}
          </button>
        </div>
      ) : null}
    </>
  );
}
