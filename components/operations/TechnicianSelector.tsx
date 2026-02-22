'use client';

import { useState } from 'react';
import { CustomSelect } from '@/components/CustomSelect';

type TechnicianOption = { id: string; label: string };
type Suggestion = { technicianId: string; technicianName: string; reason: string };

export default function TechnicianSelector({
  orgSlug,
  technicians,
}: {
  orgSlug: string;
  technicians: TechnicianOption[];
}) {
  const [selectedId, setSelectedId] = useState('');
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function handleSuggest() {
    setIsLoading(true);
    setError(null);
    setSuggestion(null);
    setAccepted(false);

    try {
      const form = document.querySelector('form');
      const title = (form?.querySelector('[name="title"]') as HTMLInputElement)?.value || '';
      const description = (form?.querySelector('[name="description"]') as HTMLTextAreaElement)?.value || '';
      const categoryId = (form?.querySelector('[name="categoryId"]') as HTMLSelectElement)?.value || '';
      const buildingId = (form?.querySelector('[name="buildingId"]') as HTMLSelectElement)?.value || '';
      const priority = (form?.querySelector('[name="priority"]') as HTMLSelectElement)?.value || 'NORMAL';

      const res = await fetch(
        `/api/workspaces/${encodeURIComponent(orgSlug)}/operations/work-orders/suggest-technician`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description, categoryId: categoryId || null, buildingId: buildingId || null, priority }),
        }
      );
      const data = await res.json();

      if (!res.ok || !data?.success) throw new Error(data?.error || data?.message || 'שגיאה בהמלצת טכנאי');

      const s = data.data?.suggestion as Suggestion | null;
      if (s) setSuggestion(s);
      else setError(data.data?.reason || 'לא נמצאה המלצה');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setIsLoading(false);
    }
  }

  function handleAccept() {
    if (!suggestion) return;
    setSelectedId(suggestion.technicianId);
    setAccepted(true);
  }

  return (
    <div className="space-y-2">
      <label htmlFor="assignedTechnicianId" className="block text-xs font-semibold text-slate-500 mb-1.5">טכנאי מוקצה</label>
      <CustomSelect
        value={selectedId}
        onChange={(val) => { setSelectedId(val); setAccepted(false); }}
        placeholder="ללא שיוך"
        options={technicians.map((t) => ({ value: t.id, label: t.label }))}
      />

      {/* AI Suggestion */}
      <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-500">
              <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            <span className="text-[11px] font-black text-violet-700">שיבוץ חכם</span>
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="w-2.5 h-2.5 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
                בודק...
              </>
            ) : (
              'מי הכי מתאים?'
            )}
          </button>
        </div>

        {error ? <div className="text-[11px] text-rose-600 font-bold mt-1.5">{error}</div> : null}

        {suggestion ? (
          <div className="mt-2 flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border border-violet-100">
            <div className="min-w-0">
              <div className="text-xs font-black text-slate-900">{suggestion.technicianName}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{suggestion.reason}</div>
            </div>
            {!accepted ? (
              <button
                type="button"
                onClick={handleAccept}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                קבל
              </button>
            ) : (
              <span className="shrink-0 text-[10px] font-black text-emerald-600">✓ שוייך</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
