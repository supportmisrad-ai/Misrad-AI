import type { CalendarEvent } from '@/components/system/types';
import type { SystemCalendarEventDTO } from '@/app/actions/system-leads';
import { asObject } from '@/lib/shared/unknown';

export function normalizeCalendarEventType(value: unknown): CalendarEvent['type'] {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'frontal') return 'frontal';
  if (v === 'group_session') return 'group_session';
  return 'zoom';
}

export function parseCalendarReminders(value: unknown): CalendarEvent['reminders'] | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;
  const whatsapp = obj.whatsapp;
  const sms = obj.sms;
  const email = obj.email;
  const timing = obj.timing;
  const timingStr = typeof timing === 'string' ? timing : '';
  const timingOk = timingStr === 'immediate' || timingStr === '1h_before' || timingStr === '24h_before';
  if (!timingOk) return undefined;
  return {
    whatsapp: Boolean(whatsapp),
    sms: Boolean(sms),
    email: Boolean(email),
    timing: timingStr,
  };
}

export function parseCalendarPostMeeting(value: unknown): CalendarEvent['postMeeting'] | undefined {
  const obj = asObject(value);
  if (!obj) return undefined;
  const enabledRaw = obj.enabled;
  const typeRaw = obj.type;
  const delayRaw = obj.delay;
  const channelRaw = obj.channel;
  const typeStr = typeof typeRaw === 'string' ? typeRaw : '';
  const typeOk = typeStr === 'thank_you' || typeStr === 'summary' || typeStr === 'proposal_link';
  if (!typeOk) return undefined;

  const delayStr = typeof delayRaw === 'string' ? delayRaw : '';
  const delayOk = delayStr === '1h_after' || delayStr === 'morning_after';
  if (!delayOk) return undefined;

  const channelStr = typeof channelRaw === 'string' ? channelRaw : '';
  const channelOk = channelStr === 'whatsapp' || channelStr === 'email';
  if (!channelOk) return undefined;

  return {
    enabled: Boolean(enabledRaw),
    type: typeStr,
    delay: delayStr,
    channel: channelStr,
  };
}

export function mapDtoToCalendarEvent(dto: SystemCalendarEventDTO): CalendarEvent {
  return {
    id: String(dto.id),
    leadId: dto.lead_id ? String(dto.lead_id) : null,
    title: String(dto.title || ''),
    leadName: String(dto.lead_name || ''),
    leadCompany: String(dto.lead_company || ''),
    dayName: String(dto.day_name || ''),
    date: String(dto.date || ''),
    time: String(dto.time || ''),
    type: normalizeCalendarEventType(dto.type),
    location: String(dto.location || ''),
    participants: dto.participants == null ? undefined : Number(dto.participants),
    reminders: parseCalendarReminders(dto.reminders) ?? undefined,
    postMeeting: parseCalendarPostMeeting(dto.post_meeting) ?? undefined,
  };
}
