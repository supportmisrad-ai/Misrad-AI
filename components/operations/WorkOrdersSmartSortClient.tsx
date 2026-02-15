'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

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

function formatStatus(status: string): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return { label: 'נפתח', className: 'bg-sky-50 text-sky-700 border border-sky-100' };
    case 'OPEN':
      return { label: 'פתוח', className: 'bg-blue-50 text-blue-700 border border-blue-100' };
    case 'IN_PROGRESS':
      return { label: 'בטיפול', className: 'bg-amber-50 text-amber-700 border border-amber-100' };
    case 'DONE':
      return { label: 'הושלם', className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
    default:
      return { label: status, className: 'bg-slate-50 text-slate-700 border border-slate-200' };
  }
}

function formatPriority(priority: string): { label: string; className: string } | null {
  switch (priority) {
    case 'HIGH':
      return { label: 'גבוה', className: 'bg-orange-50 text-orange-700 border border-orange-100' };
    case 'URGENT':
      return { label: 'דחוף', className: 'bg-rose-50 text-rose-700 border border-rose-100' };
    case 'CRITICAL':
      return { label: 'קריטי', className: 'bg-red-100 text-red-800 border border-red-200' };
    default:
      return null;
  }
}

function slaInfo(deadline: string | null): { label: string; className: string } | null {
  if (!deadline) return null;
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  if (isNaN(dl)) return null;
  const diff = dl - now;

  if (diff <= 0) return { label: 'חריגה מ-SLA', className: 'text-red-700 font-black' };

  const mins = Math.floor(diff / 60000);
  if (mins < 60) return { label: `${mins} דק׳ ל-SLA`, className: 'text-orange-700 font-bold' };

  const hours = Math.floor(mins / 60);
  if (hours < 24) return { label: `${hours} שעות ל-SLA`, className: 'text-amber-700 font-bold' };

  const days = Math.floor(hours / 24);
  return { label: `${days} ימים ל-SLA`, className: 'text-slate-600 font-bold' };
}

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
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sortByLocation}
            disabled={isSorting}
            className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black bg-white/80 border border-slate-200 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            סדר לפי מיקום
          </button>
          {mode === 'location' ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center rounded-2xl px-4 py-2 text-xs font-black bg-white/80 border border-slate-200 hover:bg-white transition-colors"
            >
              חזור
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {mode === 'location' && userPos ? (
            <div className="text-xs font-bold text-slate-500">מיקום פעיל</div>
          ) : null}
          <div className="text-xs font-bold text-slate-400">{workOrders.length} קריאות</div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        {/* ──── Mobile Cards ──── */}
        <div className="md:hidden space-y-3">
          {sorted.length ? (
            sorted.map((w) => {
              const statusBadge = formatStatus(w.status);
              const priorityBadge = formatPriority(w.priority);
              const sla = slaInfo(w.slaDeadline);
              const loc = locationLabel(w);
              return (
                <Link
                  key={w.id}
                  href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-black text-slate-900 truncate">{w.title}</div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={`${badgeCls} ${statusBadge.className}`}>{statusBadge.label}</span>
                        {priorityBadge ? <span className={`${badgeCls} ${priorityBadge.className}`}>{priorityBadge.label}</span> : null}
                        {w.categoryName ? <span className={`${badgeCls} bg-violet-50 text-violet-700 border border-violet-100`}>{w.categoryName}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {w.projectTitle ? <span>פרויקט: <b>{w.projectTitle}</b></span> : null}
                    {w.technicianLabel ? <span>טכנאי: <b>{w.technicianLabel}</b></span> : <span className="text-slate-400">ללא טכנאי</span>}
                    {loc ? <span>{loc}</span> : null}
                    {w.reporterName ? <span>מדווח: {w.reporterName}</span> : null}
                  </div>

                  {sla ? <div className={`mt-2 text-[11px] ${sla.className}`}>{sla.label}</div> : null}
                </Link>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">אין עדיין קריאות להצגה</div>
          )}
        </div>

        {/* ──── Desktop Table ──── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500">
                <th className="pb-3 font-bold">כותרת</th>
                <th className="pb-3 font-bold">סטטוס</th>
                <th className="pb-3 font-bold">דחיפות</th>
                <th className="pb-3 font-bold">קטגוריה</th>
                <th className="pb-3 font-bold">מיקום</th>
                <th className="pb-3 font-bold">טכנאי</th>
                <th className="pb-3 font-bold">SLA</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length ? (
                sorted.map((w) => {
                  const statusBadge = formatStatus(w.status);
                  const priorityBadge = formatPriority(w.priority);
                  const sla = slaInfo(w.slaDeadline);
                  const loc = locationLabel(w);
                  return (
                    <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="py-3 max-w-[260px]">
                        <Link href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`} className="hover:underline">
                          <div className="font-bold text-slate-900 truncate">{w.title}</div>
                          {w.projectTitle ? <div className="text-[11px] text-slate-500 truncate mt-0.5">{w.projectTitle}</div> : null}
                        </Link>
                      </td>
                      <td className="py-3">
                        <span className={`${badgeCls} ${statusBadge.className}`}>{statusBadge.label}</span>
                      </td>
                      <td className="py-3">
                        {priorityBadge ? (
                          <span className={`${badgeCls} ${priorityBadge.className}`}>{priorityBadge.label}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">רגיל</span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 text-xs">{w.categoryName || <span className="text-slate-400">—</span>}</td>
                      <td className="py-3 text-slate-600 text-xs max-w-[160px] truncate">{loc || <span className="text-slate-400">—</span>}</td>
                      <td className="py-3 text-slate-600 text-xs">{w.technicianLabel || <span className="text-slate-400">—</span>}</td>
                      <td className="py-3 text-xs">{sla ? <span className={sla.className}>{sla.label}</span> : <span className="text-slate-400">—</span>}</td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="py-6 text-sm text-slate-500" colSpan={7}>
                    אין עדיין קריאות להצגה
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
