'use client';

import React from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';

import type { OperationsDashboardData } from '@/app/actions/operations';

export function OperationsDashboard({
  orgSlug,
  initialData,
}: {
  orgSlug: string;
  initialData?: OperationsDashboardData;
}) {
  const base = `/w/${encodeURIComponent(orgSlug)}/operations`;
  const tourUrl = `/w/${encodeURIComponent(orgSlug)}/nexus?tour=1`;

  const [showTourPrompt, setShowTourPrompt] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `nexus_seen_tour_prompt_v1:operations:${encodeURIComponent(String(orgSlug))}`;
    try {
      const seen = window.localStorage.getItem(key);
      if (!seen) setShowTourPrompt(true);
    } catch {
      // ignore
    }
  }, [orgSlug]);

  const recentProjects = initialData?.recentProjects || [];
  const inventory = initialData?.inventorySummary;

  const inventoryStatus = React.useMemo(() => {
    const total = inventory?.total ?? 0;
    const pct = (value: number) => (total > 0 ? Math.round((value / total) * 100) : 0);
    return [
      { label: 'תקין', count: inventory?.ok ?? 0, value: pct(inventory?.ok ?? 0), colorClass: 'bg-emerald-500' },
      { label: 'נמוך', count: inventory?.low ?? 0, value: pct(inventory?.low ?? 0), colorClass: 'bg-amber-500' },
      { label: 'קריטי', count: inventory?.critical ?? 0, value: pct(inventory?.critical ?? 0), colorClass: 'bg-rose-500' },
    ];
  }, [inventory?.critical, inventory?.low, inventory?.ok, inventory?.total]);

  return (
    <div className="mx-auto w-full max-w-6xl">
      {showTourPrompt && (
        <div className="mb-6 rounded-[1.5rem] bg-white/80 backdrop-blur border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/15 shrink-0">
                <Compass size={18} />
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">חדש כאן?</div>
                <div className="text-xs text-slate-500 mt-1">סיור 30 שניות שמסביר איפה הדברים נמצאים במערכת.</div>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Link
                href={tourUrl}
                className="h-11 px-5 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-black transition-colors"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      const key = `nexus_seen_tour_prompt_v1:operations:${encodeURIComponent(String(orgSlug))}`;
                      window.localStorage.setItem(key, 'true');
                    }
                  } catch {
                    // ignore
                  }
                  setShowTourPrompt(false);
                }}
              >
                התחל סיור
              </Link>
              <button
                type="button"
                className="h-11 px-5 rounded-xl bg-white/70 border border-slate-200 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-900 transition-all"
                onClick={() => {
                  try {
                    if (typeof window !== 'undefined') {
                      const key = `nexus_seen_tour_prompt_v1:operations:${encodeURIComponent(String(orgSlug))}`;
                      window.localStorage.setItem(key, 'true');
                    }
                  } catch {
                    // ignore
                  }
                  setShowTourPrompt(false);
                }}
              >
                לא עכשיו
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">פרויקטים אחרונים</div>
                <div className="text-xs text-slate-500 mt-1">מתעדכן בזמן אמת מהמערכת</div>
              </div>
              <Link href={`${base}/projects`} className="text-xs font-bold text-slate-700 hover:underline">
                לכל הפרויקטים
              </Link>
            </div>
          </div>

          <div className="p-5">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right text-slate-500">
                    <th className="pb-3 font-bold">פרויקט</th>
                    <th className="pb-3 font-bold">סטטוס</th>
                    <th className="pb-3 font-bold">לקוח</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProjects.length ? (
                    recentProjects.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="py-3 font-bold text-slate-900">{p.title}</td>
                        <td className="py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black bg-sky-50 text-sky-700 border border-sky-100">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600">
                          {p.clientName ? p.clientName : <span className="text-slate-400">—</span>}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-t border-slate-100">
                      <td className="py-6 text-sm text-slate-500" colSpan={3}>
                        אין עדיין פרויקטים להצגה
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="bg-white/80 backdrop-blur rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black text-slate-900">סטטוס מלאי</div>
                <div className="text-xs text-slate-500 mt-1">סיכום לפי on_hand מול min_level</div>
              </div>
              <Link href={`${base}/inventory`} className="text-xs font-bold text-slate-700 hover:underline">
                למסך מלאי
              </Link>
            </div>
          </div>

          <div className="p-5">
            <div className="space-y-4">
              {inventoryStatus.map((s) => (
                <div key={s.label} className="flex items-center gap-4">
                  <div className="w-14 text-xs font-bold text-slate-600">{s.label}</div>
                  <div className="flex-1">
                    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div className={`h-3 ${s.colorClass}`} style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                  <div className="w-24 text-xs font-black text-slate-700 text-left">
                    {s.count} ({s.value}%)
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black text-slate-700">פעולה מומלצת</div>
              <div className="text-sm text-slate-600 mt-1">
                {inventory
                  ? `סה"כ ${inventory.total} פריטים במלאי: ${inventory.ok} תקין, ${inventory.low} נמוך, ${inventory.critical} קריטי.`
                  : 'טוען נתונים...'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
