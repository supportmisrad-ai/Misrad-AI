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

type AdminArea = 'customers' | 'users' | 'support' | 'product' | 'content' | 'infra' | 'bot' | 'ai' | 'analytics' | 'telephony';
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
  if (p.startsWith('/app/admin/booking')) return 'product';

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

  // telephony
  if (p.startsWith('/app/admin/telephony')) return 'telephony';

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

const ADMIN_AREAS: AdminArea[] = ['customers', 'users', 'support', 'product', 'content', 'infra', 'bot', 'ai', 'analytics', 'telephony'];

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
  telephony: { label: 'טלפוניה', description: 'Voicenter · שלוחות · חיוב · CDR' },
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
    organization,
  } = useData();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const orgSlug = organization?.slug || 'default';

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
      { href: '/app/admin/booking', label: 'בוקינג', icon: Calendar },
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
    telephony: [
      { href: '/app/admin/telephony', label: 'דשבורד טלפוניה', icon: Globe },
      { href: '/app/admin/telephony/accounts', label: 'חשבונות לקוחות', icon: Building2 },
      { href: '/app/admin/telephony/extensions', label: 'שלוחות', icon: Network },
      { href: '/app/admin/telephony/usage', label: 'שימוש וחיוב', icon: DollarSign },
      { href: '/app/admin/partners', label: 'שותפים והפניות', icon: Handshake },
    ],
  }), [orgSlug]);

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
      <div className="min-h-screen w-full bg-[#F8FAFC] text-slate-900 font-sans relative flex text-right" dir="rtl">
        
        {/* Mobile Nav Overlay */}
        {isMobileNavOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileNavOpen(false)}
          />
        )}

        {/* Sidebar - Desktop */}
        <aside className="hidden md:flex w-72 shrink-0 flex-col bg-white border-l border-slate-200 fixed right-0 top-0 bottom-0 z-30 shadow-sm">
          {/* Header */}
          <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-sm">
                <ShieldCheck size={16} strokeWidth={2.5} />
              </div>
              <div>
                <div className="text-base font-bold text-slate-900 leading-tight">ענן משרד</div>
                <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">Super Admin</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
            
            {!isAuditServiceRole && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2">אזורי ניהול</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADMIN_AREAS.map((area) => {
                    const isActive = adminArea === area;
                    // Colors mapping for active state
                    const colors: Record<AdminArea, string> = {
                      customers: 'bg-blue-600',
                      users: 'bg-purple-600',
                      support: 'bg-green-600',
                      product: 'bg-orange-600',
                      content: 'bg-pink-600',
                      infra: 'bg-slate-700',
                      bot: 'bg-teal-600',
                      ai: 'bg-indigo-600',
                      analytics: 'bg-amber-600',
                      telephony: 'bg-cyan-600',
                    };

                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => switchAdminArea(area)}
                        className={`
                          relative overflow-hidden px-3 py-2 rounded-lg text-xs font-bold transition-all text-right
                          ${isActive 
                            ? `${colors[area]} text-white shadow-sm ring-1 ring-black/5` 
                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'}
                        `}
                      >
                        <span className="relative z-10">{getAdminAreaLabel(area)}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="px-2 text-[11px] text-slate-400 font-medium">
                  {getAdminAreaDescription(adminArea)}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-2 block">תפריט</label>
              {(isAuditServiceRole ? effectiveNavItems : effectiveNavItems.filter((item) => item.href !== dashboardItem.href)).map((item) => {
                const active = isActivePath(pathname, item.href, currentSearch);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      admin-nav-item group
                      ${active ? 'active' : ''}
                    `}
                  >
                    <Icon 
                      size={16} 
                      className={active ? 'text-slate-300' : 'text-slate-400 group-hover:text-slate-600'} 
                      strokeWidth={active ? 2.5 : 2}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <Avatar src={currentUser?.avatar || null} name={userName} size="sm" rounded="full" className="ring-2 ring-white shadow-sm" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-slate-900 truncate">{userName}</div>
                <div className="text-xs text-slate-500 truncate">{userRole}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 md:mr-72 bg-[#F8FAFC]">
          <SharedHeader
            title="ענן משרד"
            subtitle={`Super Admin · ${getAdminAreaLabel(adminArea)}`}
            currentDate={new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
            mobileBrand={{ name: 'ענן משרד', badgeModuleKey: 'system' }}
            onOpenCommandPaletteAction={() => setCommandPaletteOpen(true)}
            onOpenSupportAction={() => openSupport?.()}
            onOpenMobileNavAction={() => setIsMobileNavOpen(true)}
            user={{ name: userName, role: userRole }}
            userAvatarSlot={<Avatar src={currentUser?.avatar || null} name={userName} size="md" rounded="full" />}
            switcherSlot={!isAuditServiceRole ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  onClick={() => router.push('/app/admin/ai')}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                  title="ניהול AI"
                >
                  <BrainCircuit size={18} />
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push('/app/admin/global/links')}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                  title="מרכז קישורים"
                >
                  <Globe size={18} />
                </Button>
                <Button
                  type="button"
                  onClick={() => router.push(getReturnToPath())}
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="חזרה לאפליקציה"
                >
                  <ArrowRight size={18} />
                </Button>
              </div>
            ) : null}
            className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm"
          />

          <div className="flex-1 p-4 md:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>

        {/* Mobile Navigation Drawer */}
        <div 
          className={`
            fixed inset-y-0 right-0 w-[85%] max-w-xs bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col
            ${isMobileNavOpen ? 'translate-x-0' : 'translate-x-full'}
          `}
        >
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="font-bold text-slate-900">תפריט ניהול</div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileNavOpen(false)} className="h-8 w-8 rounded-full hover:bg-slate-200/50">
              <ArrowRight size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
             {/* Mobile Area Switcher */}
             {!isAuditServiceRole && (
               <div className="space-y-3">
                 <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">אזורי ניהול</label>
                 <div className="grid grid-cols-2 gap-2">
                   {ADMIN_AREAS.map((area) => (
                     <button
                       key={area}
                       onClick={() => { switchAdminArea(area); }}
                       className={`
                         px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-center border
                         ${adminArea === area
                           ? 'bg-slate-900 text-white border-slate-900'
                           : 'bg-white text-slate-600 border-slate-200'}
                       `}
                     >
                       {getAdminAreaLabel(area)}
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {/* Mobile Links */}
             <div className="space-y-1">
               <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">ניווט</label>
               {effectiveNavItems.map((item) => {
                  const active = isActivePath(pathname, item.href, currentSearch);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all
                        ${active
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 bg-slate-50 border border-slate-100'}
                      `}
                    >
                      <Icon size={18} className={active ? 'text-slate-300' : 'text-slate-500'} />
                      <span>{item.label}</span>
                    </Link>
                  );
               })}
             </div>
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50">
             <Button 
               onClick={() => { setIsMobileNavOpen(false); router.push(getReturnToPath()); }}
               className="w-full bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
               variant="outline"
             >
               <ArrowRight size={16} className="ml-2" />
               חזרה לאפליקציה
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

      </div>
    </AdminGuard>
  );
}
