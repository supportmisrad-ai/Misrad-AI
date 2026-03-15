'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Building2, Users, BrainCircuit, ScrollText, Server, SlidersHorizontal, Globe, LifeBuoy, Moon, ArrowRight, RefreshCw, Shield, ShieldCheck, Settings, DollarSign, Briefcase, MoreHorizontal, UserPlus, Network, Lightbulb, Zap, MessageSquare, BarChart3, Megaphone, Palette, PlayCircle, Handshake, Link2, Mail, Image as ImageIcon, GraduationCap, ExternalLink, Calendar, type LucideIcon } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useData } from '@/context/DataContext';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { Avatar } from '@/components/Avatar';
import CommandPalette from '@/components/CommandPalette';
import { Button } from '@/components/ui/button';
import type { CommandPaletteNavItem } from '@/components/command-palette/command-palette.types';
import type { Lead } from '@/types';

type AdminArea = 'customers' | 'users' | 'support' | 'product' | 'content' | 'infra' | 'bot' | 'ai' | 'analytics';
const ADMIN_AREA_STORAGE_KEY = 'misrad_admin_area_v2';

function inferAdminAreaFromPathname(pathname: string): AdminArea | null {
  const p = String(pathname || '');

  // customers
  if (p.startsWith('/app/admin/customers')) return 'customers';
  if (p.startsWith('/app/admin/setup-customer')) return 'customers';
  if (p.startsWith('/app/admin/organizations')) return 'customers';
  if (p.startsWith('/app/admin/org/')) return 'customers';
  if (p.startsWith('/app/admin/business-clients')) return 'customers';
  if (p.startsWith('/app/admin/billing-management')) return 'customers';
  if (p.startsWith('/app/admin/coupons')) return 'customers';

  // users
  if (p.startsWith('/app/admin/global/users')) return 'users';
  if (p.startsWith('/app/admin/global/approvals')) return 'users';
  if (p.startsWith('/app/admin/users')) return 'users';

  // support
  if (p.startsWith('/app/admin/client/support')) return 'support';
  if (p.startsWith('/app/admin/client/features')) return 'support';
  if (p.startsWith('/app/admin/client/announcements')) return 'support';
  if (p.startsWith('/app/admin/support')) return 'support';

  // product (module controls)
  if (p.startsWith('/app/admin/nexus')) return 'product';
  if (p.startsWith('/app/admin/social')) return 'product';
  if (p.startsWith('/app/admin/system')) return 'product';
  if (p.startsWith('/app/admin/finance')) return 'product';
  if (p.startsWith('/app/admin/client/control')) return 'product';
  if (p.startsWith('/app/admin/operations')) return 'product';
  if (p.startsWith('/admin/booking')) return 'product';

  // content
  if (p.startsWith('/app/admin/landing')) return 'content';
  if (p.startsWith('/app/admin/global/emails')) return 'content';
  if (p.startsWith('/app/admin/global/email-assets')) return 'content';
  if (p.startsWith('/app/admin/global/help-videos')) return 'content';
  if (p.startsWith('/app/admin/global/kb-videos')) return 'content';
  if (p.startsWith('/app/admin/global/links')) return 'content';
  if (p.startsWith('/app/admin/global/work-listings')) return 'content';

  // bot
  if (p.startsWith('/app/admin/bot')) return 'bot';

  // ai
  if (p.startsWith('/app/admin/ai')) return 'ai';
  if (p.startsWith('/app/admin/global/ai')) return 'ai';

  // analytics
  if (p.startsWith('/app/admin/analytics')) return 'analytics';

  // infra
  if (p.startsWith('/app/admin/modules')) return 'infra';
  if (p.startsWith('/app/admin/system-flags')) return 'infra';
  if (p.startsWith('/app/admin/logs')) return 'infra';
  if (p === '/app/admin/global' || p === '/app/admin/global/') return 'infra';
  if (p.startsWith('/app/admin/global/control')) return 'infra';
  if (p.startsWith('/app/admin/global/feature-flags')) return 'infra';
  if (p.startsWith('/app/admin/global/downloads')) return 'infra';
  if (p.startsWith('/app/admin/global/data')) return 'infra';
  if (p.startsWith('/app/admin/global/versions')) return 'infra';
  if (p.startsWith('/app/admin/global/updates')) return 'infra';
  if (p.startsWith('/app/admin/global/announcements')) return 'infra';

  return null;
}

const ADMIN_AREAS: AdminArea[] = ['customers', 'users', 'support', 'product', 'content', 'infra', 'bot', 'ai', 'analytics'];

function isAdminArea(value: unknown): value is AdminArea {
  return ADMIN_AREAS.includes(value as AdminArea);
}

const AREA_META: Record<AdminArea, { label: string; description: string }> = {
  customers: { label: 'לקוחות', description: 'ארגונים · לקוחות עסקיים · גבייה' },
  users: { label: 'משתמשים', description: 'חשבונות · אישורים · התחזות' },
  support: { label: 'תמיכה', description: 'תקלות · בקשות · הודעות' },
  product: { label: 'מוצר', description: 'מודולים · בקרה · הגדרות' },
  content: { label: 'תוכן', description: 'נחיתה · מיילים · סרטונים' },
  infra: { label: 'מערכת', description: 'תשתית · לוגים · דאטה · CRON' },
  bot: { label: 'בוט', description: 'וואטסאפ · לידים · שיחות' },
  ai: { label: 'AI', description: 'ניהול AI · ספקים · מודלים · קרדיטים' },
  analytics: { label: 'אנליטיקס', description: 'אתר · AI · לקוחות · תובנות' },
};

function getAdminAreaLabel(area: AdminArea): string {
  return AREA_META[area]?.label || area;
}

function getAdminAreaDescription(area: AdminArea): string {
  return AREA_META[area]?.description || '';
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

    // Don't navigate - just update the area state
    // The user can click the nav items to navigate
  };

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
    () => ({ href: '/app/admin', label: 'מבט כללי', icon: LayoutGrid }),
    []
  );

  const areaNavMap = useMemo<Record<AdminArea, AdminNavItem[]>>(() => ({
    customers: [
      { href: '/app/admin/dashboard/customers', label: 'מבט על לקוחות', icon: LayoutGrid },
      { href: '/app/admin/business-clients', label: 'לקוחות עסקיים', icon: Building2 },
      { href: '/app/admin/organizations', label: 'ארגונים', icon: Network },
      { href: '/app/admin/setup-customer', label: 'הקמת לקוח', icon: UserPlus },
      { href: '/app/admin/billing-management', label: 'ניהול גבייה', icon: DollarSign },
      { href: '/app/admin/coupons', label: 'קופונים', icon: Zap },
    ],
    users: [
      { href: '/app/admin/global/users', label: 'כל המשתמשים', icon: Users },
      { href: '/app/admin/global/approvals', label: 'אישורי משתמשים', icon: ShieldCheck },
      { href: '/app/admin/users', label: 'חשבונות מנויים', icon: Users },
    ],
    support: [
      { href: '/app/admin/client/support', label: 'דיווחי תקלות', icon: LifeBuoy },
      { href: '/app/admin/client/features', label: "בקשות פיצ'רים", icon: Lightbulb },
      { href: '/app/admin/client/announcements', label: 'הודעות ללקוחות', icon: ScrollText },
      { href: '/app/admin/support', label: 'הגדרות תמיכה', icon: Settings },
    ],
    product: [
      { href: '/app/admin/nexus/control', label: 'Nexus', icon: Zap },
      { href: '/app/admin/social', label: 'Social', icon: ShieldCheck },
      { href: '/app/admin/system/control', label: 'System', icon: Settings },
      { href: '/app/admin/finance/control', label: 'Finance', icon: DollarSign },
      { href: '/app/admin/client/control', label: 'Client', icon: Users },
      { href: '/app/admin/operations/control', label: 'Operations', icon: Briefcase },
      { href: '/admin/booking', label: 'בוקינג', icon: Calendar },
    ],
    content: [
      { href: '/app/admin/global/promotions', label: 'מבצעים', icon: Zap },
      { href: '/app/admin/landing/promotions', label: 'באנרים תקופתיים', icon: Megaphone },
      { href: '/app/admin/landing/pricing', label: 'תמחור', icon: DollarSign },
      { href: '/app/admin/landing/branding', label: 'מיתוג', icon: Palette },
      { href: '/app/admin/landing/content', label: 'תוכן נחיתה', icon: LayoutGrid },
      { href: '/app/admin/landing/videos', label: 'סרטונים', icon: PlayCircle },
      { href: '/app/admin/landing/partners', label: 'שותפים', icon: Handshake },
      { href: '/app/admin/landing/payment-links', label: 'קישורי תשלום', icon: Link2 },
      { href: '/app/admin/global/emails', label: 'רישום מיילים', icon: Mail },
      { href: '/app/admin/global/email-assets', label: 'תמונות מיילים', icon: ImageIcon },
      { href: '/app/admin/global/help-videos', label: 'סרטוני הדרכה', icon: PlayCircle },
      { href: '/app/admin/global/kb-videos', label: 'סרטוני מאגר ידע', icon: GraduationCap },
      { href: '/app/admin/global/links', label: 'מרכז קישורים', icon: ExternalLink },
      { href: '/app/admin/global/work-listings', label: 'דרושים', icon: Briefcase },
    ],
    infra: [
      { href: '/app/admin/dashboard/platform', label: 'מבט על מערכת', icon: LayoutGrid },
      { href: '/app/admin/global/control', label: 'בקרת פלטפורמה', icon: Server },
      { href: '/app/admin/system-flags', label: 'מתגי מערכת', icon: SlidersHorizontal },
      { href: '/app/admin/global/feature-flags', label: 'הגדרות מתקדמות', icon: Settings },
      { href: '/app/admin/logs', label: 'יומני אירועים', icon: ScrollText },
      { href: '/app/admin/global/data', label: 'דאטה', icon: Server },
      { href: '/app/admin/global/downloads', label: 'הורדות', icon: Server },
      { href: '/app/admin/global/cron-testing', label: 'טסט CRON', icon: Zap },
    ],
    bot: [
      { href: '/app/admin/bot', label: 'דשבורד בוט', icon: MessageSquare },
      { href: '/admin/bot-leads', label: 'לידים מהבוט', icon: Users },
      { href: '/admin/bot-analytics', label: 'אנליטיקס לידים', icon: BarChart3 },
    ],
    ai: [
      { href: '/app/admin/ai', label: 'ניהול AI', icon: BrainCircuit },
    ],
    analytics: [
      { href: '/app/admin/analytics', label: 'אנליטיקס אתר', icon: BarChart3 },
      { href: '/app/admin/analytics/ai', label: 'אנליטיקס AI', icon: BrainCircuit },
      { href: '/app/admin/analytics/customers', label: 'אנליטיקס לקוחות', icon: Users },
    ],
  }), []);

  const navItems = useMemo<AdminNavItem[]>(() => {
    return areaNavMap[adminArea] || [];
  }, [adminArea, areaNavMap]);

  const auditNavItems = useMemo<AdminNavItem[]>(
    () => [
      { href: '/app/admin/logs', label: 'יומני אירועים', icon: ScrollText },
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
    const areaItems = navItems.slice(0, 5).map((i) => find(i.href));
    const base = [find('/app/admin'), ...areaItems];
    return base.filter((item): item is AdminNavItem => Boolean(item));
  }, [adminArea, effectiveNavItems, isAuditServiceRole]);

  const commandPaletteNavItems = useMemo<CommandPaletteNavItem[]>(() => {
    const main: CommandPaletteNavItem[] = effectiveNavItems.map((i) => ({ id: i.href, label: i.label, icon: i.icon }));
    if (isAuditServiceRole) {
      return main;
    }

    const allAreaItems: CommandPaletteNavItem[] = [];
    for (const area of ADMIN_AREAS) {
      if (area === adminArea) continue;
      const areaLabel = getAdminAreaLabel(area);
      for (const item of areaNavMap[area]) {
        allAreaItems.push({ id: item.href, label: `${areaLabel} · ${item.label}`, icon: item.icon });
      }
    }
    return [...main, ...allAreaItems];
  }, [adminArea, areaNavMap, effectiveNavItems, isAuditServiceRole]);

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
    // Fall back to /me which resolves to the user's workspace (not homepage)
    return '/me';
  };

  return (
    <AdminGuard>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100/50 text-slate-900 font-sans relative overflow-hidden flex">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-slate-200/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-slate-100/40 rounded-full blur-3xl"></div>
        </div>

        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-slate-200/70 bg-white/80 backdrop-blur-3xl fixed right-0 top-0 bottom-0 z-20 shadow-2xl shadow-slate-200/60 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/5 via-slate-400/3 to-slate-500/5 pointer-events-none"></div>
          <div className="pt-6 pb-4 px-5 shrink-0 relative z-10 border-b border-slate-200/70">
            <div className="flex items-center gap-2 text-slate-700 font-bold uppercase tracking-wider text-xs mb-2">
              <div className="p-1.5 bg-slate-100 rounded-lg backdrop-blur-sm border border-slate-300">
                <Shield size={12} />
              </div>
              ניהול-על
            </div>
            <div className="text-lg font-black text-slate-900 tracking-tight">
              ענן משרד
            </div>
            <div className="mt-2 h-0.5 w-16 bg-gradient-to-r from-slate-800 to-slate-500 rounded-full"></div>
          </div>

          <nav className="p-3 flex-1 min-h-0 overflow-y-auto relative z-10 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">

            {!isAuditServiceRole ? (
              <div className="mb-3 rounded-2xl border border-slate-200 bg-white/70 p-3">
                <div className="text-xs font-black text-slate-600">סביבת עבודה</div>
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {ADMIN_AREAS.map((area) => {
                    const areaColors: Record<AdminArea, { active: string; inactive: string }> = {
                      customers: { active: 'bg-blue-600 text-white border-blue-600', inactive: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
                      users: { active: 'bg-purple-600 text-white border-purple-600', inactive: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
                      support: { active: 'bg-green-600 text-white border-green-600', inactive: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' },
                      product: { active: 'bg-orange-600 text-white border-orange-600', inactive: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' },
                      content: { active: 'bg-pink-600 text-white border-pink-600', inactive: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },
                      infra: { active: 'bg-slate-800 text-white border-slate-800', inactive: 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' },
                      bot: { active: 'bg-teal-600 text-white border-teal-600', inactive: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100' },
                      ai: { active: 'bg-indigo-600 text-white border-indigo-600', inactive: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100' },
                      analytics: { active: 'bg-amber-600 text-white border-amber-600', inactive: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
                    };
                    const colors = areaColors[area];
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => switchAdminArea(area)}
                        className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all border shadow-sm ${
                          adminArea === area ? colors.active : colors.inactive
                        }`}
                      >
                        {getAdminAreaLabel(area)}
                      </button>
                    );
                  })}
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
                      ? 'bg-slate-900 text-white border border-slate-800'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

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

        <main className="flex-1 flex flex-col min-w-0 relative z-10 md:mr-72">
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
                  title="ניהול AI"
                  aria-label="ניהול AI"
                >
                  <BrainCircuit size={18} />
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
                  onClick={() => { router.refresh(); window.location.reload(); }}
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
            actionsSlot={!isAuditServiceRole ? (
              <Button
                type="button"
                onClick={() => router.push(getReturnToPath())}
                variant="ghost"
                size="icon"
                className="md:hidden h-10 w-10 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
                title="חזרה לאפליקציה"
                aria-label="חזרה לאפליקציה"
              >
                <ArrowRight size={18} />
              </Button>
            ) : null}
            className="bg-white/80 backdrop-blur-3xl border-b border-slate-200/70"
          />

          <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
            {children}
          </div>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/70 bg-white/85 backdrop-blur-3xl safe-area-bottom">
          <div className="grid items-stretch px-2 py-2" style={{ gridTemplateColumns: `repeat(${mobileNavItems.length + 1}, minmax(0, 1fr))` }}>
            {mobileNavItems.map((item) => {
              const active = isActivePath(pathname, item.href, currentSearch);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileNavOpen(false)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 font-black text-[10px] transition-colors ${
                    active ? 'text-slate-900' : 'text-slate-600'
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
                isMobileNavOpen ? 'text-slate-900' : 'text-slate-600'
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

              <div className="max-h-[70vh] min-h-[50vh] overflow-y-auto p-3 space-y-2 overscroll-contain">
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
                          active ? 'bg-slate-900 text-white border border-slate-800' : 'bg-slate-50 text-slate-700'
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
                      <div className="text-xs font-black text-slate-500">סביבת עבודה</div>
                      <div className="grid grid-cols-3 gap-1.5 mt-2">
                        {ADMIN_AREAS.map((area) => (
                          <button
                            key={area}
                            type="button"
                            onClick={() => { switchAdminArea(area); setIsMobileNavOpen(false); }}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-black transition-all border ${
                              adminArea === area
                                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {getAdminAreaLabel(area)}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-[10px] font-bold text-slate-500">{getAdminAreaDescription(adminArea)}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="p-3 border-t border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={() => { setIsMobileNavOpen(false); router.push(getReturnToPath()); }}
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm"
                  >
                    <ArrowRight size={16} />
                    חזרה לאפליקציה
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { setIsMobileNavOpen(false); router.refresh(); }}
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl font-black text-sm"
                  >
                    <RefreshCw size={16} />
                    רענון
                  </Button>
                </div>
                <Button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl font-black text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors"
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
