import React from 'react';
import { Shield } from 'lucide-react';
import { getAdminGodView } from '@/app/actions/admin-godview';
import OrgImpersonateButton from './OrgImpersonateButton';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const res = await getAdminGodView();
  const data = res.success ? res.data ?? null : null;
  const kpis = data?.kpis || null;
  const recentOrgs = Array.isArray(data?.recentOrganizations) ? data.recentOrganizations : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  return (
    <div className="space-y-8 pb-24" dir="rtl">
      <div className="text-center max-w-3xl mx-auto">
        <div className="mb-6">
          <Shield size={48} className="mx-auto text-indigo-600/50 mb-4 md:hidden" />
          <Shield size={64} className="mx-auto text-indigo-600/50 mb-4 hidden md:block" />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
          דשבורד ניהול-על
        </h1>
        <p className="text-slate-600 text-base md:text-xl">God View - נתונים חיים מהמערכת</p>
      </div>

      {!res.success ? (
        <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
          <div className="text-slate-900 font-black">שגיאה בטעינת KPIs</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'שגיאה לא ידועה'}</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">סה"כ ארגונים</div>
              <div className="text-3xl font-black text-slate-900 mt-2">{Number(kpis?.totalOrganizations ?? 0).toLocaleString('he-IL')}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">סה"כ משתמשים (Profiles)</div>
              <div className="text-3xl font-black text-slate-900 mt-2">{Number(kpis?.totalProfiles ?? 0).toLocaleString('he-IL')}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">הכנסה חודשית (Paid)</div>
              <div className="text-3xl font-black text-slate-900 mt-2">₪{Number(kpis?.revenuePaidThisMonth ?? 0).toLocaleString('he-IL')}</div>
          </div>
          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">שימוש AI היום</div>
              <div className="text-3xl font-black text-slate-900 mt-2">{Math.round(Number(kpis?.aiCreditsUsedTodayCents ?? 0) / 100).toLocaleString('he-IL')}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">בקרדיטים (cents/100)</div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
              <div className="text-sm font-black text-slate-800">ארגונים אחרונים</div>
              <div className="text-xs font-bold text-slate-500 mt-1">5 ארגונים אחרונים שנרשמו</div>
            </div>

            <div className="md:hidden p-4">
              {recentOrgs.length === 0 ? (
                <div className="text-sm font-bold text-slate-600">אין ארגונים להצגה</div>
              ) : (
                <div className="space-y-3">
                  {recentOrgs.slice(0, 5).map((o: any) => (
                    <div key={String(o.id)} className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4">
                      <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                      <div className="mt-1 text-xs font-bold text-slate-600 truncate">slug: {o.slug ? String(o.slug) : '—'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-600 truncate">
                        נוצר: {o.createdAt ? new Date(String(o.createdAt)).toLocaleString('he-IL') : '—'}
                      </div>
                      <div className="mt-1 text-xs font-bold text-slate-600 truncate">סטטוס: {o.subscriptionStatus ? String(o.subscriptionStatus) : '—'}</div>
                      <div className="mt-3">
                        <OrgImpersonateButton orgSlug={o.slug ?? null} fallbackOrgId={String(o.id)} clientId={o.primaryClientId ?? null} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-right">
                <thead className="bg-white/80 border-b border-slate-200/70">
                  <tr>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">שם</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">Slug</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">נוצר</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">סטטוס</th>
                    <th className="px-4 py-3 text-xs font-black text-slate-600">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOrgs.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-sm font-bold text-slate-600" colSpan={5}>
                        אין ארגונים להצגה
                      </td>
                    </tr>
                  ) : (
                    recentOrgs.map((o: any) => (
                      <tr key={String(o.id)} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-black text-slate-900">{String(o.name || '')}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{o.slug ? String(o.slug) : <span className="text-slate-400">—</span>}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {o.createdAt ? new Date(String(o.createdAt)).toLocaleString('he-IL') : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{o.subscriptionStatus ? String(o.subscriptionStatus) : <span className="text-slate-400">—</span>}</td>
                        <td className="px-4 py-3 text-sm">
                          <OrgImpersonateButton orgSlug={o.slug ?? null} fallbackOrgId={String(o.id)} clientId={o.primaryClientId ?? null} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm">
              <div className="text-sm font-black text-slate-800">התראות מערכת</div>
              <div className="text-xs font-bold text-slate-500 mt-1">חריגות ותשלומים</div>
            </div>

            <div className="p-6">
              {alerts.length === 0 ? (
                <div className="text-sm font-bold text-slate-600">אין התראות כרגע</div>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 15).map((a: any, idx: number) => (
                    <div key={`${String(a.type)}-${idx}`} className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4">
                      <div className="text-sm font-black text-slate-900">{String(a.title || '')}</div>
                      <div className="text-xs font-bold text-slate-600 mt-1">{String(a.details || '')}</div>
                      {a.organizationSlug ? (
                        <div className="text-xs font-bold text-slate-400 mt-2">org: {String(a.organizationSlug)}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
