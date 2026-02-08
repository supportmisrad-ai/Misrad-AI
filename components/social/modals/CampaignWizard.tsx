'use client';

import React, { useState } from 'react';
import { X, Target, Users, DollarSign, ChevronLeft, ChevronRight, Rocket } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { Avatar } from '@/components/Avatar';
import { openComingSoon } from '@/components/shared/coming-soon';

export default function CampaignWizard() {
  const { isCampaignWizardOpen, setIsCampaignWizardOpen, clients } = useApp();
  const [step, setStep] = useState(1);
  const [clientId, setClientId] = useState(clients[0]?.id || '');
  const [objective, setObjective] = useState('engagement');
  const [budget, setBudget] = useState(1000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isCampaignWizardOpen) return null;

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else {
      setIsSubmitting(true);
      openComingSoon();
      setIsSubmitting(false);
      setIsCampaignWizardOpen(false);
      setStep(1);
    }
  };

  const handleClose = () => {
    setIsCampaignWizardOpen(false);
    setStep(1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} dir="rtl">
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white w-full max-w-2xl rounded-[56px] shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-10 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl"><Rocket size={28}/></div>
            <h2 className="text-3xl font-black">הקמת קמפיין חדש</h2>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl"><X size={24}/></button>
        </div>

        <div className="p-10 flex-1 overflow-y-auto">
          <div className="flex justify-between mb-12 px-10 relative">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-black relative z-10 transition-all ${step >= s ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}>{s}</div>
            ))}
            <div className="absolute top-5 left-10 right-10 h-[2px] bg-slate-100 -z-0"></div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-8">
                <h3 className="text-2xl font-black text-center">מה המטרה המרכזית?</h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'awareness', label: 'חשיפה', desc: 'להגיע לכמה שיותר אנשים', icon: Users },
                    { id: 'engagement', label: 'מעורבות', desc: 'לייקים, תגובות ושיתופים', icon: Rocket },
                    { id: 'traffic', label: 'תנועה', desc: 'קליקים לאתר או לוואטסאפ', icon: Target },
                    { id: 'sales', label: 'מכירות', desc: 'המרות ישירות באתר', icon: DollarSign },
                  ].map(obj => (
                    <button key={obj.id} onClick={() => setObjective(obj.id)} className={`p-6 rounded-[32px] border-4 text-right transition-all group ${objective === obj.id ? 'border-purple-600 bg-purple-50' : 'border-slate-50 hover:border-purple-100'}`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${objective === obj.id ? 'bg-purple-600 text-white' : 'bg-slate-50 text-slate-400 group-hover:text-purple-600'}`}><obj.icon size={24}/></div>
                      <p className="font-black text-lg">{obj.label}</p>
                      <p className="text-xs font-bold text-slate-400">{obj.desc}</p>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-col gap-10">
                <h3 className="text-2xl font-black text-center">הגדרת תקציב ולקוח</h3>
                <div className="flex flex-col gap-6">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">בחר לקוח</label>
                  <div className="grid grid-cols-2 gap-4">
                    {clients.map(c => (
                      <button key={c.id} onClick={() => setClientId(c.id)} className={`p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${clientId === c.id ? 'border-purple-600 bg-white shadow-lg' : 'border-slate-100'}`}>
                        <Avatar
                          src={String(c.avatar || '')}
                          name={String(c.companyName || c.name || '')}
                          alt={String(c.companyName || '')}
                          size="lg"
                          rounded="lg"
                        />
                        <span className="font-bold text-sm">{c.companyName}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-6">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">תקציב חודשי (₪)</label>
                  <input type="range" min="500" max="10000" step="100" value={budget} onChange={e => setBudget(parseInt(e.target.value))} className="w-full accent-purple-600" />
                  <p className="text-center text-4xl font-black text-purple-600">₪{budget.toLocaleString()}</p>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-8 py-10">
                <div className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center">
                  <Rocket className="text-purple-600" size={48}/>
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black mb-4">מוכן להקמה!</h3>
                  <p className="text-slate-400 font-bold">הקמפיין יופעל ברגע שתאשר</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-10 border-t flex items-center justify-between bg-slate-50">
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black">
              <ChevronRight size={20}/> חזרה
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-purple-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl hover:bg-purple-700 transition-all flex items-center gap-3 ml-auto"
          >
            {isSubmitting ? 'מעבד...' : step === 3 ? 'הקמה' : 'הבא'}
            {!isSubmitting && step < 3 && <ChevronLeft size={20}/>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

