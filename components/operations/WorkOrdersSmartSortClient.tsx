'use client';

import Link from 'next/link';
import { Plus, MapPin, ListFilter, LayoutGrid } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatWorkOrderStatus, formatPriority, slaLabel } from '@/lib/services/operations/format';

type WorkOrderRow = {
  id: string;
  title: string;
  projectTitle: string | null;
  status: string;
  priority: string;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
  categoryName: string | null;
  buildingName: string | null;
  floor: string | null;
  unit: string | null;
  reporterName: string | null;
  slaDeadline: string | null;
  createdAt: string;
};

function locationLabel(w: WorkOrderRow): string | null {
  const parts: string[] = [];
  if (w.buildingName) parts.push(w.buildingName);
  if (w.floor) parts.push(`קומה ${w.floor}`);
  if (w.unit) parts.push(`חדר ${w.unit}`);
  return parts.length ? parts.join(' · ') : null;
}

function toRad(v: number): number {
  return (v * Math.PI) / 180;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(lat1) * Math.cos(lat2) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

const badgeCls = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black';

export default function WorkOrdersSmartSortClient({
  baseHref,
  workOrders,
}: {
  baseHref: string;
  workOrders: WorkOrderRow[];
}) {
  const [mode, setMode] = useState<'default' | 'location'>('default');
  const [error, setError] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  const sorted = useMemo(() => {
    if (mode !== 'location' || !userPos) return workOrders;

    const withDist = workOrders.map((w) => {
      const distKm =
        w.installationLat !== null && w.installationLng !== null
          ? haversineKm(userPos, { lat: w.installationLat, lng: w.installationLng })
          : null;
      return { w, distKm };
    });

    withDist.sort((a, b) => {
      if (a.distKm === null && b.distKm === null) return 0;
      if (a.distKm === null) return 1;
      if (b.distKm === null) return -1;
      return a.distKm - b.distKm;
    });

    return withDist.map((x) => x.w);
  }, [mode, userPos, workOrders]);

  async function sortByLocation() {
    setError(null);
    if (!('geolocation' in navigator)) {
      setError('הדפדפן לא תומך במיקום');
      return;
    }

    setIsSorting(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });

      setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setMode('location');
    } catch (e: unknown) {
      const msg = e instanceof Error && e.message ? String(e.message) : 'לא הצלחנו לקבל מיקום. נא לאפשר הרשאת מיקום.';
      setError(msg);
    } finally {
      setIsSorting(false);
    }
  }

  function reset() {
    setMode('default');
    setError(null);
    setIsSorting(false);
    setUserPos(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white/40 backdrop-blur-md p-4 rounded-3xl border border-slate-200/50">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sortByLocation}
            disabled={isSorting}
            className={`inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-black transition-all duration-200 shadow-sm border ${
              mode === 'location'
                ? 'bg-sky-500 text-white border-sky-400 shadow-sky-200'
                : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            } disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
          >
            <MapPin size={16} className="ml-2" />
            סדר לפי מיקום
          </button>
          {mode === 'location' ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-2xl px-5 py-2.5 text-sm font-black bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
              ביטול
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/50 text-slate-500">
            <LayoutGrid size={14} />
            <span className="text-xs font-bold">{workOrders.length} קריאות</span>
          </div>
          {mode === 'location' && userPos && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold">מרחק פעיל</span>
            </div>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        {/* ──── Mobile Cards ──── */}
        <div className="md:hidden space-y-4">
          {sorted.length ? (
            sorted.map((w) => {
              const statusBadge = formatWorkOrderStatus(w.status);
              const priorityBadge = formatPriority(w.priority);
              const sla = slaLabel(w.slaDeadline);
              const loc = locationLabel(w);
              return (
                <Link
                  key={w.id}
                  href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`}
                  className="group block relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 hover:border-sky-200 hover:shadow-xl hover:shadow-sky-500/5 transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-black text-slate-900 leading-tight group-hover:text-sky-600 transition-colors truncate">{w.title}</div>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`${badgeCls} ${statusBadge.cls}`}>{statusBadge.label}</span>
                        {priorityBadge ? <span className={`${badgeCls} ${priorityBadge.cls}`}>{priorityBadge.label}</span> : null}
                        {w.categoryName ? <span className={`${badgeCls} bg-violet-50 text-violet-700 border border-violet-100 shadow-sm`}>{w.categoryName}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 text-xs text-slate-600">
                    {w.projectTitle ? (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">פרויקט:</span>
                        <span className="font-bold text-slate-700 truncate">{w.projectTitle}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">מיקום:</span>
                      <span className="font-bold text-slate-700 truncate">{loc || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">טכנאי:</span>
                      <span className={`font-bold ${w.technicianLabel ? 'text-slate-700' : 'text-orange-500 animate-pulse'}`}>
                        {w.technicianLabel || 'ממתין לשיוך'}
                      </span>
                    </div>
                  </div>

                  {sla && (
                    <div className={`mt-4 pt-3 border-t border-slate-50 flex items-center justify-between`}>
                       <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">זמן יעד</span>
                       <span className={`text-xs font-black ${sla.cls}`}>{sla.text}</span>
                    </div>
                  )}
                </Link>
              );
            })
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center animate-fade-in">
              <div className="text-sm font-bold text-slate-500">אין קריאות להצגה בסינון הנוכחי</div>
            </div>
          )}
        </div>

        {/* ──── Desktop Table ──── */}
        <div className="hidden md:block rounded-3xl border border-slate-100 bg-white shadow-xl shadow-slate-200/20 overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest">כותרת ופרויקט</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-center">סטטוס</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest text-center">דחיפות</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest">מיקום ומחלקה</th>
                <th className="px-4 py-4 text-xs font-black uppercase tracking-widest">טכנאי</th>
                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-left">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sorted.length ? (
                sorted.map((w) => {
                  const statusBadge = formatWorkOrderStatus(w.status);
                  const priorityBadge = formatPriority(w.priority);
                  const sla = slaLabel(w.slaDeadline);
                  const loc = locationLabel(w);
                  return (
                    <tr key={w.id} className="group hover:bg-sky-50/30 transition-all duration-150">
                      <td className="px-6 py-5 max-w-[300px]">
                        <Link href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`} className="block group/link">
                          <div className="font-black text-slate-900 leading-snug group-hover/link:text-sky-600 transition-colors truncate">{w.title}</div>
                          {w.projectTitle && <div className="text-[11px] font-bold text-slate-400 truncate mt-1">{w.projectTitle}</div>}
                        </Link>
                      </td>
                      <td className="px-4 py-5 text-center">
                        <span className={`${badgeCls} ${statusBadge.cls} shadow-sm px-3 py-1`}>{statusBadge.label}</span>
                      </td>
                      <td className="px-4 py-5 text-center">
                        {priorityBadge ? (
                          <span className={`${badgeCls} ${priorityBadge.cls} shadow-sm px-3 py-1`}>{priorityBadge.label}</span>
                        ) : (
                          <span className="text-slate-300 font-bold text-[11px] uppercase tracking-tighter">רגיל</span>
                        )}
                      </td>
                      <td className="px-4 py-5">
                         <div className="text-xs font-bold text-slate-700 truncate">{loc || '—'}</div>
                         {w.categoryName && <div className="text-[10px] font-black text-violet-500 mt-1 uppercase tracking-tight">{w.categoryName}</div>}
                      </td>
                      <td className="px-4 py-5">
                        {w.technicianLabel ? (
                          <div className="flex items-center gap-2">
                             <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 uppercase">
                               {w.technicianLabel.charAt(0)}
                             </div>
                             <span className="text-xs font-bold text-slate-700">{w.technicianLabel}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-orange-400 bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100 uppercase tracking-tight">ממתין לשיוך</span>
                        )}
                      </td>
                      <td className="px-6 py-5 text-left">
                        {sla ? (
                          <div className="inline-flex flex-col items-end">
                            <span className={`text-xs font-black ${sla.cls}`}>{sla.text}</span>
                            <div className="h-1 w-8 bg-slate-100 rounded-full mt-1 overflow-hidden">
                              <div className={`h-full rounded-full ${sla.cls.includes('red') ? 'bg-red-500' : 'bg-sky-500'}`} style={{ width: '60%' }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-6 py-12 text-center text-slate-400 font-bold italic" colSpan={6}>
                    אין קריאות שירות להצגה
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
