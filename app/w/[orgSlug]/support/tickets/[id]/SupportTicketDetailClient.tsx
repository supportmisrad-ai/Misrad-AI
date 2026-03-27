'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LifeBuoy } from 'lucide-react';

import { asObject, getErrorMessage } from '@/lib/shared/unknown';
import { getRoleLevel } from '@/lib/constants/roles';

function unwrapData(value: unknown): unknown {
  const obj = asObject(value);
  const data = obj?.data;
  if (data && typeof data === 'object') return data;
  return value;
}

function getPayloadError(value: unknown): string | null {
  const obj = asObject(value);
  const err = obj?.error;
  return typeof err === 'string' && err.trim() ? err : null;
}

function parseTicket(value: unknown): Ticket | null {
  const obj = asObject(value);
  if (!obj) return null;

  const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
  const ticket_number = typeof obj.ticket_number === 'string' ? obj.ticket_number : String(obj.ticket_number ?? '');
  if (!id || !ticket_number) return null;

  return {
    id,
    ticket_number,
    subject: typeof obj.subject === 'string' ? obj.subject : String(obj.subject ?? ''),
    message: typeof obj.message === 'string' ? obj.message : String(obj.message ?? ''),
    category: typeof obj.category === 'string' ? obj.category : String(obj.category ?? ''),
    status: typeof obj.status === 'string' ? obj.status : String(obj.status ?? ''),
    created_at: typeof obj.created_at === 'string' ? obj.created_at : String(obj.created_at ?? ''),
    sla_deadline: typeof obj.sla_deadline === 'string' ? obj.sla_deadline : undefined,
    first_response_at: typeof obj.first_response_at === 'string' ? obj.first_response_at : undefined,
    resolution_time_minutes:
      typeof obj.resolution_time_minutes === 'number' && Number.isFinite(obj.resolution_time_minutes)
        ? obj.resolution_time_minutes
        : undefined,
  };
}

function parseEventRow(value: unknown): EventRow | null {
  const obj = asObject(value);
  if (!obj) return null;
  const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
  if (!id) return null;
  const action = typeof obj.action === 'string' ? obj.action : String(obj.action ?? '');
  const created_at = typeof obj.created_at === 'string' ? obj.created_at : String(obj.created_at ?? '');
  const content = obj.content == null ? null : typeof obj.content === 'string' ? obj.content : String(obj.content);
  const metadata = asObject(obj.metadata) ?? undefined;
  return { id, action, created_at, content, metadata };
}

function getStringMeta(md: Record<string, unknown> | undefined, key: string): string {
  const v = md?.[key];
  return typeof v === 'string' ? v : String(v ?? '');
}

function formatStatusHe(s: string) {
  if (s === 'open') return 'פתוח';
  if (s === 'in_progress') return 'בטיפול';
  if (s === 'waiting_for_customer') return 'ממתין להשלמה';
  if (s === 'resolved') return 'נפתר';
  if (s === 'closed') return 'סגור';
  return s;
}

type Ticket = {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  created_at: string;
  sla_deadline?: string;
  first_response_at?: string;
  resolution_time_minutes?: number;
};

type EventRow = {
  id: string;
  action: string;
  created_at: string;
  content?: string | null;
  metadata?: Record<string, unknown>;
};

export function SupportTicketDetailClient(props: { orgSlug: string; ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/support?id=${encodeURIComponent(props.ticketId)}`, {
          headers: {
            'x-org-id': encodeURIComponent(props.orgSlug),
          },
          cache: 'no-store',
        });

        const raw: unknown = await res.json().catch(() => null);
        const payload = unwrapData(raw);

        if (!res.ok) {
          throw new Error(getPayloadError(payload) || 'שגיאה בטעינת הקריאה');
        }

        const parsed = parseTicket(payload);
        if (!cancelled) setTicket(parsed);
      } catch {
        if (!cancelled) setTicket(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [props.orgSlug, props.ticketId, reloadNonce]);

  useEffect(() => {
    let cancelled = false;

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const res = await fetch(`/api/support/${encodeURIComponent(props.ticketId)}/events`, {
          headers: {
            'x-org-id': encodeURIComponent(props.orgSlug),
          },
          cache: 'no-store',
        });
        const raw: unknown = await res.json().catch(() => null);
        const payload = unwrapData(raw);
        const obj = asObject(payload);
        const eventsRaw = obj?.events;
        const rows = Array.isArray(eventsRaw) ? eventsRaw : [];
        const parsed = rows.map(parseEventRow).filter((v): v is EventRow => Boolean(v));
        if (!cancelled) setEvents(parsed);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [props.orgSlug, props.ticketId, reloadNonce]);

  const timeline = useMemo(() => {
    return (events || []).map((ev) => {
      const md = ev?.metadata;
      const actor = getStringMeta(md, 'actor_name') || 'System';
      const ts = ev?.created_at ? new Date(String(ev.created_at)) : null;
      const when = ts && !Number.isNaN(ts.getTime()) ? ts.toLocaleString('he-IL') : '';

      if (ev.action === 'COMMENT') {
        const role = getStringMeta(md, 'role').toLowerCase();
        const isStaff = getRoleLevel(role) <= 5;
        const roleHe = isStaff ? 'צוות' : role === 'customer' ? 'מדווח' : 'משתמש';
        return {
          id: ev.id,
          dot: isStaff ? 'bg-emerald-600' : 'bg-slate-900',
          title: `${roleHe}: ${actor}`,
          subtitle: when,
          content: String(ev.content || ''),
        };
      }

      if (ev.action === 'created') {
        return { id: ev.id, dot: 'bg-slate-400', title: `${actor} פתח קריאה`, subtitle: when };
      }
      if (ev.action === 'status_changed') {
        const from = formatStatusHe(getStringMeta(md, 'from'));
        const to = formatStatusHe(getStringMeta(md, 'to'));
        return { id: ev.id, dot: 'bg-indigo-600', title: `${actor} שינה סטטוס`, subtitle: `${from} → ${to}${when ? ` · ${when}` : ''}` };
      }
      if (ev.action === 'admin_replied') {
        return { id: ev.id, dot: 'bg-emerald-600', title: `${actor} השיב`, subtitle: when };
      }
      if (ev.action === 'marked_read') {
        return { id: ev.id, dot: 'bg-slate-400', title: `${actor} סימן כנקרא`, subtitle: when };
      }
      return { id: ev.id, dot: 'bg-slate-400', title: `${actor} עדכן`, subtitle: when };
    });
  }, [events]);

  const submitComment = async () => {
    const text = commentText.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      const res = await fetch(`/api/support/${encodeURIComponent(props.ticketId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': encodeURIComponent(props.orgSlug),
        },
        body: JSON.stringify({ comment: text }),
      });
      const raw: unknown = await res.json().catch(() => null);
      const payload = unwrapData(raw);
      if (!res.ok) {
        throw new Error(getPayloadError(payload) || 'משהו השתבש, נסה שוב');
      }
      setCommentText('');
      setReloadNonce((x) => x + 1);
    } catch (error: unknown) {
      console.error('[support] submitComment failed', { message: getErrorMessage(error) });
    } finally {
      setCommentSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8">
        <div className="text-sm font-bold text-slate-500">טוען...</div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-8">
        <div className="text-lg font-black text-slate-900">לא מצאנו את הדיווח הזה</div>
        <div className="mt-2 text-sm font-bold text-slate-600">אולי נמחק, או שאין לך גישה אליו.</div>
      </div>
    );
  }

  const statusBadge = (() => {
    const s = String(ticket.status || 'open');
    if (s === 'open') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (s === 'in_progress') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (s === 'waiting_for_customer') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    if (s === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  })();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 space-y-6">
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-xs font-black text-slate-500 font-mono">{ticket.ticket_number}</div>
                <span className={`text-xs px-2 py-1 rounded-full font-black border ${statusBadge}`}>{formatStatusHe(String(ticket.status))}</span>
              </div>
              <h1 className="mt-2 text-2xl md:text-3xl font-black text-slate-900 tracking-tight">{ticket.subject}</h1>
              <div className="mt-2 text-sm font-bold text-slate-600">נפתח בתאריך {new Date(ticket.created_at).toLocaleString('he-IL')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0">
              <LifeBuoy size={18} />
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">הודעה</div>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 whitespace-pre-wrap">
              {ticket.message}
            </div>
          </div>

          <div className="mt-6">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">הוסף עדכון</div>
            <div className="mt-2">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="יש עוד פרטים שיעזרו לנו? (לוגים/צעדים/צילום מסך) תכתוב פה."
                className="w-full min-h-[120px] rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:ring-4 ring-slate-100 resize-none"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={commentSubmitting || !commentText.trim()}
                className="mt-3 w-full h-12 rounded-2xl bg-slate-900 text-white font-black disabled:opacity-60"
              >
                {commentSubmitting ? 'שולח…' : 'שלח עדכון'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-4">
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6 sticky top-6">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Timeline</div>
          <div className="mt-4 space-y-3">
            {eventsLoading ? (
              <div className="text-sm font-bold text-slate-500">טוען היסטוריה…</div>
            ) : timeline.length ? (
              timeline.map((t) => (
                <div key={t.id} className="flex items-start gap-3">
                  <div className={`mt-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm ${t.dot}`} />
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 leading-snug">{t.title}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500">{t.subtitle}</div>
                    {t.content ? (
                      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-800 whitespace-pre-wrap">
                        {t.content}
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm font-bold text-slate-500">אין אירועים עדיין.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
