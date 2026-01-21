'use client';

import React, { useMemo, useState } from 'react';
import CommunicationViewBase from '@/components/communication/CommunicationViewBase';
import { useToast } from '@/components/system/contexts/ToastContext';
import { useOnClickOutside } from '@/components/system/hooks/useOnClickOutside';
import { CallButton } from '@/components/shared/CallButton';
import { QUICK_ASSETS, STAGES } from '@/components/system/constants';
import type { Activity, Lead } from '@/components/system/types';
import { createSystemLeadActivity, type SystemCallHistoryDTO, type SystemLeadDTO } from '@/app/actions/system-leads';
import { uploadCallRecordingFile } from '@/app/actions/files';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { useSystemShell } from '../SystemShellGateClient';

export default function SystemDialerClient({
  orgSlug,
  initialLeads,
  callHistory,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  callHistory: SystemCallHistoryDTO[];
}) {
  const toast = useToast();
  const { currentUser } = useSystemShell();
  const [leads, setLeads] = useState<Lead[]>(() => initialLeads.map(mapDtoToLead));

  const calls = useMemo(() => {
    return (callHistory || []).map((c) => ({
      id: String(c.id),
      leadId: String(c.lead_id),
      leadName: String(c.lead_name || ''),
      leadPhone: String(c.lead_phone || ''),
      content: String(c.content || ''),
      timestamp: String(c.timestamp || ''),
      direction: c.direction != null ? String(c.direction) : null,
    }));
  }, [callHistory]);

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
      setLeads((prev) => prev.map((l) => (String(l.id) === String(leadId) ? ({
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
      } as any) : l)));
    }
  };

  const aiDraft = async () => null;

  const handleUploadRecording = async (params: { leadId: string; file: File }) => {
    const { leadId, file } = params;
    const lead = leads.find((l) => String(l.id) === String(leadId));
    if (!lead) {
      toast.addToast('לא נמצא ליד לשיוך ההקלטה', 'error');
      return;
    }

    const uploadRes = await uploadCallRecordingFile(file, file.name, String(leadId));
    if (!uploadRes.success) {
      toast.addToast(uploadRes.error || 'שגיאה בהעלאת הקלטה', 'error');
      return;
    }

    const fd = new FormData();
    fd.append('file', file);

    const transcribeRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`, {
      method: 'POST',
      body: fd,
    });

    if (transcribeRes.status === 402) {
      toast.addToast('אין מספיק נקודות AI לתמלול', 'warning');
      return;
    }

    if (!transcribeRes.ok) {
      const err = await transcribeRes.json().catch(() => ({} as any));
      toast.addToast(err?.error || 'שגיאה בתמלול', 'error');
      return;
    }

    const transcribeJson = (await transcribeRes.json().catch(() => ({} as any))) as any;
    const transcriptText = String(transcribeJson?.transcriptText || '').trim();
    if (!transcriptText) {
      toast.addToast('תמלול ריק', 'error');
      return;
    }

    const suggestRes = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/suggest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transcriptText }),
    });

    if (suggestRes.status === 402) {
      toast.addToast('אין מספיק נקודות AI לניתוח מתקדם', 'warning');
      return;
    }

    if (!suggestRes.ok) {
      const err = await suggestRes.json().catch(() => ({} as any));
      toast.addToast(err?.error || 'שגיאה בניתוח', 'error');
      return;
    }

    const suggestJson = (await suggestRes.json().catch(() => ({} as any))) as any;
    const analysisResult = suggestJson?.result || {};
    const summaryText = String(analysisResult?.summary || '').trim();
    const activityContent = summaryText ? `ניתוח שיחה (AI):\n${summaryText}` : 'ניתוח שיחה (AI)';

    const res = await createSystemLeadActivity({
      orgSlug,
      leadId: String(leadId),
      type: 'call',
      content: activityContent,
      direction: 'outbound',
      metadata: {
        callAnalysis: {
          kind: 'call_recording_ai',
          audio: {
            bucket: (uploadRes as any).bucket,
            path: uploadRes.path,
            url: uploadRes.url,
            signedUrl: (uploadRes as any).signedUrl,
            fileName: file.name,
            mimeType: file.type,
          },
          transcriptText,
          analysis: analysisResult,
          ai: {
            transcription: {
              provider: transcribeJson?.provider,
              model: transcribeJson?.model,
              chargedCents: transcribeJson?.chargedCents,
            },
            suggestion: {
              provider: suggestJson?.provider,
              model: suggestJson?.model,
              chargedCents: suggestJson?.chargedCents,
            },
          },
        },
      },
    });

    if (!res.ok) {
      toast.addToast(res.message || 'שגיאה בשמירת פעילות ניתוח שיחה', 'error');
      return;
    }

    toast.addToast('הקלטה נותחה ונשמרה בליד', 'success');

    if ((res as any).lead) {
      const nextDto = (res as any).lead as any;
      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === String(leadId)
            ? mapDtoToLead({
                ...nextDto,
                activities: (nextDto.activities || []).map((a: any) => ({
                  id: String(a.id),
                  type: String(a.type) as any,
                  content: String(a.content || ''),
                  timestamp: new Date(a.timestamp),
                  direction: a.direction ? (String(a.direction) as any) : undefined,
                  metadata: a.metadata ?? null,
                })),
              } as any)
            : l
        )
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-3xl p-4">
        <div className="text-sm font-black text-slate-900 mb-3">שיחות אחרונות</div>
        <div className="space-y-2">
          {calls.slice(0, 8).map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-slate-200 bg-slate-50">
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate">{c.leadName || 'ליד'}</div>
                <div className="text-xs font-bold text-slate-500" dir="ltr">{c.leadPhone}</div>
              </div>
              <div className="text-[11px] font-bold text-slate-500 shrink-0">
                {c.timestamp ? new Date(c.timestamp).toLocaleString('he-IL') : ''}
              </div>
            </div>
          ))}
          {calls.length === 0 ? <div className="text-sm font-bold text-slate-500">אין עדיין היסטוריית שיחות.</div> : null}
        </div>
      </div>

      <CommunicationViewBase
        leads={leads as any}
        onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity as any)}
        onUpdateLead={() => {}}
        initialTab="phone"
        user={currentUser}
        onUploadRecordingAction={(params) => void handleUploadRecording(params)}
        useToast={() => toast as any}
        useOnClickOutside={useOnClickOutside as any}
        CallButton={CallButton as any}
        QUICK_ASSETS={QUICK_ASSETS as any}
        STAGES={STAGES as any}
        aiDraft={aiDraft as any}
      />
    </div>
  );
}
