'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, Send, CheckCircle2, User, CreditCard, LifeBuoy, FileText, Clock, MessageCircle, Compass, Video } from 'lucide-react';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Skeleton } from '@/components/ui/skeletons';

const CATEGORIES = [
  { id: 'Tech', label: 'תמיכה טכנית', icon: LifeBuoy, sla: 'עד שעתיים' },
  { id: 'Account', label: 'חשבון ופרטים', icon: User, sla: 'עד 4 שעות' },
  { id: 'Billing', label: 'חיוב ומנויים', icon: CreditCard, sla: 'עד יום עסקים' },
  { id: 'Feature', label: 'בקשת פיצ׳ר', icon: FileText, sla: 'עד 3 ימי עסקים' },
];

export function GlobalSupportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [category, setCategory] = useState('Tech');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = () => setIsOpen(true);
    window.addEventListener('os:open-support', handler);
    return () => window.removeEventListener('os:open-support', handler);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (step === 'success') {
      setTimeout(() => {
        setStep('form');
        setSubject('');
        setMessage('');
        setCategory('Tech');
        setTicketId('');
        setError(null);
      }, 300);
    }
  }, [step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const orgSlugFromPath = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;

      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(orgSlugFromPath ? { 'x-org-id': String(orgSlugFromPath) } : {}),
        },
        body: JSON.stringify({ category, subject, message, priority: 'medium' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = (errorData as { error?: string })?.error;
        throw new Error(errorMsg || 'שגיאה ביצירת קריאת תמיכה');
      }

      const data = await response.json().catch(() => ({}));
      const ticket = (data as { data?: { ticket?: { ticket_number?: string } } })?.data?.ticket;
      setTicketId(String(ticket?.ticket_number || ''));
      setStep('success');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת הקריאה. אנא נסה שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenHelpVideos = () => {
    try {
      window.dispatchEvent(new CustomEvent('os:open-help-videos'));
    } catch { /* ignore */ }
  };

  const activeCategory = CATEGORIES.find((c) => c.id === category);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black rounded-full hover:bg-gray-100 transition-colors z-10"
              type="button"
            >
              <X size={20} />
            </button>

            <AnimatePresence mode="wait">
              {step === 'form' ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-8 flex flex-col h-full overflow-y-auto custom-scrollbar"
                >
                  <div className="mb-6">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center mb-4">
                      <MessageSquare size={26} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900">פתיחת קריאת שירות</h2>
                    <p className="text-gray-500 mt-1 text-sm">הצוות שלנו זמין ויחזור אליך בהקדם האפשרי.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5 flex-1">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">נושא הפנייה</label>
                      <div className="grid grid-cols-2 gap-2">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => setCategory(cat.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                              category === cat.id
                                ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-100'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <cat.icon size={16} /> {cat.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-lg w-fit">
                        <Clock size={12} />
                        זמן מענה משוער: {activeCategory?.sla}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">כותרת</label>
                      <input
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-bold text-gray-900"
                        placeholder="במה נוכל לעזור?"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-2">פירוט</label>
                      <textarea
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all h-32 resize-none text-sm"
                        placeholder="תאר את הבקשה או הבעיה..."
                      />
                    </div>

                    {error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                          שולח...
                        </>
                      ) : (
                        <>
                          שלח פנייה <Send size={16} className="rotate-180" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <Video size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-slate-900">לפני שפותחים קריאה — כדאי לראות סרטון הדרכה</div>
                        <div className="mt-1 text-xs font-bold text-slate-600">בדרך כלל זה פותר את הבעיה תוך דקה וחוסך זמן לשני הצדדים.</div>
                        <button
                          type="button"
                          onClick={handleOpenHelpVideos}
                          className="mt-3 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm font-black hover:bg-slate-100 transition-colors"
                        >
                          <Video size={16} />
                          פתח סרטוני הדרכה
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-8 text-center flex flex-col items-center justify-center min-h-[400px]"
                >
                  <div className="w-20 h-20 bg-emerald-600 text-white rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-2xl font-black text-gray-900 mb-2">תודה על הפידבק!</h2>
                  <p className="text-gray-500 mb-6 max-w-xs">
                    הצוות קיבל את הבקשה והוא מטפל בזה בהקדם האפשרי.
                    <br />
                    מספר המעקב שלך הוא{' '}
                    <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">{ticketId}</span>.
                  </p>
                  <button
                    onClick={handleClose}
                    className="px-8 py-3 bg-gray-100 text-gray-900 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                    type="button"
                  >
                    סגור
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
