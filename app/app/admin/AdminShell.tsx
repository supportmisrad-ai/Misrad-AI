'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Building2, Users, Sparkles, ScrollText, Server, SlidersHorizontal, Globe, LifeBuoy, Moon, ArrowRight, RefreshCw, ChevronDown, ChevronRight, Shield, ShieldCheck, Settings, DollarSign, Briefcase, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useData } from '@/context/DataContext';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { Avatar } from '@/components/Avatar';
import CommandPalette from '@/components/CommandPalette';
import { Button } from '@/components/ui/button';
import type { CommandPaletteNavItem } from '@/components/command-palette/command-palette.types';
import type { Lead } from '@/types';

type AdminArea = 'customers' | 'platform';
const ADMIN_AREA_STORAGE_KEY = 'misrad_admin_area_v1';

function inferAdminAreaFromPathname(pathname: string): AdminArea | null {
  const p = String(pathname || '');
  if (p.startsWith('/app/admin/modules')) return 'platform';
  if (p.startsWith('/app/admin/system-flags')) return 'platform';
  if (p.startsWith('/app/admin/logs')) return 'platform';
  if (p.startsWith('/app/admin/ai')) return 'platform';

  if (p === '/app/admin/global' || p === '/app/admin/global/') return 'platform';
  if (p.startsWith('/app/admin/global/control')) return 'platform';
  if (p.startsWith('/app/admin/global/ai')) return 'platform';
  if (p.startsWith('/app/admin/global/links')) return 'platform';
  if (p.startsWith('/app/admin/global/downloads')) return 'platform';
  if (p.startsWith('/app/admin/global/help-videos')) return 'platform';
  if (p.startsWith('/app/admin/global/kb-videos')) return 'platform';
  if (p.startsWith('/app/admin/global/work-listings')) return 'platform';
  if (p.startsWith('/app/admin/global/data')) return 'platform';
  if (p.startsWith('/app/admin/global/versions')) return 'platform';

  if (p.startsWith('/app/admin/nexus')) return 'platform';
  if (p.startsWith('/app/admin/social')) return 'platform';
  if (p.startsWith('/app/admin/system')) return 'platform';
  if (p.startsWith('/app/admin/landing')) return 'platform';

  if (p.startsWith('/app/admin/customers')) return 'customers';
  if (p.startsWith('/app/admin/organizations')) return 'customers';
  if (p.startsWith('/app/admin/org/')) return 'customers';
  if (p.startsWith('/app/admin/users')) return 'customers';
  if (p.startsWith('/app/admin/tenants')) return 'customers';
  if (p.startsWith('/app/admin/support')) return 'customers';
  if (p.startsWith('/app/admin/client')) return 'customers';
  if (p.startsWith('/app/admin/global/users')) return 'customers';
  if (p.startsWith('/app/admin/global/approvals')) return 'customers';
  if (p.startsWith('/app/admin/global/updates')) return 'platform';
  if (p.startsWith('/app/admin/global/announcements')) return 'platform';

  return null;
}

function isAdminArea(value: unknown): value is AdminArea {
  return value === 'customers' || value === 'platform';
}

function getAdminAreaLabel(area: AdminArea): string {
  return area === 'customers' ? 'ניהול לקוחות' : 'ניהול פלטפורמה';
}

function getAdminAreaDescription(area: AdminArea): string {
  return area === 'customers'
    ? 'לקוחות · ארגונים · משתמשים · תמיכה'
    : 'מוצר · מודולים · תשתית · לוגים';
}

function isActivePath(pathname: string, href: string, currentSearch: string) {
  const [hrefPath, hrefQuery = ''] = String(href || '').split('?');
  if (hrefPath === '/app/admin') return pathname === hrefPath;

  const pathMatch = pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
  if (!pathMatch) return false;

  if (!hrefQuery) return true;
  try {
    const desired = new URLSearchParams(hrefQuery);
    const current = new URLSearchParams(String(currentSearch || ''));
    for (const [k, v] of desired.entries()) {
      if (current.get(k) !== v) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString?.() || '';
  const {
    currentUser,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    openSupport,
    leads,
  } = useData();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const normalizedRole = String(currentUser?.role || '').trim().toLowerCase();
  const isAuditServiceRole =
    normalizedRole === 'audit_service' || normalizedRole === 'audit-service' || normalizedRole === 'audit service';

  const [adminArea, setAdminArea] = useState<AdminArea>('customers');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ADMIN_AREA_STORAGE_KEY);
      if (isAdminArea(stored)) {
        setAdminArea(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const inferred = inferAdminAreaFromPathname(pathname);
    if (inferred) {
      setAdminArea(inferred);
    }
  }, [pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(ADMIN_AREA_STORAGE_KEY, adminArea);
    } catch {
      // ignore
    }
  }, [adminArea]);

  const switchAdminArea = (next: AdminArea) => {
    setAdminArea(next);
    try {
      localStorage.setItem(ADMIN_AREA_STORAGE_KEY, next);
    } catch {
      // ignore
    }

    const inferred = inferAdminAreaFromPathname(pathname);
    if (inferred === next) return;

    router.push(next === 'customers' ? '/app/admin/customers' : '/app/admin/global/control');
  };

  const [expandedGroups, setExpandedGroups] = useState<{ nexus: boolean; social: boolean; system: boolean; landing: boolean; finance: boolean; client: boolean; operations: boolean }>(() => ({
    nexus: pathname.startsWith('/app/admin/nexus'),
    social: pathname.startsWith('/app/admin/social'),
    system: pathname.startsWith('/app/admin/system'),
    landing: pathname.startsWith('/app/admin/landing'),
    finance: pathname.startsWith('/app/admin/finance'),
    client: pathname.startsWith('/app/admin/client'),
    operations: pathname.startsWith('/app/admin/operations'),
  }));

  useEffect(() => {
    setExpandedGroups((prev) => ({
      nexus: prev.nexus || pathname.startsWith('/app/admin/nexus'),
      social: prev.social || pathname.startsWith('/app/admin/social'),
      system: prev.system || pathname.startsWith('/app/admin/system'),
      landing: prev.landing || pathname.startsWith('/app/admin/landing'),
      finance: prev.finance || pathname.startsWith('/app/admin/finance'),
      client: prev.client || pathname.startsWith('/app/admin/client'),
      operations: prev.operations || pathname.startsWith('/app/admin/operations'),
    }));
  }, [pathname]);

  const keydownOptions = useMemo(() => ({ capture: true }), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down, keydownOptions);
    return () => document.removeEventListener('keydown', down, keydownOptions);
  }, [isCommandPaletteOpen, keydownOptions, setCommandPaletteOpen]);

  type AdminNavItem = { href: string; label: string; icon: LucideIcon };

  const dashboardItem = useMemo<AdminNavItem>(
    () => ({ href: '/app/admin', label: 'דשבורד', icon: LayoutGrid }),
    []
  );

  const customerNavItems = useMemo<AdminNavItem[]>(
    () => [
      { href: '/app/admin/dashboard/customers', label: 'דשבורד לקוחות', icon: LayoutGrid },
      { href: '/app/admin/business-clients', label: 'לקוחות עסקיים', icon: Building2 },
      { href: '/app/admin/organizations', label: 'ארגונים', icon: Building2 },
      { href: '/app/admin/client/support', label: 'שירות לקוחות', icon: LifeBuoy },
    ],
    []
  );

  const platformNavItems = useMemo<AdminNavItem[]>(
    () => [
      { href: '/app/admin/dashboard/platform', label: 'דשבורד פלטפורמה', icon: LayoutGrid },
      { href: '/app/admin/system-flags', label: 'מתגי מערכת', icon: SlidersHorizontal },
      { href: '/app/admin/ai', label: 'ניתוח AI', icon: Sparkles },
      { href: '/app/admin/logs', label: 'לוגים', icon: ScrollText },
    ],
    []
  );

  const navItems = useMemo<AdminNavItem[]>(() => {
    return adminArea === 'platform' ? platformNavItems : customerNavItems;
  }, [adminArea, customerNavItems, platformNavItems]);

  const auditNavItems = useMemo<AdminNavItem[]>(
    () => [
      { href: '/app/admin/logs', label: 'לוגים', icon: ScrollText },
    ],
    []
  );

  const effectiveNavItems = useMemo(() => {
    if (isAuditServiceRole) return auditNavItems;
    return [dashboardItem, ...navItems];
  }, [auditNavItems, dashboardItem, isAuditServiceRole, navItems]);

  const mobileNavItems = useMemo(() => {
    const find = (href: string) => effectiveNavItems.find((i) => i.href === href);
    if (isAuditServiceRole) {
      const base = [find('/app/admin/logs')];
      return base.filter((item): item is AdminNavItem => Boolean(item));
    }
    const base =
      adminArea === 'platform'
        ? [find('/app/admin'), find('/app/admin/modules'), find('/app/admin/system-flags'), find('/app/admin/logs')]
        : [find('/app/admin'), find('/app/admin/customers'), find('/app/admin/organizations'), find('/app/admin/client/support')];
    return base.filter((item): item is AdminNavItem => Boolean(item));
  }, [adminArea, effectiveNavItems, isAuditServiceRole]);

  const customerUsersSubItems = useMemo(
    () => [
      { href: '/app/admin/global/users', label: 'כל המשתמשים' },
      { href: '/app/admin/global/approvals', label: 'אישורי משתמשים' },
    ],
    []
  );

  const platformInfraSubItems = useMemo(
    () => [
      { href: '/app/admin/global/control', label: 'בקרת פלטפורמה' },
      { href: '/app/admin/global/feature-flags', label: 'הגדרות מתקדמות' },
      { href: '/app/admin/landing/pricing', label: 'דפי נחיתה' },
      { href: '/app/admin/global/ai', label: 'מוח AI' },
      { href: '/app/admin/global/links', label: 'מרכז קישורים' },
      { href: '/app/admin/global/downloads', label: 'הורדות' },
      { href: '/app/admin/global/help-videos', label: 'סרטוני הדרכה' },
      { href: '/app/admin/global/data', label: 'דאטה' },
    ],
    []
  );

  const nexusSubItems = useMemo(
    () => [
      { href: '/app/admin/nexus/control', label: 'בקרת מערכת' },
      { href: '/app/admin/nexus/intelligence', label: 'בינה' },
      { href: '/app/admin/nexus/invitations', label: 'הזמנות' },
      { href: '/app/admin/nexus/announcements', label: 'הודעות' },
    ],
    []
  );

  const socialSubItems = useMemo(
    () => [
      { href: '/app/admin/social?tab=overview', label: 'מבט על' },
      { href: '/app/admin/social?tab=team', label: 'צוות' },
      { href: '/app/admin/social?tab=integrations', label: 'אינטגרציות' },
      { href: '/app/admin/social?tab=quotas', label: 'מכסות' },
      { href: '/app/admin/social?tab=automation', label: 'אוטומציות' },
      { href: '/app/admin/social?tab=features', label: "בקשות פיצ'רים" },
      { href: '/app/admin/social?tab=advanced', label: 'ניהול מתקדם' },
    ],
    []
  );

  const systemSubItems = useMemo(
    () => [
      { href: '/app/admin/system/control', label: 'בקרת מערכת' },
      { href: '/app/admin/system/announcements', label: 'הודעות מערכת' },
    ],
    []
  );

  const clientSubItems = useMemo(
    () => [
      { href: '/app/admin/client/support', label: 'דיווחי תקלות' },
      { href: '/app/admin/client/features', label: "בקשות פיצ'רים" },
      { href: '/app/admin/client/announcements', label: 'הודעות ללקוחות' },
      { href: '/app/admin/support', label: 'הגדרות תמיכה' },
    ],
    []
  );

  const financeSubItems = useMemo(
    () => [
      { href: '/app/admin/finance/control', label: 'בקרת מערכת' },
    ],
    []
  );

  const clientSubItemsModule = useMemo(
    () => [
      { href: '/app/admin/client/control', label: 'בקרת מערכת' },
    ],
    []
  );

  const operationsSubItems = useMemo(
    () => [
      { href: '/app/admin/operations/control', label: 'בקרת מערכת' },
    ],
    []
  );

  const landingSubItems = useMemo(
    () => [
      { href: '/app/admin/landing/pricing', label: 'תמחור' },
      { href: '/app/admin/landing/content', label: 'תוכן' },
      { href: '/app/admin/landing/payment-links', label: 'לינקים לתשלום' },
      { href: '/app/admin/landing/branding', label: 'מיתוג' },
      { href: '/app/admin/landing/partners', label: 'שותפים' },
      { href: '/app/admin/landing/founder', label: 'מייסד' },
    ],
    []
  );

  const platformSystemSubItems = useMemo(
    () => [
      { href: '/app/admin/global/updates', label: 'עדכוני מערכת' },
      { href: '/app/admin/global/announcements', label: 'הודעות מערכת' },
    ],
    []
  );

  const commandPaletteNavItems = useMemo<CommandPaletteNavItem[]>(() => {
    const main: CommandPaletteNavItem[] = effectiveNavItems.map((i) => ({ id: i.href, label: i.label, icon: i.icon }));
    if (isAuditServiceRole) {
      return main;
    }

    if (adminArea === 'customers') {
      const customerUsers: CommandPaletteNavItem[] = customerUsersSubItems.map((i) => ({ id: i.href, label: `לקוחות · ${i.label}`, icon: Users }));
      const customerService: CommandPaletteNavItem[] = clientSubItems.map((i) => ({ id: i.href, label: `שירות לקוחות · ${i.label}`, icon: LifeBuoy }));
      return [...main, ...customerUsers, ...customerService];
    }

    const infra: CommandPaletteNavItem[] = platformInfraSubItems.map((i) => ({ id: i.href, label: `פלטפורמה · ${i.label}`, icon: Globe }));
    const platformSys: CommandPaletteNavItem[] = platformSystemSubItems.map((i) => ({ id: i.href, label: `פלטפורמה · ${i.label}`, icon: Server }));
    const nexus: CommandPaletteNavItem[] = nexusSubItems.map((i) => ({ id: i.href, label: `מוצר · נקסוס · ${i.label}`, icon: Sparkles }));
    const social: CommandPaletteNavItem[] = socialSubItems.map((i) => ({ id: i.href, label: `מוצר · סושיאל · ${i.label}`, icon: ShieldCheck }));
    const system: CommandPaletteNavItem[] = systemSubItems.map((i) => ({ id: i.href, label: `מוצר · מערכת · ${i.label}`, icon: Server }));
    const landing: CommandPaletteNavItem[] = landingSubItems.map((i) => ({ id: i.href, label: `מוצר · דף נחיתה · ${i.label}`, icon: Globe }));
    return [...main, ...infra, ...platformSys, ...nexus, ...social, ...system, ...landing];
  }, [adminArea, clientSubItems, customerUsersSubItems, effectiveNavItems, isAuditServiceRole, landingSubItems, nexusSubItems, platformInfraSubItems, platformSystemSubItems, socialSubItems, systemSubItems]);

  const commandPaletteLeads = useMemo<Lead[]>(() => (Array.isArray(leads) ? leads : []), [leads]);

  const userName = String(currentUser?.name || 'Admin');
  const userRole = currentUser?.role ? String(currentUser.role) : null;

  const getReturnToPath = () => {
    try {
      const param = searchParams?.get('returnTo');
      if (param && param.startsWith('/')) return param;
    } catch {
      // ignore
    }
    return '/';
  };

  return (
    <AdminGuard>
      <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 text-slate-900 font-sans relative overflow-hidden flex">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-indigo-200/40 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-purple-200/40 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: '1s' }}
          ></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-100/40 rounded-full blur-3xl"></div>
        </div>

        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-slate-200/70 bg-white/80 backdrop-blur-3xl fixed right-0 top-0 bottom-0 z-20 shadow-2xl shadow-slate-200/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none"></div>
          <div className="pt-6 pb-4 px-5 shrink-0 relative z-10 border-b border-slate-200/70">
            <div className="flex items-center gap-2 text-indigo-700 font-bold uppercase tracking-wider text-xs mb-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg backdrop-blur-sm border border-indigo-200">
                <Shield size={12} />
              </div>
              ניהול-על
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
              ענן משרד
            </div>
            <div className="mt-2 h-0.5 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
          </div>

          <nav className="p-3 flex-1 min-h-0 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">

            {!isAuditServiceRole ? (
              <div className="mb-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                <div className="text-xs font-black text-slate-600">מצב עבודה</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => switchAdminArea('customers')}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all border-2 ${
                      adminArea === 'customers'
                        ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    לקוחות
                  </button>
                  <button
                    type="button"
                    onClick={() => switchAdminArea('platform')}
                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all border-2 ${
                      adminArea === 'platform'
                        ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    פלטפורמה
                  </button>
                </div>
                <div className="mt-2 text-[10px] font-bold text-slate-500">{getAdminAreaDescription(adminArea)}</div>
              </div>
            ) : null}

            {(isAuditServiceRole ? effectiveNavItems : effectiveNavItems.filter((item) => item.href !== dashboardItem.href)).map((item) => {
              const active = isActivePath(pathname, item.href, currentSearch);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                    active
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {!isAuditServiceRole ? (
              <div className="mt-4 space-y-2">
                {adminArea === 'customers' ? (
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-500 px-4 pt-2">ניהול משתמשים</div>
                    <div className="space-y-1 pr-4">
                      {customerUsersSubItems.map((sub) => {
                        const active = isActivePath(pathname, sub.href, currentSearch);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                              active
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex-1">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="text-xs font-black text-slate-500 px-4 pt-2">שירות לקוחות</div>
                    <div className="space-y-1 pr-4">
                      {clientSubItems.map((sub) => {
                        const active = isActivePath(pathname, sub.href, currentSearch);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                              active
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex-1">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-xs font-black text-slate-500 px-4 pt-2">תשתית</div>
                    <div className="space-y-1 pr-4">
                      {platformInfraSubItems.map((sub) => {
                        const active = isActivePath(pathname, sub.href, currentSearch);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                              active
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex-1">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <div className="text-xs font-black text-slate-500 px-4 pt-2">מערכת</div>
                    <div className="space-y-1 pr-4">
                      {platformSystemSubItems.map((sub) => {
                        const active = isActivePath(pathname, sub.href, currentSearch);
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                              active
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex-1">{sub.label}</span>
                          </Link>
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, nexus: !s.nexus }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/nexus')
                          ? 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles size={18} />
                      <span className="flex-1 text-right">Nexus</span>
                      {expandedGroups.nexus ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.nexus ? (
                      <div className="space-y-1 pr-4">
                        {nexusSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-indigo-100/70 text-indigo-800 border border-indigo-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, social: !s.social }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/social')
                          ? 'bg-blue-50 text-blue-800 border border-blue-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <ShieldCheck size={18} />
                      <span className="flex-1 text-right">Social</span>
                      {expandedGroups.social ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.social ? (
                      <div className="space-y-1 pr-4">
                        {socialSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-blue-100/70 text-blue-800 border border-blue-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, system: !s.system }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/system')
                          ? 'bg-red-50 text-red-800 border border-red-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Settings size={18} />
                      <span className="flex-1 text-right">System</span>
                      {expandedGroups.system ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.system ? (
                      <div className="space-y-1 pr-4">
                        {systemSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-red-100/70 text-red-800 border border-red-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, finance: !s.finance }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/finance')
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <DollarSign size={18} />
                      <span className="flex-1 text-right">Finance</span>
                      {expandedGroups.finance ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.finance ? (
                      <div className="space-y-1 pr-4">
                        {financeSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, client: !s.client }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/client')
                          ? 'bg-amber-50 text-amber-800 border border-amber-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Users size={18} />
                      <span className="flex-1 text-right">Client</span>
                      {expandedGroups.client ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.client ? (
                      <div className="space-y-1 pr-4">
                        {clientSubItemsModule.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-amber-100/70 text-amber-800 border border-amber-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}

                    <Button
                      type="button"
                      onClick={() => setExpandedGroups((s) => ({ ...s, operations: !s.operations }))}
                      variant="ghost"
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                        pathname.startsWith('/app/admin/operations')
                          ? 'bg-cyan-50 text-cyan-800 border border-cyan-100'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Briefcase size={18} />
                      <span className="flex-1 text-right">Operations</span>
                      {expandedGroups.operations ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </Button>

                    {expandedGroups.operations ? (
                      <div className="space-y-1 pr-4">
                        {operationsSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                active
                                  ? 'bg-cyan-100/70 text-cyan-800 border border-cyan-200'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                              }`}
                            >
                              <span className="flex-1">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </nav>

          <div className="p-4 border-t border-slate-200/70 relative z-10 bg-gradient-to-t from-white/60 to-transparent">
            <div className="flex items-center gap-3">
              <Avatar src={currentUser?.avatar || null} name={userName} size="md" rounded="full" />
              <div className="min-w-0">
                <div className="text-sm font-black text-slate-900 truncate" suppressHydrationWarning>
                  {userName}
                </div>
                <div className="text-[10px] font-bold text-slate-500 truncate" suppressHydrationWarning>
                  {userRole || ''}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 relative z-10 mr-72">
          <SharedHeader
            title="ענן משרד"
            subtitle={`Super Admin · ${getAdminAreaLabel(adminArea)}`}
            currentDate={new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            mobileBrand={{ name: 'ענן משרד', badgeModuleKey: 'system' }}
            onOpenCommandPaletteAction={() => setCommandPaletteOpen(true)}
            onOpenSupportAction={() => openSupport?.()}
            user={{ name: userName, role: userRole }}
            userAvatarSlot={<Avatar src={currentUser?.avatar || null} name={userName} size="md" rounded="full" />}
            switcherSlot={!isAuditServiceRole ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  onClick={() => router.push('/app/admin/ai')}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                  title="ניתוח AI"
                  aria-label="ניתוח AI"
                >
                  <Sparkles size={18} />
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/app/admin/global/links')}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                  title="מרכז קישורים"
                  aria-label="מרכז קישורים"
                >
                  <Globe size={18} />
                </Button>
                <a
                  href="/shabbat"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                  title="מצב שבת"
                  aria-label="מצב שבת"
                >
                  <Moon size={18} />
                </a>
                <Button
                  type="button"
                  onClick={() => router.push(getReturnToPath())}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                  title="חזרה לאפליקציה"
                  aria-label="חזרה לאפליקציה"
                >
                  <ArrowRight size={18} />
                </Button>
                <Button
                  type="button"
                  onClick={() => router.refresh()}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                  title="רענון"
                  aria-label="רענון"
                >
                  <RefreshCw size={18} />
                </Button>
              </div>
            ) : null}
            className="bg-white/80 backdrop-blur-3xl border-b border-slate-200/70"
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 bg-white/85 backdrop-blur-3xl">
          <div className="grid grid-cols-5 items-stretch px-2 py-2">
            {mobileNavItems.map((item) => {
              const active = isActivePath(pathname, item.href, currentSearch);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 font-black text-[10px] transition-colors ${
                    active ? 'text-indigo-700' : 'text-slate-600'
                  }`}
                  aria-label={item.label}
                >
                  <Icon size={18} />
                  <span className="truncate max-w-full">{item.label}</span>
                </Link>
              );
            })}

            <Button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              variant="ghost"
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 font-black text-[10px] transition-colors ${
                isMobileNavOpen ? 'text-indigo-700' : 'text-slate-600'
              }`}
              aria-label="עוד"
            >
              <MoreHorizontal size={18} />
              <span className="truncate max-w-full">עוד</span>
            </Button>
          </div>
        </div>

        <CommandPalette
          isOpen={Boolean(isCommandPaletteOpen)}
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={(href) => {
            try {
              router.push(href);
            } finally {
              setCommandPaletteOpen(false);
            }
          }}
          onSelectLead={(_lead) => setCommandPaletteOpen(false)}
          leads={commandPaletteLeads}
          navItems={commandPaletteNavItems}
          hideLeads
          hideAssets
        />

        {isMobileNavOpen ? (
          <div className="fixed inset-0 z-[120] flex items-end" role="dialog" aria-modal="true">
            <Button
              type="button"
              variant="ghost"
              className="absolute inset-0 w-full h-full p-0 bg-slate-900/40 backdrop-blur-sm rounded-none"
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close"
            />
            <div className="relative w-full rounded-t-3xl bg-white border-t border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-slate-200">
                <div className="text-sm font-black text-slate-900">ניווט אדמין</div>
              </div>

              <div className="max-h-[70vh] overflow-y-auto p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {effectiveNavItems.map((item) => {
                    const active = isActivePath(pathname, item.href, currentSearch);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileNavOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-black text-sm transition-colors ${
                          active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="flex-1 min-w-0 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>

                <div className="space-y-2">
                  {!isAuditServiceRole ? (
                    <div className="px-2 pt-2">
                      <div className="text-xs font-black text-slate-500">מצב עבודה</div>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => switchAdminArea('customers')}
                          className={`px-4 py-2 rounded-lg text-sm font-black transition-all border-2 ${
                            adminArea === 'customers'
                              ? 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-md'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          לקוחות
                        </button>
                        <button
                          type="button"
                          onClick={() => switchAdminArea('platform')}
                          className={`px-4 py-2 rounded-lg text-sm font-black transition-all border-2 ${
                            adminArea === 'platform'
                              ? 'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 shadow-md'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          פלטפורמה
                        </button>
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-slate-500">{getAdminAreaDescription(adminArea)}</div>
                    </div>
                  ) : null}

                  {adminArea === 'customers' && !isAuditServiceRole ? (
                    <>
                      <div className="text-xs font-black text-slate-500 px-2 pt-3">ניהול משתמשים</div>
                      <div className="grid grid-cols-2 gap-2">
                        {customerUsersSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="text-xs font-black text-slate-500 px-2 pt-3">שירות לקוחות</div>
                      <div className="grid grid-cols-2 gap-2">
                        {clientSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  ) : null}

                  {adminArea === 'platform' && !isAuditServiceRole ? (
                    <>
                      <div className="text-xs font-black text-slate-500 px-2 pt-3">תשתית</div>
                      <div className="grid grid-cols-2 gap-2">
                        {platformInfraSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="text-xs font-black text-slate-500 px-2 pt-3">מערכת</div>
                      <div className="grid grid-cols-2 gap-2">
                        {platformSystemSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">{sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {nexusSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">נקסוס · {sub.label}</span>
                            </Link>
                          );
                        })}
                        {socialSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-blue-50 text-blue-800 border border-blue-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">סושיאל · {sub.label}</span>
                            </Link>
                          );
                        })}
                        {systemSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">מערכת · {sub.label}</span>
                            </Link>
                          );
                        })}
                        {landingSubItems.map((sub) => {
                          const active = isActivePath(pathname, sub.href, currentSearch);
                          return (
                            <Link
                              key={sub.href}
                              href={sub.href}
                              onClick={() => setIsMobileNavOpen(false)}
                              className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                                active ? 'bg-purple-50 text-purple-800 border border-purple-100' : 'bg-slate-50 text-slate-700'
                              }`}
                            >
                              <span className="block truncate">דף נחיתה · {sub.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="p-3 border-t border-slate-200">
                <Button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                >
                  סגור
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AdminGuard>
  );
}
