import React from 'react';
import Link from 'next/link';
import { Building2, Globe, LifeBuoy, Server, Settings, Shield, Sparkles, Users, type LucideIcon } from 'lucide-react';
import { getAdminGodView } from '@/app/actions/admin-godview';
import type { AdminGodViewRecentOrganization, AdminGodViewAlert } from '@/app/actions/admin-godview';
import OrgImpersonateButton from './OrgImpersonateButton';

export const dynamic = 'force-dynamic';

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
      { label: 'ניתוח AI', href: '/app/admin/ai' },
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

      {!res.success ? (
        <div className="bg-white/80 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
          <div className="text-slate-900 font-black">שגיאה בטעינת מדדים</div>
          <div className="text-sm text-slate-600 mt-2">{res.error || 'שגיאה לא ידועה'}</div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {AREA_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-5 shadow-xl hover:shadow-2xl hover:border-slate-300 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                      <Icon size={18} />
                    </div>
                    <div>
                      <Link href={card.href} className="text-sm font-black text-slate-900 group-hover:text-slate-700 transition-colors">
                        {card.title}
                      </Link>
                      <div className="text-[10px] font-bold text-slate-500">{card.description}</div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {card.items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="block px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-4 md:p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">סה"כ ארגונים</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1 md:mt-2">{Number(kpis?.totalOrganizations ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-4 md:p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">סה"כ משתמשים</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1 md:mt-2">{Number(kpis?.totalProfiles ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-4 md:p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500">הכנסה חודשית</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1 md:mt-2">₪{Number(kpis?.revenuePaidThisMonth ?? 0).toLocaleString('he-IL')}</div>
            </div>
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-4 md:p-6 shadow-xl hover:border-slate-300/80 transition-all">
              <div className="text-xs font-bold text-slate-500 truncate">שימוש AI היום</div>
              <div className="text-2xl md:text-3xl font-black text-slate-900 mt-1 md:mt-2">{Math.round(Number(kpis?.aiCreditsUsedTodayCents ?? 0) / 100).toLocaleString('he-IL')}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">בקרדיטים</div>
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
                  {recentOrgs.slice(0, 5).map((o: AdminGodViewRecentOrganization) => (
                    <div key={String(o.id)} className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4">
                      <div className="text-sm font-black text-slate-900 truncate">{String(o.name || '')}</div>
                      <div className="mt-1 text-xs font-bold text-slate-600 truncate">כתובת: {o.slug ? String(o.slug) : '—'}</div>
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
                    <th className="px-4 py-3 text-xs font-black text-slate-600">כתובת</th>
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
                    recentOrgs.map((o: AdminGodViewRecentOrganization) => (
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

            <div className="p-4 md:p-6">
              {alerts.length === 0 ? (
                <div className="text-sm font-bold text-slate-600">אין התראות כרגע</div>
              ) : (
                <div className="space-y-3">
                  {alerts.slice(0, 15).map((a: AdminGodViewAlert, idx: number) => (
                    <div key={`${String(a.type)}-${idx}`} className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-sm p-4">
                      <div className="text-sm font-black text-slate-900">{String(a.title || '')}</div>
                      <div className="text-xs font-bold text-slate-600 mt-1">{String(a.details || '')}</div>
                      {a.organizationSlug ? (
                        <div className="text-xs font-bold text-slate-400 mt-2">ארגון: {String(a.organizationSlug)}</div>
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
