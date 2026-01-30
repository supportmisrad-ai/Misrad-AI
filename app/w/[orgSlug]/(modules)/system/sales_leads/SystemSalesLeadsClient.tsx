'use client';

import React, { useMemo, useState } from 'react';
import type { Lead, PipelineStage } from '@/components/system/types';
import ContactsView from '@/components/system/ContactsView';
import LeadModal from '@/components/system/LeadModal';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemLeadDTO } from '@/app/actions/system-leads';
import { createSystemLeadActivity, getSystemLeadsPage, updateSystemLead, updateSystemLeadStatus } from '@/app/actions/system-leads';
import { useToast } from '@/components/system/contexts/ToastContext';

export default function SystemSalesLeadsClient({
  orgSlug,
  initialLeads,
  initialNextCursor,
  initialHasMore,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
}) {
  const { addToast } = useToast();

  const [leadsDto, setLeadsDto] = useState<SystemLeadDTO[]>(() => initialLeads || []);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState<boolean>(Boolean(initialHasMore));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const leads = useMemo<Lead[]>(() => leadsDto.map(mapDtoToLead), [leadsDto]);

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => String(l.id) === String(selectedLeadId)) || null;
  }, [leads, selectedLeadId]);

  const handleStatusChange = async (leadId: string, newStatus: PipelineStage) => {
    const res = await updateSystemLeadStatus({ orgSlug, leadId: String(leadId), status: newStatus });
    if (!res.ok) {
      addToast(res.message || 'שגיאה בעדכון סטטוס', 'error');
      return;
    }

    setLeadsDto((prev) => prev.map((l) => (String(l.id) === String(res.lead.id) ? res.lead : l)));
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    if (!hasMore) return;
    try {
      setIsLoadingMore(true);
      const res = await getSystemLeadsPage({ orgSlug, cursor: nextCursor, pageSize: 200 });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת לידים', 'error');
        return;
      }

      setLeadsDto((prev) => {
        const base = Array.isArray(prev) ? prev : [];
        const incoming = Array.isArray(res.data.leads) ? res.data.leads : [];
        const byId = new Map<string, SystemLeadDTO>();
        for (const l of base) byId.set(String(l.id), l);
        for (const l of incoming) byId.set(String(l.id), l);
        return Array.from(byId.values());
      });

      setNextCursor(res.data.nextCursor);
      setHasMore(Boolean(res.data.hasMore));
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בטעינת לידים', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleAddActivity = async (leadId: string, activity: any) => {
    const res = await createSystemLeadActivity({
      orgSlug,
      leadId: String(leadId),
      type: String(activity?.type || 'note'),
      content: String(activity?.content || ''),
      direction: activity?.direction ?? null,
      metadata: activity?.metadata ?? null,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בשמירת פעילות', 'error');
      return;
    }

    if ((res as any).lead) {
      const updated = (res as any).lead as SystemLeadDTO;
      setLeadsDto((prev) => prev.map((l) => (String(l.id) === String(updated.id) ? updated : l)));
    }

    addToast('נשמר', 'success');
  };

  const handleUpdateLead = async (params: {
    leadId: string;
    name?: string;
    phone?: string;
    email?: string | null;
    assignedAgentId?: string | null;
    nextActionDate?: Date | null;
    nextActionNote?: string | null;
  }) => {
    const res = await updateSystemLead({
      orgSlug,
      leadId: String(params.leadId),
      name: params.name,
      phone: params.phone,
      email: params.email,
      assignedAgentId: params.assignedAgentId ?? undefined,
      nextActionDate:
        params.nextActionDate ? params.nextActionDate.toISOString() : params.nextActionDate === null ? null : undefined,
      nextActionNote: params.nextActionNote ?? undefined,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בעדכון ליד', 'error');
      return;
    }

    setLeadsDto((prev) => prev.map((l) => (String(l.id) === String(res.lead.id) ? res.lead : l)));
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-hidden relative">
          <ContactsView leads={leads} viewMode="all" onLeadClick={(l) => setSelectedLeadId(String(l.id))} />
        </div>

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
      </div>

      {selectedLead ? (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
          onScheduleMeeting={() => {
            addToast('קביעת פגישה זמינה ב-Calendar', 'info');
          }}
          onStatusChange={(id, status) => void handleStatusChange(String(id), status as any)}
          onUpdateLead={(p) =>
            void handleUpdateLead({
              leadId: p.leadId,
              name: p.name,
              phone: p.phone,
              email: p.email,
              assignedAgentId: p.assignedAgentId,
              nextActionDate: p.nextActionDate,
              nextActionNote: p.nextActionNote,
            })
          }
        />
      ) : null}
    </>
  );
}
