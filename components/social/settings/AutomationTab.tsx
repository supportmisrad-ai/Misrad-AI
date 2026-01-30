'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, MessageCircle, Mail, Bot, ShieldAlert, Lock, Trash2, Plus } from 'lucide-react';
import { AutomationRule } from '@/types/social';

interface AutomationTabProps {
}

const CustomToggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onToggle(); }}
    className={`relative w-14 h-7 rounded-full transition-all duration-500 focus:outline-none shadow-inner flex items-center px-1 overflow-hidden shrink-0 ${enabled ? 'bg-blue-600' : 'bg-slate-200'}`}
  >
    <motion.div
      animate={{ x: enabled ? 28 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className="w-5 h-5 bg-white rounded-full shadow-md z-10"
    />
  </button>
);

export default function AutomationTab({}: AutomationTabProps) {
  const [rules, setRules] = useState<AutomationRule[]>([]);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isEnabled: !r.isEnabled } : r));
  };

  const updateTrigger = (id: string, days: number) => {
    setRules(rules.map(r => r.id === id ? { ...r, triggerDays: days } : r));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">אוטומציות וגבייה</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl"><ShieldAlert size={24}/></div>
                <div>
                  <h3 className="text-xl font-black">שרשרת הסלמת גבייה</h3>
                  <p className="text-sm font-bold text-slate-400">הגדר מה קורה כשהלקוח לא משלם בזמן.</p>
                </div>
              </div>
              <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs flex items-center gap-2">
                <Plus size={16}/> הוסף חוק
              </button>
            </div>

            <div className="flex flex-col gap-6 relative">
            <div className="absolute top-0 bottom-0 right-10 w-1 bg-slate-100 rounded-full hidden md:block"></div>

              {rules.length === 0 ? (
                <div className="bg-slate-50 p-10 rounded-[32px] border border-slate-200 text-center">
                  <div className="text-sm font-black text-slate-700">אין חוקים מוגדרים</div>
                  <div className="text-xs font-bold text-slate-400 mt-2">כשתחבר גבייה אמיתית למערכת, כאן תגדיר את שרשרת ההסלמה.</div>
                </div>
              ) : (
                [...rules].sort((a,b) => a.triggerDays - b.triggerDays).map((rule) => (
                  <div key={rule.id} className="relative z-10 flex gap-6 md:pr-10">
                    <div className="w-full bg-slate-50 p-8 rounded-[32px] border-2 border-transparent hover:border-blue-100 hover:bg-white transition-all group flex flex-col md:flex-row items-center justify-between gap-8">
                      <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${rule.type === 'lockdown' ? 'bg-red-600 text-white' : rule.type === 'whatsapp' ? 'bg-green-50 text-green-600' : 'bg-blue-600 text-white'}`}>
                          {rule.type === 'whatsapp' ? <MessageCircle size={28}/> : rule.type === 'lockdown' ? <Lock size={28}/> : <Mail size={28}/>}
                        </div>
                        <div>
                          <h4 className="font-black text-lg text-slate-800">{rule.title}</h4>
                          <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-xs">{rule.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row items-center gap-8 w-full md:w-auto">
                        <div className="flex flex-col gap-2 w-full md:w-32">
                          <label className="text-[9px] font-black text-slate-400 uppercase text-center">ימי פיגור: {rule.triggerDays}</label>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={rule.triggerDays}
                            onChange={(e) => updateTrigger(rule.id, parseInt(e.target.value))}
                            className="accent-slate-900"
                          />
                        </div>
                        <CustomToggle enabled={rule.isEnabled} onToggle={() => toggleRule(rule.id)} />
                        <button className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={20}/>
                        </button>
                      </div>
                    </div>
                    <div className="absolute top-1/2 -right-2 w-5 h-5 bg-white border-4 border-slate-100 rounded-full hidden md:block -translate-y-1/2"></div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col gap-6 relative overflow-hidden">
            <h3 className="text-xl font-black flex items-center gap-3"><Bot size={24} className="text-blue-400"/> מנוע החלטות AI</h3>
            <p className="text-sm font-bold text-slate-400 leading-relaxed">
              ה-AI של Social מנתח את היסטוריית התשלומים ורמת התקשורת של הלקוח. הוא יכול להציע לדחות נעילת פורטל ללקוחות VIP בפיגור חד-פעמי.
            </p>
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
              <span className="text-xs font-black">חריגות חכמות (Smart Bypass)</span>
              <CustomToggle enabled={true} onToggle={() => {}} />
            </div>
          </div>

          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-6">
            <h3 className="text-lg font-black">סיכום אוטומציות החודש</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">תזכורות</p>
                <p className="text-2xl font-black text-slate-900">0</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase">נעילות</p>
                <p className="text-2xl font-black text-red-600">0</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 text-center">—</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

