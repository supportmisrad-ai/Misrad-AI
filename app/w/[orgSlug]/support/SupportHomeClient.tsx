'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, LifeBuoy, Mail, MessageSquare } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';
import { asObject, getErrorMessage } from '@/lib/shared/unknown';

type ModuleCard = {
  moduleKey: OSModuleKey;
  title: string;
  titleHe: string;
  accent: string;
  categories: Array<{ id: string; title: string }>;
  href: string;
};

type SearchArticle = {
  id: string;
  title: string;
  description: string;
  moduleKey: OSModuleKey;
  categoryId: string;
  tags: string[];
  href: string;
  moduleTitleHe: string;
  categoryTitle?: string;
};

type TicketRow = {
  id: string;
  ticket_number: string;
  subject: string;
  status: string;
  created_at: string;
  category: string;
};

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

function parseTicketRow(value: unknown): TicketRow | null {
  const obj = asObject(value);
  if (!obj) return null;
  const id = typeof obj.id === 'string' ? obj.id : String(obj.id ?? '');
  const ticket_number = typeof obj.ticket_number === 'string' ? obj.ticket_number : String(obj.ticket_number ?? '');
  const subject = typeof obj.subject === 'string' ? obj.subject : String(obj.subject ?? '');
  const status = typeof obj.status === 'string' ? obj.status : String(obj.status ?? '');
  const created_at = typeof obj.created_at === 'string' ? obj.created_at : String(obj.created_at ?? '');
  const category = typeof obj.category === 'string' ? obj.category : String(obj.category ?? '');
  if (!id || !ticket_number) return null;
  return { id, ticket_number, subject, status, created_at, category };
}

export function SupportHomeClient(props: {
  orgSlug: string;
  modules: ModuleCard[];
  articles: SearchArticle[];
}) {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  if (renderCountRef.current > 5) {
    console.warn('[SupportHomeClient] Excessive re-renders detected:', renderCountRef.current);
  }

  const [query, setQuery] = useState('');
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [formCategory, setFormCategory] = useState('Tech');
  const [formSubject, setFormSubject] = useState('');
  const [formMessage, setFormMessage] = useState('');
  const [formScreenshotUrl, setFormScreenshotUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return [];
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const scored = props.articles
      .map((a) => {
        const hay = `${a.title} ${a.description} ${a.moduleTitleHe} ${(a.categoryTitle || '')} ${a.tags.join(' ')}`.toLowerCase();
        const score = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);

    return scored.slice(0, 12).map((x) => x.a);
  }, [normalized, props.articles]);

  useEffect(() => {
    let cancelled = false;
    const loadTickets = async () => {
      setTicketsLoading(true);
      try {
        const res = await fetch('/api/support', {
          headers: {
            'x-org-id': encodeURIComponent(props.orgSlug),
          },
          cache: 'no-store',
        });
        const raw: unknown = await res.json().catch(() => null);
        const payload = unwrapData(raw);
        const payloadObj = asObject(payload);
        const ticketsRaw = payloadObj?.tickets;
        const rows = Array.isArray(ticketsRaw) ? ticketsRaw : [];
        const parsed = rows.map(parseTicketRow).filter((v): v is TicketRow => Boolean(v));
        if (!cancelled) setTickets(parsed);
      } catch {
        if (!cancelled) setTickets([]);
      } finally {
        if (!cancelled) setTicketsLoading(false);
      }
    };

    loadTickets();
    return () => {
      cancelled = true;
    };
  }, [props.orgSlug]);

  const statusConfig = useCallback((status: string) => {
    switch (status) {
      case 'open':
        return { label: 'פתוח', className: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'in_progress':
        return { label: 'בטיפול', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'waiting_for_customer':
        return { label: 'ממתין להשלמה', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'resolved':
        return { label: 'נפתר', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'closed':
        return { label: 'סגור', className: 'bg-slate-100 text-slate-600 border-slate-200' }; 
      default:
        return { label: status, className: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
  }, []);

  const handleSubmitTicket = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formSubject.trim() || !formMessage.trim()) {
      setFormError('חסר כותרת או תיאור. מלא ונסה שוב.');
      return;
    }

    if (!formScreenshotUrl.trim() && formMessage.trim().length < 120) {
      setFormError('או תצרף צילום מסך, או תכתוב תיאור מפורט (לפחות 120 תווים).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-org-id': encodeURIComponent(props.orgSlug),
        },
        body: JSON.stringify({
          category: formCategory,
          subject: formSubject.trim(),
          message: formMessage.trim(),
          screenshot_url: formScreenshotUrl.trim() || undefined,
          priority: 'medium',
        }),
      });

      const raw = await res.json().catch(() => ({}));
      const payload = unwrapData(raw);
      if (!res.ok) {
        throw new Error(getPayloadError(payload) || 'שגיאה ביצירת קריאה');
      }

      const ticketObj = asObject(asObject(payload)?.ticket);
      const ticketNumber = typeof ticketObj?.ticket_number === 'string' ? ticketObj.ticket_number : String(ticketObj?.ticket_number ?? '');
      setFormSuccess(ticketNumber ? `הדיווח התקבל (#${ticketNumber})` : 'הדיווח התקבל');
      setFormSubject('');
      setFormMessage('');
      setFormScreenshotUrl('');
      const parsedTicket = parseTicketRow(ticketObj);
      setTickets((prev) => [
        ...(parsedTicket ? [parsedTicket] : []),
        ...prev,
      ].filter(Boolean));
    } catch (error: unknown) {
      setFormError(getErrorMessage(error) || 'שגיאה ביצירת קריאה');
    } finally {
      setIsSubmitting(false);
    }
  }, [props.orgSlug, formCategory, formSubject, formMessage, formScreenshotUrl]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-[32px] border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_10px_50px_rgba(15,23,42,0.08)] p-6 md:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">
                תמיכה · Misrad AI
              </div>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900">מרכז דיווח תקלות</h1>
              <p className="text-sm md:text-base font-bold text-slate-600">קיבלנו. נבדוק ונחזור אליך תוך 24-48 שעות.</p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="#open-ticket"
                className="inline-flex items-center justify-center gap-3 rounded-3xl bg-slate-900 text-white px-8 py-4 text-base md:text-lg font-black shadow-lg hover:bg-slate-800 transition-colors"
              >
                <LifeBuoy size={20} />
                דיווח תקלה
              </a>
              <div className="text-xs font-bold text-slate-500 text-center">ככל שהדיווח מפורט יותר — כך נפתור מהר יותר</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6 md:p-8">
          <div className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">איך אפשר לעזור?</div>
          <div className="mt-2 text-sm md:text-base font-bold text-slate-600">חפש מאמר, או היכנס למודול כדי להתחיל.</div>

          <div className="mt-6">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <Search size={18} />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש (למשל: חשבונית, משלוחים, נוכחות...)"
                className="w-full h-14 md:h-16 rounded-3xl border border-slate-200 bg-white px-12 md:px-14 text-base md:text-lg font-bold outline-none focus:ring-4 ring-slate-100"
              />
            </div>

            {normalized ? (
              <div className="mt-4">
                {results.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.map((r) => (
                      <Link
                        key={`${r.moduleKey}/${r.id}`}
                        href={r.href}
                        className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900 truncate">{r.title}</div>
                            <div className="mt-1 text-xs font-bold text-slate-600 line-clamp-2">{r.description}</div>
                            <div className="mt-2 text-[11px] font-black text-slate-500">
                              {r.moduleTitleHe}
                              {r.categoryTitle ? <span className="text-slate-300"> · </span> : null}
                              {r.categoryTitle ? r.categoryTitle : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    לא נמצאו תוצאות.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-black text-slate-900">מודולים</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.modules.map((m) => (
              <Link
                key={m.moduleKey}
                href={m.href}
                className="group rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-5 hover:bg-white transition-colors"
              >
                <div className="h-1.5 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${m.accent}, rgba(15,23,42,0.08))` }} />
                <div className="mt-4">
                  <div className="text-lg font-black text-slate-900">{m.title}</div>
                  <div className="text-sm font-bold text-slate-600 mt-1">{m.titleHe}</div>
                </div>

                {m.categories.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {m.categories.slice(0, 3).map((c) => (
                      <span key={c.id} className="text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        {c.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-xs font-bold text-slate-500">בקרוב: קטגוריות ומאמרים</div>
                )}

                <div className="mt-4 text-xs font-bold text-slate-500 group-hover:text-slate-600">פתח תיעוד</div>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div id="open-ticket" className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                <MessageSquare size={20} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">דיווח תקלה</div>
                <div className="text-xs font-bold text-slate-500">הדיווח נכנס לתור בדיקה. זמן מענה משוער: 24-48 שעות.</div>
              </div>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ id: 'Tech', label: 'טכני' }, { id: 'Account', label: 'חשבון' }, { id: 'Billing', label: 'חיוב' }, { id: 'Feature', label: 'פיצ׳ר' }].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormCategory(cat.id)}
                    className={`px-3 py-2 rounded-2xl border text-xs font-black transition-all ${
                      formCategory === cat.id
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
              <input
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="כותרת קצרה וברורה (מה התקלה)"
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
              <input
                value={formScreenshotUrl}
                onChange={(e) => setFormScreenshotUrl(e.target.value)}
                placeholder="קישור לצילום מסך (מומלץ)"
                className="w-full h-12 px-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-bold outline-none focus:ring-2 focus:ring-slate-200"
              />
              <textarea
                value={formMessage}
                onChange={(e) => setFormMessage(e.target.value)}
                placeholder="תיאור מפורט: מה עשית, מה ציפית שיקרה, מה קרה בפועל, מתי זה קרה, ובאיזה מסך."
                className="w-full min-h-[140px] p-4 rounded-2xl border border-slate-200 bg-white text-slate-900 font-medium outline-none focus:ring-2 focus:ring-slate-200 resize-none"
              />
              {formError ? <div className="text-sm font-bold text-rose-600">{formError}</div> : null}
              {formSuccess ? <div className="text-sm font-bold text-emerald-600">{formSuccess}</div> : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? 'שולח…' : 'שלח דיווח'}
              </button>
            </form>
          </div>

          <div id="my-tickets" className="rounded-3xl border border-white/60 bg-white/80 backdrop-blur-2xl shadow-[0_8px_40px_rgba(15,23,42,0.08)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xl font-black text-slate-900">הדיווחים שלי</div>
                <div className="text-xs font-bold text-slate-500">מעקב מסודר אחר סטטוס ועדכונים.</div>
              </div>
              <Mail size={18} className="text-slate-400" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="grid grid-cols-[120px_1fr_120px_140px] gap-2 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-500">
                <div>מספר</div>
                <div>נושא</div>
                <div>סטטוס</div>
                <div>נוצר</div>
              </div>
              <div className="divide-y divide-slate-100">
                {ticketsLoading ? (
                  <div className="px-4 py-6 text-sm font-bold text-slate-500">טוען קריאות…</div>
                ) : tickets.length ? (
                  tickets.map((t) => {
                    const status = statusConfig(t.status);
                    return (
                      <Link
                        key={t.id}
                        href={`/w/${encodeURIComponent(props.orgSlug)}/support/tickets/${encodeURIComponent(t.id)}`}
                        className="grid grid-cols-[120px_1fr_120px_140px] gap-2 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <div className="font-mono text-xs font-black text-slate-500">{t.ticket_number}</div>
                        <div className="font-bold text-slate-900 truncate">{t.subject}</div>
                        <div>
                          <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-black border ${status.className}`}>
                            {status.label}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-500">{new Date(t.created_at).toLocaleDateString('he-IL')}</div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-sm font-bold text-slate-500">אין דיווחים עדיין.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
          <div className="text-lg font-black text-slate-900">KB Videos</div>
          <div className="text-sm font-bold text-slate-500">גישה מהירה למדריכים שהטמענו בכל מודול.</div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {props.modules.map((m) => (
              <Link
                key={`kb-${m.moduleKey}`}
                href={m.href}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm font-black text-slate-900">{m.titleHe}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">סרטונים + מאמרים</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
