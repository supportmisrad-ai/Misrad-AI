'use client';

import React, { useEffect, useMemo, useState } from 'react';
import CalendarView from '@/components/system/system.os/components/CalendarView';
import NewMeetingModal from '@/components/system/NewMeetingModal';
import type { Lead, CalendarEvent } from '@/components/system/types';
import { createSystemCalendarEvent, getSystemCalendarEventsRange, type SystemCalendarEventDTO } from '@/app/actions/system-leads';
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
  const [focusDate, setFocusDate] = useState<Date>(() => new Date());
  const [range, setRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isLoadingRange, setIsLoadingRange] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [meetingPreselectLeadId, setMeetingPreselectLeadId] = useState<string>('');
  const [showNewEventModal, setShowNewEventModal] = useState(false);
  const [newEventLeadId, setNewEventLeadId] = useState<string>('');
  const [newEventTitle, setNewEventTitle] = useState<string>('');
  const [newEventDate, setNewEventDate] = useState<string>('');
  const [newEventTime, setNewEventTime] = useState<string>('');

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

  useEffect(() => {
    if (!range) return;

    let cancelled = false;
    (async () => {
      try {
        setIsLoadingRange(true);
        const rows = await getSystemCalendarEventsRange({
          orgSlug,
          from: range.from.toISOString(),
          to: range.to.toISOString(),
          take: 500,
        });
        if (cancelled) return;
        setEvents((rows || []).map(mapDtoToCalendarEvent));
      } catch (e: any) {
        if (cancelled) return;
        addToast(e?.message || 'שגיאה בטעינת אירועים', 'error');
      } finally {
        if (!cancelled) setIsLoadingRange(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addToast, orgSlug, range]);

  useEffect(() => {
    const onNewMeeting = () => {
      setMeetingPreselectLeadId('');
      setShowNewMeetingModal(true);
    };

    const onNewEvent = () => {
      setNewEventLeadId('');
      setNewEventTitle('');
      setNewEventDate('');
      setNewEventTime('');
      setShowNewEventModal(true);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('system:calendar:new-meeting', onNewMeeting as any);
      window.addEventListener('system:calendar:new-event', onNewEvent as any);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('system:calendar:new-meeting', onNewMeeting as any);
        window.removeEventListener('system:calendar:new-event', onNewEvent as any);
      }
    };
  }, []);

  const submitNewEvent = async () => {
    const leadId = String(newEventLeadId || '').trim();
    if (!leadId) {
      addToast('חובה לבחור ליד', 'warning');
      return;
    }
    if (!newEventDate.trim() || !newEventTime.trim()) {
      addToast('חובה להזין תאריך ושעה', 'warning');
      return;
    }

    const d = new Date(newEventDate);
    const dayName = d.toLocaleDateString('he-IL', { weekday: 'long' });
    const lead = leadsById.get(leadId);

    await handleAddEvent({
      id: `new_${Date.now()}`,
      leadId,
      title: newEventTitle.trim() || String(lead?.name || ''),
      leadName: String(lead?.name || ''),
      leadCompany: String((lead as any)?.company || 'לקוח פרטי'),
      dayName,
      date: newEventDate.trim(),
      time: newEventTime.trim(),
      type: 'zoom',
      location: '',
    } as any);

    setShowNewEventModal(false);
  };

  return (
    <>
      <CalendarView
        leads={leads as any}
        events={events as any}
        onAddEvent={(event) => void handleAddEvent(event as any)}
        focusDate={focusDate}
        onFocusDateChange={(d) => setFocusDate(d)}
        onRangeChange={(r) => setRange(r)}
        onNewMeetingClick={() => {
          setMeetingPreselectLeadId('');
          setShowNewMeetingModal(true);
        }}
      />

      {isLoadingRange ? (
        <div className="fixed bottom-6 left-6 z-[120] bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-2xl text-xs font-black shadow-lg">
          טוען אירועים...
        </div>
      ) : null}

      {showNewMeetingModal ? (
        <NewMeetingModal
          leads={leads}
          initialLeadId={meetingPreselectLeadId || undefined}
          onClose={() => setShowNewMeetingModal(false)}
          onSave={(meeting) => void handleAddEvent(meeting)}
        />
      ) : null}

      {showNewEventModal ? (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex justify-center items-end md:items-center p-4"
          onClick={() => setShowNewEventModal(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 bg-slate-50">
              <div className="text-lg font-black text-slate-900">אירוע חדש</div>
              <div className="text-xs font-bold text-slate-500">בחר ליד, תאריך ושעה</div>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <div className="text-[11px] font-black text-slate-500">ליד</div>
                <select
                  value={newEventLeadId}
                  onChange={(e) => setNewEventLeadId(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                >
                  <option value="">בחר ליד</option>
                  {leads.map((l) => (
                    <option key={String(l.id)} value={String(l.id)}>
                      {String(l.name || '')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">תאריך</div>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-black text-slate-500">שעה</div>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-black text-slate-500">כותרת (אופציונלי)</div>
                <input
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  placeholder="למשל: פולואפ"
                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowNewEventModal(false)}
                className="flex-1 bg-white border border-slate-200 text-slate-700 font-black py-3 rounded-2xl"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={() => void submitNewEvent()}
                className="flex-1 bg-slate-900 text-white font-black py-3 rounded-2xl"
              >
                שמור
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
