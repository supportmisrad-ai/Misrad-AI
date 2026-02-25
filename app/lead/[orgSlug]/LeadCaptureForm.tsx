'use client';

import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LeadCaptureFormProps {
  orgSlug: string;
  orgName: string;
}

export default function LeadCaptureForm({ orgSlug, orgName }: LeadCaptureFormProps) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: '',
    _hp: '', // honeypot
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'sending') return;

    // Basic client-side validation
    if (!form.name.trim()) {
      setErrorMsg('נא להזין שם');
      setStatus('error');
      return;
    }
    if (!form.phone.trim()) {
      setErrorMsg('נא להזין טלפון');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      const res = await fetch('/api/lead-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgSlug,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          message: form.message.trim(),
          _hp: form._hp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(data.error || 'שגיאה בשליחת הטופס');
        setStatus('error');
        return;
      }

      setStatus('success');
    } catch {
      setErrorMsg('שגיאת תקשורת. נסה שוב.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-3">תודה רבה!</h1>
          <p className="text-slate-600 text-lg leading-relaxed">
            הפרטים שלך התקבלו בהצלחה.
            <br />
            ניצור איתך קשר בהקדם.
          </p>
          <div className="mt-8 text-xs text-slate-400">
            {orgName && <span>מופעל על ידי {orgName}</span>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
            <Send className="w-7 h-7 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">השאירו פרטים</h1>
          {orgName && (
            <p className="text-slate-500 mt-2 text-sm">{orgName}</p>
          )}
          <p className="text-slate-600 mt-1">נחזור אליכם בהקדם האפשרי</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl rounded-3xl border border-slate-200/70 shadow-xl shadow-slate-200/40 p-6 sm:p-8 space-y-5">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-bold text-slate-900 mb-1.5">
              שם מלא <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="ישראל ישראלי"
              required
              autoComplete="name"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-sm font-bold text-slate-900 mb-1.5">
              טלפון <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="050-1234567"
              required
              autoComplete="tel"
              dir="ltr"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all text-left"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-900 mb-1.5">
              אימייל
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all text-left"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-bold text-slate-900 mb-1.5">
              שם חברה
            </label>
            <input
              type="text"
              id="company"
              name="company"
              value={form.company}
              onChange={handleChange}
              placeholder="שם העסק או הארגון"
              autoComplete="organization"
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label htmlFor="message" className="block text-sm font-bold text-slate-900 mb-1.5">
              הודעה
            </label>
            <textarea
              id="message"
              name="message"
              value={form.message}
              onChange={handleChange}
              placeholder="ספרו לנו במה נוכל לעזור..."
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none transition-all resize-none"
            />
          </div>

          {/* Honeypot — invisible to users */}
          <input
            type="text"
            name="_hp"
            value={form._hp}
            onChange={handleChange}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0, width: 0 }}
          />

          {/* Error message */}
          {status === 'error' && errorMsg && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
          >
            {status === 'sending' ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                שליחה
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center leading-relaxed">
            הפרטים שלכם מאובטחים ולא יועברו לצד שלישי.
          </p>
        </form>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-400">
          <a href="https://misrad-ai.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors">
            Powered by MISRAD AI
          </a>
        </div>
      </div>
    </div>
  );
}
