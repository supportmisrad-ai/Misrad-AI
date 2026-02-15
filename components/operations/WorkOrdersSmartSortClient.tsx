'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type WorkOrderRow = {
  id: string;
  title: string;
  projectTitle: string;
  status: string;
  technicianLabel: string | null;
  installationLat: number | null;
  installationLng: number | null;
};

function formatStatus(status: string): { label: string; className: string } {
  switch (status) {
    case 'NEW':
      return {
        label: 'נפתח',
        className: 'bg-sky-50 text-sky-700 border border-sky-100',
      };
    case 'IN_PROGRESS':
      return {
        label: 'בטיפול',
        className: 'bg-amber-50 text-amber-700 border border-amber-100',
      };
    case 'DONE':
      return {
        label: 'הושלם',
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      };
    default:
      return {
        label: status,
        className: 'bg-slate-50 text-slate-700 border border-slate-200',
      };
  }
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

        {mode === 'location' && userPos ? (
          <div className="text-xs font-bold text-slate-500">מיקום פעיל</div>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-4">
        <div className="md:hidden space-y-3">
          {sorted.length ? (
            sorted.map((w) => {
              const badge = formatStatus(w.status);
              return (
                <Link
                  key={w.id}
                  href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 truncate">{w.title}</div>
                      <div className="text-xs text-slate-500 mt-1 truncate">{w.projectTitle}</div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="mt-3 text-xs font-bold text-slate-600">טכנאי: {w.technicianLabel ? w.technicianLabel : '—'}</div>
                  {mode === 'location' ? (
                    <div className="mt-1 text-[11px] text-slate-500">{w.installationLat !== null && w.installationLng !== null ? 'כולל קואורדינטות' : 'ללא קואורדינטות'}</div>
                  ) : null}
                </Link>
              );
            })
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">אין עדיין קריאות להצגה</div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right text-slate-500">
                <th className="pb-3 font-bold">כותרת</th>
                <th className="pb-3 font-bold">פרויקט</th>
                <th className="pb-3 font-bold">סטטוס</th>
                <th className="pb-3 font-bold">טכנאי</th>
                {mode === 'location' ? <th className="pb-3 font-bold">מיקום</th> : null}
              </tr>
            </thead>
            <tbody>
              {sorted.length ? (
                sorted.map((w) => {
                  const badge = formatStatus(w.status);
                  return (
                    <tr key={w.id} className="border-t border-slate-100">
                      <td className="py-3 font-bold text-slate-900">
                        <Link href={`${baseHref}/work-orders/${encodeURIComponent(w.id)}`} className="hover:underline">
                          {w.title}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600">{w.projectTitle}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-black ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 text-slate-600">{w.technicianLabel ? w.technicianLabel : <span className="text-slate-400">—</span>}</td>
                      {mode === 'location' ? (
                        <td className="py-3 text-slate-600">
                          {w.installationLat !== null && w.installationLng !== null ? (
                            <span className="text-emerald-700 font-bold">✓</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              ) : (
                <tr className="border-t border-slate-100">
                  <td className="py-6 text-sm text-slate-500" colSpan={mode === 'location' ? 5 : 4}>
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
