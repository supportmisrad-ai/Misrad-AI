'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RefreshCw, ArrowRight } from 'lucide-react';

/**
 * System module error boundary.
 * Catches unhandled errors from any page within the System module
 * and shows a clear, branded error state with retry + back options.
 */
export default function SystemModuleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[System Module Error]', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]" dir="rtl">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">שגיאה בטעינת הדף</h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            לא הצלחנו לטעון את הנתונים. ייתכן שמדובר בבעיית חיבור זמנית.
          </p>
          {error.digest ? (
            <p className="text-xs font-mono text-slate-400 mt-1">
              קוד: {error.digest}
            </p>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-l from-[#A21D3C] to-[#3730A3] text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
            type="button"
          >
            <RefreshCw size={16} />
            נסה שוב
          </button>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
            type="button"
          >
            <ArrowRight size={16} />
            חזרה
          </button>
        </div>
      </div>
    </div>
  );
}
