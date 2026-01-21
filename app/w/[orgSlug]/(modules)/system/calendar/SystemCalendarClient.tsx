'use client';

import React, { useMemo, useState } from 'react';
import CalendarView from '@/components/system/system.os/components/CalendarView';
import NewMeetingModal from '@/components/system/NewMeetingModal';
import type { Lead, CalendarEvent } from '@/components/system/types';
import { createSystemCalendarEvent, type SystemCalendarEventDTO } from '@/app/actions/system-leads';
import { useToast } from '@/components/system/contexts/ToastContext';
import { mapDtoToLead } from '@/components/system/utils/mapDtoToLead';
import type { SystemLeadDTO } from '@/app/actions/system-leads';

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

export default function SystemCalendarClient({
  orgSlug,
  initialLeads,
  initialEvents,
}: {
  orgSlug: string;
  initialLeads: SystemLeadDTO[];
  initialEvents: SystemCalendarEventDTO[];
}) {
  const { addToast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>(() => initialEvents.map(mapDtoToCalendarEvent));
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [meetingPreselectLeadId, setMeetingPreselectLeadId] = useState<string>('');

  const leads = useMemo(() => initialLeads.map(mapDtoToLead), [initialLeads]);

  const leadsById = useMemo(() => {
    const m = new Map<string, Lead>();
    for (const l of leads) m.set(String(l.id), l);
    return m;
  }, [leads]);

  const handleAddEvent = async (event: CalendarEvent) => {
    const leadId = event.leadId ? String(event.leadId) : null;
    if (!leadId) {
      addToast('כדי לשמור אירוע חייבים לבחור ליד', 'warning');
      return;
    }

    const lead = leadsById.get(String(leadId));

    const res = await createSystemCalendarEvent({
      orgSlug,
      leadId,
      title: String(event.title || lead?.name || '').trim(),
      leadName: String(event.leadName || lead?.name || '').trim(),
      leadCompany: String(event.leadCompany || lead?.company || 'לקוח פרטי').trim(),
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

  return (
    <>
      <CalendarView
        leads={leads as any}
        events={events as any}
        onAddEvent={(event) => void handleAddEvent(event as any)}
        onNewMeetingClick={() => {
          setMeetingPreselectLeadId('');
          setShowNewMeetingModal(true);
        }}
      />

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
