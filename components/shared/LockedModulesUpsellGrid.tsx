'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, MessageSquareText } from 'lucide-react';
import { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

interface LockedModulesUpsellGridProps {
  lockedModules: OSModuleKey[];
}

function getUpsellCopy(module: OSModuleKey): { title: string; message: string } {
  const def = modulesRegistry[module];

  if (module === 'nexus') {
    return {
      title: def.label,
      message: 'Nexus תמיד זמין בחבילה שלך.',
    };
  }

  if (module === 'system') {
    return {
      title: def.label,
      message: 'אל תיתן לאף ליד ליפול בין הכיסאות. שדרג ל"מרכז המכירות והלידים" והפוך את תהליך הסגירה שלך למדויק, מהיר ועקבי.',
    };
  }

  if (module === 'social') {
    return {
      title: def.label,
      message: 'מוכן להפוך למותג שכולם מדברים עליו? שדרג לחבילת שיווק ומיתוג והתחל לייצר שיווק שבונה סמכות ומביא לקוחות פרימיום באופן אוטומטי.',
    };
  }

  if (module === 'client') {
    return {
      title: def.label,
      message: 'רוצה לתת ללקוחות שלך חוויית VIP? שדרג ל"מעקב לקוחות ומתאמנים" והפוך כל שירות למוצר פרימיום שאי אפשר לעזוב.',
    };
  }

  if (module === 'finance') {
    return {
      title: def.label,
      message: 'רוצה לוודא שהכסף לא בורח מהצדדים? שדרג עכשיו ל"שליטה פיננסית מלאה"',
    };
  }

  return {
    title: def.label,
    message: 'המודול הזה לא כלול בחבילה שלך.',
  };
}

export default function LockedModulesUpsellGrid({ lockedModules }: LockedModulesUpsellGridProps) {
  const [locked, setLocked] = useState<OSModuleKey | null>(null);

  const copy = useMemo(() => {
    if (!locked) return null;
    return getUpsellCopy(locked);
  }, [locked]);

  const safeLockedModules = lockedModules.filter((m) => m !== 'nexus');
  if (!safeLockedModules.length) return null;

  return (
    <>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {safeLockedModules.map((key) => {
          const def = modulesRegistry[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => setLocked(key)}
              className="group relative rounded-3xl border border-white/70 bg-white/60 backdrop-blur p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.25)] transition-all overflow-hidden text-right"
            >
              <div className="absolute inset-0 opacity-100" style={{ background: 'radial-gradient(600px circle at 30% 10%, rgba(148,163,184,0.22), transparent 45%)' }} />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <OSModuleSquircleIcon moduleKey={key} boxSize={48} iconSize={20} disabled={true} className="opacity-70" />
                  <div>
                    <div className="font-black text-slate-500 text-lg flex items-center gap-2">
                      {def.label}
                      <Lock size={14} className="text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="text-slate-400 group-hover:text-slate-600 transition text-sm font-black">שדרוג</div>
              </div>
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {locked && copy ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLocked(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                    <Lock className="text-slate-600" size={18} />
                  </div>
                  <div>
                    <div className="font-black text-slate-900">{copy.title}</div>
                    <div className="text-xs text-slate-500">המודול הזה לא כלול בחבילה שלך</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLocked(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="סגור"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-sm text-slate-700 font-bold leading-relaxed">{copy.message}</div>

              <div className="flex gap-2 mt-5">
                <button
                  className="flex-1 h-11 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-2"
                  onClick={() => {
                    setLocked(null);
                    if (typeof window !== 'undefined') {
                      window.location.href = 'https://wa.me/972000000000?text=%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93%20%D7%A2%D7%9C%20%D7%94%D7%97%D7%91%D7%99%D7%9C%D7%94%20%D7%A9%D7%9C%D7%99';
                    }
                  }}
                >
                  אני רוצה לשמוע עוד <MessageSquareText size={16} />
                </button>
                <button className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-black" onClick={() => setLocked(null)}>
                  סגור
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
