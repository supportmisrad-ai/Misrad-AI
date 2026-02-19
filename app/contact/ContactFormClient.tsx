'use client';

import React, { useState } from 'react';
import { Send, CheckCircle2, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactFormClient() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [formState, setFormState] = useState<FormState>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formState === 'submitting') return;

        setFormState('submitting');
        setErrorMessage('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
            });

            const data = await res.json();

            if (!res.ok) {
                setErrorMessage(data.error || 'שגיאה בשליחת ההודעה');
                setFormState('error');
                return;
            }

            setFormState('success');
            setName('');
            setEmail('');
            setMessage('');
        } catch {
            setErrorMessage('שגיאה בחיבור לשרת. נסה שוב.');
            setFormState('error');
        }
    };

    if (formState === 'success') {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                </div>
                <div className="text-xl font-black text-slate-900 mb-2">ההודעה נשלחה בהצלחה!</div>
                <p className="text-slate-600 text-sm mb-6">קיבלנו את הפנייה שלך ונחזור אליך בהקדם. שלחנו לך גם אישור במייל.</p>
                <button
                    type="button"
                    onClick={() => setFormState('idle')}
                    className="text-sm font-bold text-emerald-600 hover:text-emerald-700 underline underline-offset-4"
                >
                    שלח הודעה נוספת
                </button>
            </div>
        );
    }

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <input
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="שם מלא"
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
            />
            <input
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אימייל"
                required
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none dir-ltr"
            />
            <textarea
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="במה אפשר לעזור?"
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                className="w-full rounded-2xl bg-slate-50 border border-slate-200 px-5 py-4 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none resize-none"
            />

            {formState === 'error' && errorMessage && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-bold text-red-700">
                    {errorMessage}
                </div>
            )}

            <button
                type="submit"
                disabled={formState === 'submitting'}
                className="group w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black px-6 py-4 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {formState === 'submitting' ? (
                    <>
                        <Loader2 size={18} className="animate-spin" />
                        שולח...
                    </>
                ) : (
                    <>
                        <Send size={18} />
                        שלח הודעה
                    </>
                )}
            </button>
        </form>
    );
}
