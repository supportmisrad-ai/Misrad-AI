'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Info, Globe } from 'lucide-react';
import { SocialPlatform } from '@/types/social';
import { PLATFORM_ICONS } from '../SocialIcons';
import { useApp, type SettingsSubView } from '@/contexts/AppContext';

export default function SocialConnectionsTab() {
  const { setSettingsSubView } = useApp();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-10" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-800">חיבורי רשתות (API)</h2>
      </div>
      <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl">
        <div className="flex items-start gap-4 mb-10 p-6 bg-blue-50 rounded-3xl border border-blue-100 text-blue-800">
          <Info className="shrink-0" size={24}/>
          <p className="text-sm font-bold leading-relaxed">
            כדי לפרסם בפועל היום בלי להיתקע באישורי Meta/LinkedIn/TikTok, הפרסום מתבצע דרך Make/Zapier.
            אתה מחבר שם את החשבונות, וכאן המערכת שולחת Webhook עם הפוסט לפרסום.
          </p>
        </div>

        <button
          onClick={() => setSettingsSubView('integrations' as SettingsSubView)}
          className="mb-8 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all"
          type="button"
        >
          פתח הגדרות Make / Zapier
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['facebook', 'instagram', 'linkedin', 'tiktok'].map(p => {
            const Icon = PLATFORM_ICONS[p as SocialPlatform] || Globe;
            return (
              <div key={p} className="p-8 bg-slate-50 rounded-[32px] border border-slate-200 flex items-center justify-between group">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-white rounded-2xl shadow-sm text-slate-400 group-hover:text-slate-900 transition-all"><Icon size={24}/></div>
                  <div>
                    <p className="font-black text-lg capitalize">{p}</p>
                    <p className="text-xs font-bold text-slate-400">פרסום דרך אוטומציה</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettingsSubView('integrations' as SettingsSubView)}
                  className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs"
                  type="button"
                >
                  הגדר
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

