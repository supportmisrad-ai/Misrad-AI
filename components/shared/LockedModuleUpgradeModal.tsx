'use client';

import React, { useMemo } from 'react';
import { Lock, MessageSquareText, X } from 'lucide-react';
import { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';

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
      message: 'מוכן להפוך למותג שכולם מדברים עליו? שדרג למסלול "The Authority" והתחל לייצר שיווק שבונה סמכות ומביא לקוחות פרימיום באופן אוטומטי.',
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
  const copy = useMemo(() => {
    if (!module) return null;
    return getUpsellCopy(module);
  }, [module]);

  if (!module || !copy) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCloseAction}>
      <div
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
            onClick={onCloseAction}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
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
              onCloseAction();
              if (typeof window !== 'undefined') {
                window.location.href =
                  'https://wa.me/972000000000?text=%D7%90%D7%A0%D7%99%20%D7%A8%D7%95%D7%A6%D7%94%20%D7%9C%D7%A9%D7%9E%D7%95%D7%A2%20%D7%A2%D7%95%D7%93%20%D7%A2%D7%9C%20%D7%94%D7%97%D7%91%D7%99%D7%9C%D7%94%20%D7%A9%D7%9C%D7%99';
              }
            }}
          >
            אני רוצה לשמוע עוד <MessageSquareText size={16} />
          </button>
          <button className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-black" onClick={onCloseAction}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
