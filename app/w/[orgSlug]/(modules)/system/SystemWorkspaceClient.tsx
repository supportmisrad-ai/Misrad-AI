'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceHub from '@/components/system/WorkspaceHub';
import LeadModal from '@/components/system/LeadModal';
import NewLeadModal from '@/components/system/NewLeadModal';
import NewMeetingModal from '@/components/system/NewMeetingModal';
import type { Activity, Lead, CalendarEvent, Campaign } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import { mapDtoToCalendarEvent } from '@/components/system/utils/mapCalendarEvent';
import { mapCampaignDto } from '@/components/system/utils/mapCampaign';
import {
  createSystemLead,
  createSystemLeadActivity,
  createSystemCalendarEvent,
  updateSystemLead,
  type SystemLeadDTO,
  type SystemCalendarEventDTO,
} from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import { useToast } from '@/components/system/contexts/ToastContext';
import type { SystemNotificationDTO } from '@/app/actions/system-notifications';

import { getErrorMessage } from '@/lib/shared/unknown';


export default function SystemWorkspaceClient({
  orgSlug,
  initialLeads,
  initialEvents,
  initialCampaigns,
  initialNotifications,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialEvents: SystemCalendarEventDTO[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialNotifications: SystemNotificationDTO[];
}) {
  const router = useRouter();
  const { addToast } = useToast();

  const basePath = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/system`, [orgSlug]);

  const [leadsDto, setLeadsDto] = useState<SystemLeadDTO[]>(initialLeads);
  const [events, setEvents] = useState<CalendarEvent[]>(() => (initialEvents || []).map(mapDtoToCalendarEvent));

  const leads: Lead[] = useMemo(() => (leadsDto || []).map(mapDtoToLead), [leadsDto]);
  const campaigns: Campaign[] = useMemo(() => (initialCampaigns || []).map(mapCampaignDto), [initialCampaigns]);

  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [meetingPreselectLeadId, setMeetingPreselectLeadId] = useState<string>('');

  const selectedLead = useMemo(() => {
    if (!selectedLeadId) return null;
    return leads.find((l) => String(l.id) === String(selectedLeadId)) || null;
  }, [leads, selectedLeadId]);

  const navigateToTab = (tabId: string) => {
    const from = `${basePath}`;
    if (tabId === 'personal_area') {
      router.push(`${basePath}/hub?origin=system&drawer=profile&from=${encodeURIComponent(from)}`);
      return;
    }
    if (tabId === 'system' || tabId === 'settings') {
      router.push(`${basePath}/hub?origin=system&drawer=system&from=${encodeURIComponent(from)}`);
      return;
    }
    router.push(`${basePath}/${tabId}`);
  };

  const handleCreateLead = async (lead: Lead) => {
    try {
      const created = await createSystemLead(orgSlug, {
        name: lead.name,
        company: lead.company,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        value: lead.value,
        isHot: lead.isHot,
        productInterest: lead.productInterest,
      });
      setLeadsDto((prev) => [created, ...prev]);
      addToast('ליד נוצר', 'success');
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה ביצירת ליד', 'error');
    }
  };

  const handleAddActivity = async (leadId: string, activity: Activity) => {
    const res = await createSystemLeadActivity({
      orgSlug,
      leadId: String(leadId),
      type: String(activity?.type || 'note'),
      content: String(activity?.content || ''),
      direction: activity?.direction ?? null,
      metadata: (activity?.metadata ?? null) as import('@prisma/client').Prisma.InputJsonValue | null,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בשמירת פעילות', 'error');
      return;
    }

    if (res.lead) {
      const updated = res.lead;
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
      nextActionDate: params.nextActionDate ? params.nextActionDate.toISOString() : params.nextActionDate === null ? null : undefined,
      nextActionNote: params.nextActionNote ?? undefined,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בעדכון ליד', 'error');
      return;
    }

    setLeadsDto((prev) => prev.map((l) => (String(l.id) === String(res.lead.id) ? res.lead : l)));
    addToast('עודכן', 'success');
  };

  const handleAddEvent = async (event: CalendarEvent) => {
    const leadId = event.leadId ? String(event.leadId) : null;
    if (!leadId) {
      addToast('כדי לשמור אירוע חייבים לבחור ליד', 'warning');
      return;
    }

    const res = await createSystemCalendarEvent({
      orgSlug,
      leadId,
      title: String(event.title || '').trim(),
      leadName: String(event.leadName || '').trim(),
      leadCompany: String(event.leadCompany || '').trim(),
      dayName: String(event.dayName || '').trim(),
      date: String(event.date || '').trim(),
      time: String(event.time || '').trim(),
      type: String(event.type || 'zoom'),
      location: String(event.location || '').trim(),
      participants: event.participants ?? null,
      reminders: event.reminders ?? null,
      postMeeting: event.postMeeting ?? null,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה ביצירת אירוע', 'error');
      return;
    }

    setEvents((prev) => [mapDtoToCalendarEvent(res.event), ...prev]);
    addToast('האירוע נשמר', 'success');
  };

  return (
    <>
      <WorkspaceHub
        leads={leads}
        content={[]}
        students={[]}
        campaigns={campaigns}
        events={events}
        notifications={initialNotifications}
        onLeadClick={(lead) => setSelectedLeadId(String(lead.id))}
        onNavigate={navigateToTab}
        onQuickAction={(action) => {
          if (action === 'lead') {
            setShowNewLeadModal(true);
            return;
          }
          if (action === 'meeting') {
            setMeetingPreselectLeadId('');
            setShowNewMeetingModal(true);
            return;
          }
          navigateToTab('sales_pipeline');
        }}
        onAddEvent={(event) => void handleAddEvent(event)}
        onNewMeetingClick={() => {
          setMeetingPreselectLeadId('');
          setShowNewMeetingModal(true);
        }}
        onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
      />

      {selectedLead ? (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLeadId(null)}
          onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
          onScheduleMeeting={(leadId) => {
            setMeetingPreselectLeadId(String(leadId));
            setShowNewMeetingModal(true);
          }}
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

      {showNewLeadModal ? (
        <NewLeadModal
          onClose={() => setShowNewLeadModal(false)}
          onSave={(lead) => void handleCreateLead(lead)}
        />
      ) : null}

      {showNewMeetingModal ? (
        <NewMeetingModal
          leads={leads}
          initialLeadId={meetingPreselectLeadId || undefined}
          onClose={() => setShowNewMeetingModal(false)}
          onSave={(meeting) => void handleAddEvent(meeting)}
        />
      ) : null}
    </>
  );
}
