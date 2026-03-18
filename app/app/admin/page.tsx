import React from 'react';
import Link from 'next/link';
import { Building2, Globe, LifeBuoy, Server, Settings, Shield, BrainCircuit, Users, Smartphone, Fingerprint, type LucideIcon } from 'lucide-react';
import { getAdminGodView } from '@/app/actions/admin-godview';
import type { AdminGodViewRecentOrganization, AdminGodViewAlert } from '@/app/actions/admin-godview';
import OrgImpersonateButton from './OrgImpersonateButton';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

interface AreaCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  items: { label: string; href: string }[];
}

const AREA_CARDS: AreaCard[] = [
  {
    title: 'לקוחות',
    description: 'ארגונים · לקוחות עסקיים · גבייה',
    icon: Building2,
    href: '/app/admin/organizations',
    items: [
      { label: 'ניהול ארגונים', href: '/app/admin/organizations' },
      { label: 'לקוחות עסקיים', href: '/app/admin/business-clients' },
      { label: 'ניהול גבייה', href: '/app/admin/billing-management' },
      { label: 'הקמת לקוח', href: '/app/admin/setup-customer' },
    ],
  },
  {
    title: 'משתמשים',
    description: 'חשבונות · אישורים · התחזות',
    icon: Users,
    href: '/app/admin/global/users',
    items: [
      { label: 'כל המשתמשים', href: '/app/admin/global/users' },
      { label: 'אישורי משתמשים', href: '/app/admin/global/approvals' },
      { label: 'חשבונות מנויים', href: '/app/admin/users' },
    ],
  },
  {
    title: 'תמיכה',
    description: 'תקלות · בקשות · הודעות',
    icon: LifeBuoy,
    href: '/app/admin/client/support',
    items: [
      { label: 'דיווחי תקלות', href: '/app/admin/client/support' },
      { label: "בקשות פיצ'רים", href: '/app/admin/client/features' },
      { label: 'הודעות ללקוחות', href: '/app/admin/client/announcements' },
    ],
  },
  {
    title: 'מוצר',
    description: 'מודולים · בקרה · הגדרות',
    icon: Settings,
    href: '/app/admin/nexus/control',
    items: [
      { label: 'Nexus', href: '/app/admin/nexus/control' },
      { label: 'Social', href: '/app/admin/social' },
      { label: 'System', href: '/app/admin/system/control' },
      { label: 'Finance', href: '/app/admin/finance/control' },
    ],
  },
  {
    title: 'תוכן',
    description: 'נחיתה · מיילים · סרטונים',
    icon: Globe,
    href: '/app/admin/landing/pricing',
    items: [
      { label: 'דפי נחיתה', href: '/app/admin/landing/pricing' },
      { label: 'תמונות מיילים', href: '/app/admin/global/email-assets' },
      { label: 'סרטוני הדרכה', href: '/app/admin/global/help-videos' },
      { label: 'מרכז קישורים', href: '/app/admin/global/links' },
    ],
  },
  {
    title: 'מערכת',
    description: 'תשתית · לוגים · AI · דאטה',
    icon: Server,
    href: '/app/admin/global/control',
    items: [
      { label: 'בקרת פלטפורמה', href: '/app/admin/global/control' },
      { label: 'מתגי מערכת', href: '/app/admin/system-flags' },
      { label: 'ניהול AI', href: '/app/admin/ai' },
      { label: 'יומני אירועים', href: '/app/admin/logs' },
    ],
  },
];

export default async function AdminDashboardPage() {
  const res = await getAdminGodView();
  const data = res.success ? res.data ?? null : null;
  const kpis = data?.kpis || null;
  const recentOrgs = Array.isArray(data?.recentOrganizations) ? data.recentOrganizations : [];
  const alerts = Array.isArray(data?.alerts) ? data.alerts : [];

  return (
    <div className="space-y-6 md:space-y-8 pb-24 bg-white rounded-2xl md:rounded-3xl p-4 md:p-8 shadow-sm border border-slate-100" dir="rtl">
      <div className="text-center max-w-3xl mx-auto">
        <div className="mb-6">
          <Shield size={48} className="mx-auto text-slate-400 mb-4 md:hidden" />
          <Shield size={64} className="mx-auto text-slate-400 mb-4 hidden md:block" />
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-3 md:mb-4">
          דשבורד ניהול-על
        </h1>
        <p className="text-slate-600 text-base md:text-xl">בחר סביבת עבודה או צפה בנתונים חיים</p>
      </div>

      {/* APK Download - Moved to /app/admin/global/downloads */}

      {!res.success ? (
        <div className="bg-white border border-rose-200 rounded-2xl p-6 text-rose-900 shadow-sm">
          <div className="text-rose-700 font-black flex items-center gap-2">
            <Shield size={20} />
            שגיאה בטעינת מדדים
          </div>
          <div className="text-sm text-rose-600 mt-2 font-medium">{res.error || 'שגיאה לא ידועה'}</div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* KPIs Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="admin-pro-card p-5 flex flex-col justify-between h-full">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">סה"כ ארגונים</div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight tabular-nums">{Number(kpis?.totalOrganizations ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="admin-pro-card p-5 flex flex-col justify-between h-full">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">סה"כ משתמשים</div>
              <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight tabular-nums">{Number(kpis?.totalProfiles ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="admin-pro-card p-5 flex flex-col justify-between h-full border-emerald-100 bg-emerald-50/30">
              <div className="text-xs font-bold text-emerald-600 uppercase tracking-wide">הכנסה חודשית</div>
              <div className="text-3xl font-black text-emerald-900 mt-2 tracking-tight tabular-nums">₪{Number(kpis?.revenuePaidThisMonth ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="admin-pro-card p-5 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                 <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">שימוש AI היום</div>
                 <BrainCircuit size={16} className="text-indigo-500" />
              </div>
              <div>
                <div className="text-3xl font-black text-slate-900 mt-2 tracking-tight tabular-nums">{Math.round(Number(kpis?.aiCreditsUsedTodayCents ?? 0) / 100).toLocaleString('he-IL')}</div>
                <div className="text-[10px] font-bold text-slate-400 mt-1">קרדיטים</div>
              </div>
            </div>
          </div>

          {/* Shortcuts Grid */}
          <div>
            <div className="text-sm font-black text-slate-900 mb-4 px-1">קיצורי דרך</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AREA_CARDS.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="admin-pro-card p-5 group hover:border-indigo-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-indigo-50 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 transition-colors">
                        <Icon size={20} strokeWidth={2} />
                      </div>
                      <div>
                        <Link href={card.href} className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          {card.title}
                        </Link>
                        <div className="text-xs font-medium text-slate-500">{card.description}</div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {card.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                        >
                          <span>{item.label}</span>
                          <span className="opacity-0 group-hover/link:opacity-100 text-slate-300">→</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Organizations */}
            <div className="admin-pro-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                  <div className="text-sm font-black text-slate-900">ארגונים אחרונים</div>
                  <div className="text-xs font-medium text-slate-500 mt-0.5">5 שנרשמו לאחרונה</div>
                </div>
                <Link href="/app/admin/organizations" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                  לכל הארגונים
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-right">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">שם</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">סטטוס</th>
                      <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentOrgs.length === 0 ? (
                      <tr>
                        <td className="px-5 py-8 text-sm font-medium text-slate-500 text-center" colSpan={3}>
                          אין נתונים
                        </td>
                      </tr>
                    ) : (
                      recentOrgs.map((o: AdminGodViewRecentOrganization) => (
                        <tr key={String(o.id)} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="text-sm font-bold text-slate-900">{String(o.name || '')}</div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">{o.slug}</div>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`badge-pro ${
                              o.subscriptionStatus === 'active' ? 'badge-pro-success' : 
                              o.subscriptionStatus === 'trial' ? 'badge-pro-warning' : 
                              'badge-pro-neutral'
                            }`}>
                              {o.subscriptionStatus || '—'}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm">
                            <OrgImpersonateButton orgSlug={o.slug ?? null} fallbackOrgId={String(o.id)} clientId={o.primaryClientId ?? null} />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Alerts */}
            <div className="admin-pro-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="text-sm font-black text-slate-900">התראות מערכת</div>
                <div className="text-xs font-medium text-slate-500 mt-0.5">חריגות ותשלומים</div>
              </div>

              <div className="p-4 max-h-[300px] overflow-y-auto">
                {alerts.length === 0 ? (
                  <div className="text-sm font-medium text-slate-500 text-center py-8">אין התראות כרגע</div>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 15).map((a: AdminGodViewAlert, idx: number) => (
                      <div key={`${String(a.type)}-${idx}`} className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                        <div className="w-2 h-2 rounded-full bg-rose-500 mt-2 shrink-0" />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{String(a.title || '')}</div>
                          <div className="text-xs font-medium text-slate-600 mt-0.5">{String(a.details || '')}</div>
                          {a.organizationSlug ? (
                            <div className="text-[10px] font-bold text-slate-400 mt-1 font-mono">{String(a.organizationSlug)}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
