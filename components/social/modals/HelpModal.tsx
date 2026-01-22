'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, LifeBuoy, User, FileText, CreditCard, Send } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

type SupportSubject = 'technical' | 'account' | 'feature' | 'billing';

export default function HelpModal() {
  const { isHelpModalOpen, setIsHelpModalOpen, setIsTourActive, addToast } = useApp();
  const [subject, setSubject] = useState<SupportSubject>('technical');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isHelpModalOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !detail) return;
    
    setIsSending(true);
    setTimeout(() => {
      addToast('פנייתך התקבלה בהצלחה! מספר קריאה: #SR-4921');
      setIsSending(false);
      setIsHelpModalOpen(false);
      setTitle('');
      setDetail('');
    }, 1500);
  };

  const subjects = [
    { id: 'technical' as SupportSubject, label: 'תמיכה טכנית', icon: LifeBuoy },
    { id: 'account' as SupportSubject, label: 'חשבון ופרטים', icon: User },
    { id: 'feature' as SupportSubject, label: 'בקשת פיצ׳ר', icon: FileText },
    { id: 'billing' as SupportSubject, label: 'חיוב ומנויים', icon: CreditCard },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsHelpModalOpen(false)} dir="rtl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-lg rounded-[56px] shadow-2xl overflow-hidden flex flex-col relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={() => setIsHelpModalOpen(false)} className="absolute top-8 left-8 p-2 text-slate-300 hover:text-slate-900 transition-colors">
          <X size={24} />
        </button>

        <div className="p-10 flex flex-col items-center gap-8">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
            <MessageSquare size={32} />
          </div>

          <div className="text-center flex flex-col gap-2">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">פתיחת קריאת שירות</h2>
            <p className="text-slate-400 font-bold text-sm leading-relaxed max-w-[280px] mx-auto">הצוות שלנו זמין ויחזור אליך בהקדם האפשרי.</p>
          </div>

          <form onSubmit={handleSend} className="w-full flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">נושא הפנייה</label>
              <div className="grid grid-cols-2 gap-3">
                {subjects.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSubject(s.id)}
                    className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all group ${subject === s.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white hover:border-slate-200'}`}
                  >
                    <s.icon size={18} className={subject === s.id ? 'text-blue-600' : 'text-slate-400'} />
                    <span className="font-black text-xs">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">כותרת</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="תאר בקצרה את הבעיה..."
                className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 ring-blue-50 transition-all"
                required
              />
            </div>

            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">פירוט</label>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                placeholder="תאר את הבעיה בפירוט..."
                className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bold outline-none focus:ring-4 ring-blue-50 transition-all h-32 resize-none"
                required
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => { setIsHelpModalOpen(false); setIsTourActive(true); }}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black hover:bg-slate-200 transition-all"
              >
                הדרכת מערכת
              </button>
              <button
                type="submit"
                disabled={isSending || !title || !detail}
                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSending ? <>שולח...</> : <>שלח פנייה <Send size={18}/></>}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

