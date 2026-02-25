'use client';

import React, { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LifeBuoy, Send, ArrowRight, MessageCircle } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { getContentByKey } from '@/app/actions/site-content';
import { StyledDropdown } from '@/components/ui/StyledDropdown';
import { asObject } from '@/lib/shared/unknown';

function unwrapData(value: unknown): unknown {
  const obj = asObject(value);
  const data = obj?.data;
  if (data && typeof data === 'object') return data;
  return value;
}

function getStringProp(obj: Record<string, unknown> | null, key: string): string | null {
  if (!obj) return null;
  const v = obj[key];
  return typeof v === 'string' ? v : v == null ? null : String(v);
}

function SupportPageInner() {
  const searchParams = useSearchParams();
  const topic = searchParams?.get('topic') || '';

  let isClerkLoaded = false;
  let isSignedIn = false;
  try {
    const clerk = useUser();
    isClerkLoaded = clerk.isLoaded;
    isSignedIn = Boolean(clerk.isSignedIn);
  } catch {
    isClerkLoaded = true;
    isSignedIn = false;
  }

  const [backHref, setBackHref] = useState<string>('/');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string>('');

  React.useEffect(() => {
    if (!isClerkLoaded) return;
    if (!isSignedIn) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/workspaces', { cache: 'no-store' });
        if (!res.ok) return;
        const raw: unknown = await res.json().catch(() => null);
        const payload = unwrapData(raw);
        const payloadObj = asObject(payload);
        const workspaces = payloadObj?.workspaces;
        const first = Array.isArray(workspaces) && workspaces.length > 0 ? asObject(workspaces[0]) : null;
        const nextOrgId = getStringProp(first, 'slug') || getStringProp(first, 'id');
        if (!nextOrgId) return;
        const href = `/w/${encodeURIComponent(String(nextOrgId))}/client`;
        if (!cancelled) setBackHref(href);
        if (!cancelled) setOrgId(String(nextOrgId));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isClerkLoaded, isSignedIn]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
        const next = typeof res.data === 'string' ? res.data : '';
        if (!cancelled) setWhatsappGroupUrl(next);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const initial = useMemo(() => {
    if (topic === 'add-business') {
      return {
        category: 'Account',
        subject: 'בקשה להוספת עסק',
        message: 'שלום, אני רוצה להוסיף עסק נוסף לחשבון. נא ליצור עסק נוסף ולחבר אותו למשתמש שלי.\n\nשם העסק: \nטלפון: \nפרטים נוספים: ',
      };
    }

    return {
      category: 'Tech',
      subject: '',
      message: '',
    };
  }, [topic]);

  const [category, setCategory] = useState<string>(initial.category);
  const [subject, setSubject] = useState<string>(initial.subject);
  const [message, setMessage] = useState<string>(initial.message);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessId(null);

    if (!subject.trim() || !message.trim()) {
      setError('נא למלא כותרת ופירוט.');
      return;
    }

    if (message.trim().length < 120) {
      setError('נא לתאר את הבעיה בצורה מפורטת יותר (לפחות 120 תווים) כדי שנוכל לטפל בזה מהר.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(orgId ? { 'x-org-id': encodeURIComponent(String(orgId)) } : {}),
        },
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          message: message.trim(),
          priority: 'medium',
        }),
      });

      const raw: unknown = await res.json().catch(() => null);
      const payload = unwrapData(raw);
      if (!res.ok) {
        const msg =
          getStringProp(asObject(raw), 'error') ||
          getStringProp(asObject(payload), 'error') ||
          'שגיאה ביצירת קריאת תמיכה';
        throw new Error(msg);
      }

      const ticket = asObject(asObject(payload)?.ticket);
      const id = getStringProp(ticket, 'id') || getStringProp(ticket, 'ticket_number') || 'success';
      setSuccessId(id);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : String(err)) || 'שגיאה ביצירת קריאת תמיכה');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-gray-900" dir="rtl">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/70 backdrop-blur-xl border border-white/60 shadow-sm flex items-center justify-center">
              <LifeBuoy className="text-slate-700" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">תמיכה</h1>
              <p className="text-sm text-slate-500 font-medium">פתח קריאה ונחזור אליך בהקדם.</p>
            </div>
          </div>

          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-white/60 text-slate-700 font-bold hover:bg-white transition-all"
          >
            <ArrowRight size={16} />
            חזרה
          </Link>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
          {successId ? (
            <div className="space-y-3">
              <div className="text-lg font-black text-slate-900">תודה על הפידבק!</div>
              <div className="text-sm text-slate-600">הצוות קיבל את הבקשה והוא מטפל בזה בהקדם האפשרי.</div>
              <div className="text-sm text-slate-600">מספר/מזהה: {String(successId)}</div>

              {whatsappGroupUrl && whatsappGroupUrl.trim() ? (
                <div className="pt-2">
                  <a
                    href={whatsappGroupUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 font-black hover:bg-emerald-100 transition-all"
                  >
                    <MessageCircle size={16} />
                    הצטרפות לקבוצת תמיכה ועדכונים בוואטסאפ
                  </a>
                </div>
              ) : null}

              <div className="pt-2">
                <Link
                  href={backHref}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
                >
                  חזרה ל־Client
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">קטגוריה</label>
                <StyledDropdown
                  value={category}
                  onChange={setCategory}
                  options={[
                    { value: 'Tech', label: 'תמיכה טכנית' },
                    { value: 'Account', label: 'חשבון ופרטים' },
                    { value: 'Billing', label: 'חיוב ומנויים' },
                    { value: 'Feature', label: 'בקשת פיצ׳ר' }
                  ]}
                  variant="support"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">כותרת</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full h-11 px-4 rounded-2xl bg-white border border-gray-200 text-slate-900 font-bold outline-none focus:border-nexus-primary/30"
                  placeholder="במה נוכל לעזור?"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">פירוט</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full min-h-40 p-4 rounded-2xl bg-white border border-gray-200 text-slate-900 font-medium outline-none focus:border-nexus-primary/30 resize-none"
                  placeholder="תאר בדיוק מה צריך…"
                  required
                />
              </div>

              {error ? <div className="text-sm font-bold text-rose-600">{error}</div> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Send size={16} />
                {isSubmitting ? 'שולח…' : 'שלח לתמיכה'}
              </button>

              <div className="text-[11px] text-slate-500 font-medium">
                אם זו בקשה להוספת עסק, מומלץ לציין שם העסק ופרטי קשר.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SupportPage() {
  return (
    <Suspense>
      <SupportPageInner />
    </Suspense>
  );
}
