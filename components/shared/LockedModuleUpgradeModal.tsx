'use client';

import React, { useMemo } from 'react';
import { Lock, MessageSquareText, X } from 'lucide-react';
import { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

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
      message: 'מוכן להפוך למותג שכולם מדברים עליו? שדרג לחבילת "שיווק ומיתוג" והתחל לייצר שיווק שבונה סמכות ומביא לקוחות פרימיום באופן אוטומטי.',
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

export function LockedModuleUpgradeModal({
  module,
  onCloseAction,
}: {
  module: OSModuleKey | null;
  onCloseAction: () => void;
}) {
  useBackButtonClose(!!module, onCloseAction);
  const copy = useMemo(() => {
    if (!module) return null;
    return getUpsellCopy(module);
  }, [module]);

  if (!module || !copy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={onCloseAction}>
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-6 text-center">
          <button
            type="button"
            onClick={onCloseAction}
            className="absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
          
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center mb-4 border border-white/20">
            <Lock className="text-white" size={28} />
          </div>
          
          <h3 className="text-xl font-black text-white">{copy.title}</h3>
          <p className="text-sm text-white/60 mt-1">מודול פרימיום</p>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-slate-600 leading-relaxed text-center mb-6">
            {copy.message}
          </p>

          <div className="flex flex-col gap-3">
            <button
              className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20"
              onClick={() => {
                onCloseAction();
                if (typeof window !== 'undefined') {
                  window.location.href =
                    'https://wa.me/972000000000?text=%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93%20%D7%A2%D7%9C%20%D7%94%D7%97%D7%91%D7%99%D7%9C%D7%94%20%D7%A9%D7%9C%D7%99';
                }
              }}
            >
              <MessageSquareText size={18} />
              אני רוצה לשמוע עוד
            </button>
            <button 
              className="w-full h-12 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors" 
              onClick={onCloseAction}
            >
              סגור
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
