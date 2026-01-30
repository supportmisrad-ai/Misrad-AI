'use client';

import React from 'react';
import { X, Zap, ArrowRight } from 'lucide-react';

export default function AiOutOfCreditsModal({
  open,
  onCloseAction,
  checkoutHref,
  outputsCount,
  savedHours,
}: {
  open: boolean;
  onCloseAction: () => void;
  checkoutHref: string;
  outputsCount: number;
  savedHours: number;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4" onClick={onCloseAction}>
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Zap className="text-indigo-600" size={18} />
            </div>
            <div>
              <div className="font-black text-slate-900">ה-AI שלך צריך דלק! 🚀</div>
              <div className="text-xs text-slate-500">כדי להמשיך לעבוד בלי לעצור</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseAction}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="סגור"
          >
            <X size={18} />
          </button>
        </div>

        <div className="text-sm text-slate-700 font-bold leading-relaxed">
          ניצלת את כל נקודות ה-AI שלך להחודש. כדי להמשיך לייצר פוסטים, לתמלל שיחות ולנתח נתונים בביצועי שיא,
          כדאי להטעין קרדיטים חדשים.
        </div>

        <div className="mt-4 text-[12px] text-slate-600 font-bold">
          הפקת עד כה {outputsCount} תוצרי AI שחסכו לך כ-{savedHours} שעות עבודה.
        </div>

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            className="flex-1 h-11 rounded-xl bg-slate-900 text-white font-black flex items-center justify-center gap-2"
            onClick={() => {
              onCloseAction();
              if (typeof window !== 'undefined') {
                window.location.href = checkoutHref;
              }
            }}
          >
            להטענת נקודות עכשיו <ArrowRight size={16} />
          </button>
          <button type="button" className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-black" onClick={onCloseAction}>
            סגור
          </button>
        </div>
      </div>
    </div>
  );
}
