'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkspaceHub from '@/components/system/WorkspaceHub';
import LeadModal from '@/components/system/LeadModal';
import NewLeadModal from '@/components/system/NewLeadModal';
import NewMeetingModal from '@/components/system/NewMeetingModal';
import type { Lead, CalendarEvent, Campaign, Task, TaskPriority, TaskStatus } from '@/components/system/types';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import {
  createSystemLead,
  createSystemLeadActivity,
  createSystemCalendarEvent,
  updateSystemLead,
  type SystemLeadDTO,
  type SystemCalendarEventDTO,
} from '@/app/actions/system-leads';
import type { Campaign as WorkspaceCampaignDTO } from '@/app/actions/campaigns';
import type { Task as NexusTask } from '@/types';
import { createNexusTaskByOrgSlug, updateNexusTaskByOrgSlug } from '@/app/actions/nexus';
import { useToast } from '@/components/system/contexts/ToastContext';
import type { SystemNotificationDTO } from '@/app/actions/system-notifications';

import { normalizeTaskStatus, normalizeTaskPriority } from '@/lib/task-utils';

function mapNexusTaskToUiTask(row: NexusTask): Task {
  const due = row.dueDate ? new Date(String(row.dueDate)) : new Date();
  const dueDate = Number.isNaN(due.getTime()) ? new Date() : due;

  return {
    id: String(row.id),
    title: String(row.title || ''),
    description: row.description == null ? undefined : String(row.description),
    assigneeId: String(row.assigneeId || (Array.isArray(row.assigneeIds) ? row.assigneeIds[0] : '') || ''),
    dueDate,
    priority: normalizeTaskPriority(String(row.priority || 'medium')),
    status: normalizeTaskStatus(String(row.status || 'todo')),
    tags: Array.isArray(row.tags) ? row.tags.map((t) => String(t)).filter(Boolean) : [],
  };
}

function normalizeCampaignStatus(value: string): Campaign['status'] {
  const v = String(value || '').toLowerCase();
  if (v === 'active' || v === 'paused' || v === 'draft') return v as any;
  if (v === 'completed') return 'paused';
  return 'active';
}

function mapCampaignDto(dto: WorkspaceCampaignDTO): Campaign {
  return {
    id: String(dto.id),
    name: String(dto.name || ''),
    platform: String((dto as any).objective || ''),
    status: normalizeCampaignStatus(String((dto as any).status || 'active')),
    budget: Number(dto.budget || 0),
    spent: Number(dto.spent || 0),
    leads: 0,
    cpl: 0,
    roas: Number(dto.roas || 0),
    impressions: Number((dto as any).impressions || 0),
  };
}

function mapDtoToCalendarEvent(dto: SystemCalendarEventDTO): CalendarEvent {
  return {
    id: String(dto.id),
    leadId: dto.lead_id ? String(dto.lead_id) : null,
    title: String(dto.title || ''),
    leadName: String(dto.lead_name || ''),
    leadCompany: String(dto.lead_company || ''),
    dayName: String(dto.day_name || ''),
    date: String(dto.date || ''),
    time: String(dto.time || ''),
    type: (String(dto.type || 'zoom') as any) || 'zoom',
    location: String(dto.location || ''),
    participants: dto.participants == null ? undefined : Number(dto.participants),
    reminders: dto.reminders ?? undefined,
    postMeeting: dto.post_meeting ?? undefined,
  } as any;
}

export default function SystemWorkspaceClient({
  orgSlug,
  initialLeads,
  initialEvents,
  initialTasks,
  initialCampaigns,
  initialNotifications,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialEvents: SystemCalendarEventDTO[];
  initialTasks: NexusTask[];
  initialCampaigns: WorkspaceCampaignDTO[];
  initialNotifications: SystemNotificationDTO[];
}) {
  const router = useRouter();
  const { addToast } = useToast();

  const basePath = useMemo(() => `/w/${encodeURIComponent(orgSlug)}/system`, [orgSlug]);

  const [leadsDto, setLeadsDto] = useState<SystemLeadDTO[]>(initialLeads);
  const [events, setEvents] = useState<CalendarEvent[]>(() => (initialEvents || []).map(mapDtoToCalendarEvent));
  const [tasks, setTasks] = useState<Task[]>(() => (initialTasks || []).map(mapNexusTaskToUiTask));

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
    } catch (e: any) {
      addToast(e?.message || 'שגיאה ביצירת ליד', 'error');
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
      nextActionDate: params.nextActionDate ? params.nextActionDate.toISOString() : params.nextActionDate === null ? null : undefined,
      nextActionNote: params.nextActionNote ?? undefined,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה בעדכון ליד', 'error');
      return;
    }

    setLeadsDto((prev) => prev.map((l) => (String(l.id) === String(res.lead.id) ? res.lead : l)));
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
      participants: (event as any).participants ?? null,
      reminders: (event as any).reminders ?? null,
      postMeeting: (event as any).postMeeting ?? null,
    });

    if (!res.ok) {
      addToast(res.message || 'שגיאה ביצירת אירוע', 'error');
      return;
    }

    setEvents((prev) => [mapDtoToCalendarEvent(res.event), ...prev]);
    addToast('האירוע נשמר', 'success');
  };

  const handleUpdateTask = async (task: Task) => {
    try {
      const updated = await updateNexusTaskByOrgSlug({
        orgSlug,
        taskId: String(task.id),
        updates: {
          title: task.title,
          description: task.description ?? '',
          assigneeId: task.assigneeId,
          assigneeIds: [task.assigneeId],
          dueDate: task.dueDate.toISOString().slice(0, 10),
          priority: task.priority,
          status: task.status,
          tags: task.tags,
        } as any,
      });

      const next = mapNexusTaskToUiTask(updated);
      setTasks((prev) => prev.map((t) => (String(t.id) === String(next.id) ? next : t)));
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בעדכון משימה', 'error');
    }
  };

  const handleAddTask = async (task: Task) => {
    try {
      const created = await createNexusTaskByOrgSlug({
        orgSlug,
        input: {
          title: task.title,
          description: task.description ?? '',
          status: task.status,
          priority: task.priority,
          assigneeId: task.assigneeId,
          assigneeIds: [task.assigneeId],
          tags: task.tags,
          dueDate: task.dueDate.toISOString().slice(0, 10),
          timeSpent: 0,
          isTimerRunning: false,
          messages: [],
          createdAt: new Date().toISOString(),
        } as any,
      });

      const next = mapNexusTaskToUiTask(created);
      setTasks((prev) => [next, ...prev]);
    } catch (e: any) {
      addToast(e?.message || 'שגיאה ביצירת משימה', 'error');
      return;
    }
  };

  return (
    <>
      <WorkspaceHub
        leads={leads}
        content={[]}
        students={[]}
        campaigns={campaigns}
        tasks={tasks}
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
          navigateToTab('tasks');
        }}
        onAddEvent={(event) => void handleAddEvent(event)}
        onNewMeetingClick={() => {
          setMeetingPreselectLeadId('');
          setShowNewMeetingModal(true);
        }}
        onAddActivity={(leadId, activity) => void handleAddActivity(leadId, activity)}
        onUpdateTask={(task) => void handleUpdateTask(task)}
        onAddTask={(task) => void handleAddTask(task)}
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
