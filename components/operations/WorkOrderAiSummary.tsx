'use client';

import { useState } from 'react';

export default function WorkOrderAiSummary({
  orgSlug,
  workOrderId,
  initialSummary,
}: {
  orgSlug: string;
  workOrderId: string;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(orgSlug)}/operations/work-orders/${encodeURIComponent(workOrderId)}/ai-summary`,
        { method: 'POST' }
      );
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'שגיאה ביצירת סיכום');
      }

      setSummary(String(data.data?.summary || ''));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת סיכום');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500">
            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
          </svg>
          <span className="text-xs font-black text-slate-700">סיכום AI</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-black bg-violet-50 text-violet-700 border border-violet-100 hover:bg-violet-100 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              מייצר...
            </>
          ) : summary ? (
            'צור מחדש'
          ) : (
            'צור סיכום'
          )}
        </button>
      </div>

      {error ? (
        <div className="text-xs text-rose-600 font-bold bg-rose-50 rounded-lg px-3 py-2">{error}</div>
      ) : null}

      {summary ? (
        <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-violet-50/50 rounded-xl p-3 border border-violet-100">
          {summary}
        </div>
      ) : !isLoading ? (
        <div className="text-xs text-slate-400">לחץ ״צור סיכום״ כדי לקבל סיכום אוטומטי של הקריאה מבוסס AI.</div>
      ) : null}
    </div>
  );
}
