'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AttendanceReportsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AttendanceReports] render error:', error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-3xl py-16 text-center">
      <div className="mx-auto mb-6 w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center">
        <AlertTriangle size={32} className="text-rose-600" />
      </div>
      <h2 className="text-xl font-black text-slate-900 mb-2">שגיאה בטעינת דוחות נוכחות</h2>
      <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
        אירעה שגיאה בעת טעינת הדוחות. ייתכן שהנתונים עדיין לא זמינים או שיש בעיית חיבור.
      </p>
      {error.digest ? (
        <p className="text-xs text-slate-400 mb-4 font-mono">קוד: {error.digest}</p>
      ) : null}
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-500 text-white font-bold text-sm hover:bg-sky-600 transition shadow-sm"
      >
        <RefreshCw size={16} />
        נסה שוב
      </button>
    </div>
  );
}
