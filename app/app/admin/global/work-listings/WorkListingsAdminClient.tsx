'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getAdminWorkListings } from '@/app/actions/work-listings';

type Row = {
  id: string;
  status: string;
  channel: string;
  title: string;
  targetGeo: string | null;
  price: string | null;
  interestedAt: string | null;
  interestedName: string | null;
  interestedPhone: string | null;
  createdAt: string;
  sourceOrgSlug: string;
};

function formatDate(dt: string | null) {
  if (!dt) return '—';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('he-IL');
}

function formatPrice(price: string | null) {
  if (!price) return '—';
  const n = Number(price);
  if (!Number.isFinite(n) || n <= 0) return '—';
  return `₪${n.toLocaleString('he-IL')}`;
}

export default function WorkListingsAdminClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getAdminWorkListings({ limit: 300 });
      if (!res.ok) {
        setError(res.message || 'שגיאה בטעינת הצעות עבודה');
        return;
      }
      setRows((res as any).listings || []);
    } catch (e: any) {
      setError(e?.message || 'שגיאה בטעינת הצעות עבודה');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const safeRows = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  if (isLoading) {
    return <div className="text-sm font-bold text-slate-600">טוען...</div>;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="text-sm font-black text-rose-900">שגיאה</div>
        <div className="text-sm font-bold text-rose-800 mt-1">{error}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-3 px-4 py-2 rounded-2xl bg-white border border-rose-200 text-rose-900 text-xs font-black"
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-slate-600">סה"כ הצעות: {safeRows.length}</div>
        <button
          type="button"
          onClick={() => void load()}
          className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-900 text-xs font-black"
        >
          רענן
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-sm" dir="rtl">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr className="text-right">
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">נוצר</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">סטטוס</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">ערוץ</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">כותרת</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">אזור</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">מחיר</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">מתעניין</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">מרחב עבודה</th>
              <th className="px-4 py-3 text-[11px] font-black text-slate-600">לינק</th>
            </tr>
          </thead>
          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-sm font-bold text-slate-500">
                  אין הצעות עבודה
                </td>
              </tr>
            ) : (
              safeRows.map((r) => {
                const publicUrl = `/marketplace/offer/${encodeURIComponent(String(r.id))}`;
                const interested = r.interestedAt ? `${String(r.interestedName || '—')} (${String(r.interestedPhone || '—')})` : '—';
                return (
                  <tr key={r.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 text-xs font-bold text-slate-700 whitespace-nowrap">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3 text-xs font-black text-slate-900">{String(r.status || '')}</td>
                    <td className="px-4 py-3 text-xs font-black text-slate-900">{String(r.channel || '')}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-800 min-w-[240px]">{String(r.title || '')}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{r.targetGeo ? String(r.targetGeo) : '—'}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{formatPrice(r.price)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-700">{interested}</td>
                    <td className="px-4 py-3 text-xs font-bold text-slate-600">{String(r.sourceOrgSlug || '')}</td>
                    <td className="px-4 py-3 text-xs font-black">
                      <a href={publicUrl} target="_blank" rel="noreferrer" className="text-indigo-700 hover:underline">
                        פתח
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
