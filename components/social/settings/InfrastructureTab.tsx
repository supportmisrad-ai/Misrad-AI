'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Key, ShieldCheck, RefreshCw, Loader2, Info, CheckCircle2 } from 'lucide-react';

interface InfrastructureTabProps {
  onNotify: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export default function InfrastructureTab({ onNotify }: InfrastructureTabProps) {
  const [apiKey, setApiKey] = useState('sk_live_••••••••••••••••••••••••');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      onNotify('מפתח התשתית נשמר בהצלחה! 💾');
    }, 1500);
  };

  const handleTest = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setStatus('connected');
      onNotify('החיבור לתשתית הסושיאל תקין ✅');
    }, 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">מפתח תשתית (Social API)</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="bg-white p-12 rounded-[56px] border border-slate-200 shadow-xl flex flex-col gap-10 relative overflow-hidden group">
            <div className="relative z-10 flex flex-col gap-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-xl"><Key size={28}/></div>
                  <div>
                    <h3 className="text-2xl font-black">הגדרות Social API Key</h3>
                    <p className="text-sm font-bold text-slate-400">זהו מפתח ה-API המרכזי המאפשר פרסום רב-ערוצי לכל הלקוחות.</p>
                  </div>
                </div>
                <div className={`px-4 py-1.5 rounded-full flex items-center gap-2 font-black text-[10px] uppercase ${status === 'connected' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {status === 'connected' ? 'מחובר לתשתית' : 'שגיאת חיבור'}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-4">מפתח תשתית (Infrastructure Key)</label>
                <div className="bg-slate-50 border-2 border-slate-100 rounded-[32px] p-6 flex items-center gap-4 focus-within:border-blue-500 transition-all group/input">
                  <Key className="text-slate-300 group-focus-within/input:text-slate-900 transition-colors" size={24}/>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="הזן מפתח API..."
                    className="bg-transparent outline-none flex-1 text-xl font-black tracking-widest text-slate-700"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-bold px-4">מומלץ להשתמש במפתחות בעלי הרשאות פרסום בלבד (Publish Only).</p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={20}/> : 'שמור הגדרות'}
                </button>
                <button
                  onClick={handleTest}
                  disabled={isTesting}
                  className="px-10 py-5 bg-slate-100 text-slate-600 rounded-[24px] font-black text-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isTesting ? <RefreshCw className="animate-spin" size={20}/> : 'בדיקת חיבור'}
                </button>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-[100px] opacity-50 -z-0"></div>
          </div>

          <div className="bg-blue-50 p-8 rounded-[48px] border border-blue-100 flex items-start gap-6 text-blue-900">
            <Info className="shrink-0 mt-1" size={24}/>
            <div className="flex flex-col gap-2">
              <h4 className="font-black text-lg">איך זה עובד?</h4>
              <p className="text-sm font-bold leading-relaxed opacity-80">
                מפתח התשתית מאפשר ל-Social להתממשק עם רשתות חברתיות. ברגע שהמפתח מוגדר, תוכל לחבר רשתות חברתיות ספציפיות לכל לקוח והמערכת תנהל את הזרמת התוכן ביניהם באופן אוטומטי ומאובטח.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-8">
          <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-6">
            <h3 className="text-xl font-black flex items-center gap-3"><ShieldCheck size={24} className="text-green-500"/> אבטחת מפתח</h3>
            <div className="flex flex-col gap-4">
              {[
                'הצפנת מפתח ב-Vault',
                'גישה מוגבלת לפי IP',
                'לוג פעולות מלא (Audit)',
                'התראות על חריגות שימוש'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-500"/>
                  <span className="text-xs font-bold text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 p-10 rounded-[48px] text-white shadow-2xl flex flex-col gap-6 relative overflow-hidden">
            <h3 className="text-lg font-black">סטטיסטיקת תשתית</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                <p className="text-[9px] font-black text-white/40 uppercase mb-1">זמן תגובה ממוצע (Latency)</p>
                <p className="text-2xl font-black">142ms</p>
              </div>
              <div className="bg-white/5 p-5 rounded-3xl border border-white/10">
                <p className="text-[9px] font-black text-white/40 uppercase mb-1">זמינות שירות (Uptime)</p>
                <p className="text-2xl font-black text-green-400">99.98%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

