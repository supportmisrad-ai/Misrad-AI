'use client';

import React, { useMemo, useState } from 'react';
import { markConnectOfferInterested } from '@/app/actions/connect-marketplace';
import { Phone, User, CheckCircle2, XCircle } from 'lucide-react';

export default function OfferInterestedClient({
  token,
  disabled,
}: {
  token: string;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSubmit = useMemo(() => {
    if (disabled) return false;
    if (!fullName.trim()) return false;
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length < 9) return false;
    return true;
  }, [disabled, fullName, phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await markConnectOfferInterested({
        token: String(token),
        interestedName: fullName.trim(),
        interestedPhone: phone.trim(),
      });

      if (!res.ok) {
        setError(res.message || 'שגיאה בשליחת הבקשה');
        return;
      }

      setSuccess(true);
      setIsOpen(false);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : String(e)) || 'שגיאה בשליחת הבקשה');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="text-emerald-700 mt-0.5" size={18} />
          <div>
            <div className="text-sm font-black text-emerald-900">הפרטים נשלחו</div>
            <div className="text-sm font-bold text-emerald-800 mt-1">
              הפרטים נשלחו לבעל הליד. הוא יצור איתך קשר בקרוב לאישור.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-3">
            <XCircle className="text-rose-700 mt-0.5" size={18} />
            <div className="text-sm font-bold text-rose-800">{error}</div>
          </div>
        </div>
      ) : null}

      {!isOpen ? (
        <button
          type="button"
          disabled={Boolean(disabled)}
          onClick={() => setIsOpen(true)}
          className="w-full inline-flex items-center justify-center rounded-2xl px-4 py-4 text-base font-black bg-slate-900 text-white disabled:opacity-50"
        >
          אני מעוניין / צור קשר
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="text-sm font-black text-slate-900">השאר פרטים</div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-1">שם מלא</label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 pr-9 py-3 text-sm font-bold text-slate-900 outline-none"
                placeholder="שם פרטי ומשפחה"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-slate-500 mb-1">טלפון</label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 pr-9 py-3 text-sm font-bold text-slate-900 outline-none"
                placeholder="050-1234567"
                required
                dir="ltr"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm font-black bg-white border border-slate-200 text-slate-800"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="rounded-2xl px-4 py-3 text-sm font-black bg-slate-900 text-white disabled:opacity-50"
            >
              {isSubmitting ? 'שולח...' : 'שלח'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
