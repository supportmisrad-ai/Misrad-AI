'use client';

import React, { useState } from 'react';
import { getPartnerPortalSummary, type PartnerPortalSummary } from '@/app/actions/partner-portal';

export default function PartnerPortalPageClient() {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PartnerPortalSummary | null>(null);

  const handleLoad = async () => {
    const code = referralCode.trim();
    if (!code) {
      setError('קוד שותף חובה');
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await getPartnerPortalSummary({ referralCode: code });
      if (!res.success || !res.data) {
        setError(res.error || 'שגיאה בטעינה');
        setData(null);
        return;
      }
      setData(res.data);
    } catch (e: any) {
      setError(e?.message || 'שגיאה בטעינה');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-black">פורטל שותפים</h1>
          <div className="text-sm text-slate-600 mt-2">הזן קוד שותף כדי לראות לקוחות וסיכום הכנסות.</div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <input
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder="קוד שותף"
              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400"
            />
            <button
              onClick={handleLoad}
              disabled={isLoading}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black px-5 py-3"
            >
              {isLoading ? 'טוען...' : 'הצג'}
            </button>
          </div>

          {error ? <div className="mt-4 text-sm text-red-500">{error}</div> : null}

          {data ? (
            <div className="mt-8 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">שותף</div>
                  <div className="mt-1 font-black text-slate-900">{data.partnerName}</div>
                  <div className="mt-1 text-xs text-slate-500">{data.referralCode}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">הכנסות (Paid)</div>
                  <div className="mt-1 font-black text-slate-900">₪{Number(data.paidRevenueTotal || 0).toLocaleString()}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">לקוחות</div>
                  <div className="mt-1 font-black text-slate-900">{data.organizations.length}</div>
                  <div className="mt-1 text-xs text-slate-500">הזמנות Paid: {data.paidOrdersCount}</div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-black">רשימת לקוחות</div>
                <div className="divide-y divide-slate-100">
                  {data.organizations.length ? (
                    data.organizations.map((org) => (
                      <div key={org.id} className="px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="font-black text-slate-900">{org.name}</div>
                          <div className="text-xs text-slate-500">{org.slug ? `/w/${org.slug}` : org.id}</div>
                        </div>
                        <div className="text-xs text-slate-500">{org.created_at ? new Date(org.created_at).toLocaleDateString('he-IL') : ''}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-6 text-sm text-slate-600">אין לקוחות משויכים עדיין.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
