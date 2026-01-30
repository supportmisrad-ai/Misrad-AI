'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { LayoutGrid, Building2, Users, Sparkles, ScrollText, Server, SlidersHorizontal, Globe, LifeBuoy, Moon, ArrowRight, RefreshCw, ChevronDown, ChevronRight, Shield, ShieldCheck, MoreHorizontal } from 'lucide-react';
import { AdminGuard } from '@/components/AdminGuard';
import { useData } from '@/context/DataContext';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { Avatar } from '@/components/Avatar';
import CommandPalette from '@/components/CommandPalette';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';
import { Button } from '@/components/ui/button';

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

  const [expandedGroups, setExpandedGroups] = useState<{ global: boolean; nexus: boolean; social: boolean; system: boolean; client: boolean; landing: boolean }>(() => ({
    global: pathname.startsWith('/app/admin/global'),
    nexus: pathname.startsWith('/app/admin/nexus'),
    social: pathname.startsWith('/app/admin/social'),
    system: pathname.startsWith('/app/admin/system'),
    client: pathname.startsWith('/app/admin/client'),
    landing: pathname.startsWith('/app/admin/landing'),
  }));

  useEffect(() => {
    setExpandedGroups((prev) => ({
      global: prev.global || pathname.startsWith('/app/admin/global'),
      nexus: prev.nexus || pathname.startsWith('/app/admin/nexus'),
      social: prev.social || pathname.startsWith('/app/admin/social'),
      system: prev.system || pathname.startsWith('/app/admin/system'),
      client: prev.client || pathname.startsWith('/app/admin/client'),
      landing: prev.landing || pathname.startsWith('/app/admin/landing'),
    }));
  }, [pathname]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      }
    };

    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true } as any);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  const navItems = useMemo(
    () => [
      { href: '/app/admin', label: 'דשבורד', icon: LayoutGrid },
      { href: '/app/admin/modules', label: 'מודולים', icon: SlidersHorizontal },
      { href: '/app/admin/organizations', label: 'ארגונים', icon: Building2 },
      { href: '/app/admin/users', label: 'משתמשים', icon: Users },
      { href: '/app/admin/tenants', label: 'טננטים', icon: Server },
      { href: '/app/admin/system-flags', label: 'מתגי מערכת', icon: SlidersHorizontal },
      { href: '/app/admin/support', label: 'תמיכה', icon: LifeBuoy },
      { href: '/app/admin/ai', label: 'בינה מלאכותית', icon: Sparkles },
      { href: '/app/admin/logs', label: 'לוגים', icon: ScrollText },
    ],
    []
  );

  const effectiveNavItems = useMemo(() => {
    if (!isAuditServiceRole) return navItems;
    return navItems.filter((i) => i.href === '/app/admin/logs');
  }, [isAuditServiceRole, navItems]);

  const mobileNavItems = useMemo(() => {
    const find = (href: string) => effectiveNavItems.find((i) => i.href === href);
    const base = [
      find('/app/admin'),
      find('/app/admin/users'),
      find('/app/admin/ai'),
      find('/app/admin/logs'),
    ].filter(Boolean) as any[];
    return base;
  }, [effectiveNavItems]);

  const globalSubItems = useMemo(
    () => [
      { href: '/app/admin/global/control', label: 'בקרת מערכת' },
      { href: '/app/admin/global/ai', label: 'מוח ה-AI' },
      { href: '/app/admin/global/links', label: 'מרכז קישורים' },
      { href: '/app/admin/global/downloads', label: 'הורדות' },
      { href: '/app/admin/global/help-videos', label: 'ניהול סרטוני הדרכה' },
      { href: '/app/admin/global/work-listings', label: 'Work Listings' },
      { href: '/app/admin/global/users', label: 'ניהול משתמשים' },
      { href: '/app/admin/global/data', label: 'דאטה' },
      { href: '/app/admin/global/updates', label: 'עדכונים' },
      { href: '/app/admin/global/versions', label: 'גרסאות' },
      { href: '/app/admin/global/approvals', label: 'אישורי משתמשים' },
      { href: '/app/admin/global/announcements', label: 'הודעות מערכת' },
    ],
    []
  );

  const nexusSubItems = useMemo(
    () => [
      { href: '/app/admin/nexus/control', label: 'בקרת מערכת' },
      { href: '/app/admin/nexus/tenants', label: 'לקוחות SaaS' },
      { href: '/app/admin/nexus/intelligence', label: 'בינה' },
      { href: '/app/admin/nexus/invitations', label: 'הזמנות' },
      { href: '/app/admin/nexus/announcements', label: 'הודעות מערכת' },
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
      { href: '/app/admin/social?tab=updates', label: 'עדכוני מערכת' },
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
      { href: '/app/admin/client/support', label: 'קריאות תמיכה' },
      { href: '/app/admin/client/features', label: "בקשות פיצ'רים" },
      { href: '/app/admin/client/announcements', label: 'הודעות מערכת' },
    ],
    []
  );

  const landingSubItems = useMemo(
    () => [
      { href: '/app/admin/landing/pricing', label: 'תמחור' },
      { href: '/app/admin/landing/payment-links', label: 'לינקים לתשלום' },
      { href: '/app/admin/landing/partners', label: 'שותפים' },
      { href: '/app/admin/landing/founder', label: 'מייסד' },
      { href: '/app/admin/landing/logo', label: 'לוגו' },
      { href: '/app/admin/landing/videos', label: 'וידאו' },
      { href: '/app/admin/landing/package-videos', label: 'וידאו לחבילות' },
      { href: '/app/admin/landing/branding', label: 'מיתוג' },
      { href: '/app/admin/landing/announcements', label: 'הודעות מערכת' },
    ],
    []
  );

  const commandPaletteNavItems = useMemo(() => {
    const main = effectiveNavItems.map((i) => ({ id: i.href, label: i.label, icon: i.icon }));
    if (isAuditServiceRole) {
      return main;
    }
    const global = globalSubItems.map((i) => ({ id: i.href, label: `גלובלי · ${i.label}`, icon: Globe }));
    const nexus = nexusSubItems.map((i) => ({ id: i.href, label: `נקסוס · ${i.label}`, icon: Sparkles }));
    const social = socialSubItems.map((i) => ({ id: i.href, label: `סושיאל · ${i.label}`, icon: ShieldCheck }));
    const system = systemSubItems.map((i) => ({ id: i.href, label: `System · ${i.label}`, icon: Server }));
    const client = clientSubItems.map((i) => ({ id: i.href, label: `Client · ${i.label}`, icon: Users }));
    const landing = landingSubItems.map((i) => ({ id: i.href, label: `דף נחיתה · ${i.label}`, icon: Globe }));
    return [...main, ...global, ...nexus, ...social, ...system, ...client, ...landing];
  }, [clientSubItems, effectiveNavItems, globalSubItems, isAuditServiceRole, landingSubItems, nexusSubItems, socialSubItems, systemSubItems]);

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

        <aside className="hidden md:flex w-72 shrink-0 flex-col border-l border-slate-200/70 bg-white/80 backdrop-blur-3xl h-screen relative z-20 shadow-2xl shadow-slate-200/60 overflow-hidden">
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

          <nav className="p-3 flex-1 min-h-0 overflow-y-auto relative z-10">
            {effectiveNavItems.map((item) => {
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
              <Button
                type="button"
                onClick={() => setExpandedGroups((s) => ({ ...s, global: !s.global }))}
                variant="ghost"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                  pathname.startsWith('/app/admin/global')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Globe size={18} />
                <span className="flex-1 text-right">גלובלי</span>
                {expandedGroups.global ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>

              {expandedGroups.global ? (
                <div className="space-y-1 pr-4">
                  {globalSubItems.map((sub) => {
                    const active = isActivePath(pathname, sub.href, currentSearch);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          active ? 'bg-emerald-100/70 text-emerald-800 border border-emerald-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                onClick={() => setExpandedGroups((s) => ({ ...s, nexus: !s.nexus }))}
                variant="ghost"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                  pathname.startsWith('/app/admin/nexus')
                    ? 'bg-indigo-50 text-indigo-800 border border-indigo-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Sparkles size={18} />
                <span className="flex-1 text-right">נקסוס</span>
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
                          active ? 'bg-indigo-100/70 text-indigo-800 border border-indigo-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                <span className="flex-1 text-right">סושיאל</span>
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
                          active ? 'bg-blue-100/70 text-blue-800 border border-blue-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                <Server size={18} />
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
                          active ? 'bg-red-100/70 text-red-800 border border-red-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                    ? 'bg-purple-50 text-purple-800 border border-purple-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users size={18} />
                <span className="flex-1 text-right">Client</span>
                {expandedGroups.client ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>

              {expandedGroups.client ? (
                <div className="space-y-1 pr-4">
                  {clientSubItems.map((sub) => {
                    const active = isActivePath(pathname, sub.href, currentSearch);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          active ? 'bg-purple-100/70 text-purple-800 border border-purple-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                onClick={() => setExpandedGroups((s) => ({ ...s, landing: !s.landing }))}
                variant="ghost"
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                  pathname.startsWith('/app/admin/landing')
                    ? 'bg-purple-50 text-purple-800 border border-purple-100'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Globe size={18} />
                <span className="flex-1 text-right">דף נחיתה</span>
                {expandedGroups.landing ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </Button>

              {expandedGroups.landing ? (
                <div className="space-y-1 pr-4">
                  {landingSubItems.map((sub) => {
                    const active = isActivePath(pathname, sub.href, currentSearch);
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                          active ? 'bg-purple-100/70 text-purple-800 border border-purple-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex-1">{sub.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
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

        <main className="flex-1 flex flex-col min-w-0 relative z-10">
          <SharedHeader
            title="ענן משרד"
            subtitle="Super Admin"
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
          leads={[] as any}
          navItems={commandPaletteNavItems as any}
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
                  {navItems.map((item) => {
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
                  <div className="text-xs font-black text-slate-500 px-2 pt-2">גלובלי</div>
                  <div className="grid grid-cols-2 gap-2">
                    {globalSubItems.map((sub) => {
                      const active = isActivePath(pathname, sub.href, currentSearch);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMobileNavOpen(false)}
                          className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                            active ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2 pt-2">נקסוס</div>
                  <div className="grid grid-cols-2 gap-2">
                    {nexusSubItems.map((sub) => {
                      const active = isActivePath(pathname, sub.href, currentSearch);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          onClick={() => setIsMobileNavOpen(false)}
                          className={`px-4 py-3 rounded-2xl font-black text-xs transition-colors ${
                            active ? 'bg-indigo-50 text-indigo-800 border border-indigo-100' : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2 pt-2">סושיאל</div>
                  <div className="grid grid-cols-2 gap-2">
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
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2 pt-2">System</div>
                  <div className="grid grid-cols-2 gap-2">
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
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2 pt-2">Client</div>
                  <div className="grid grid-cols-2 gap-2">
                    {clientSubItems.map((sub) => {
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
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>

                  <div className="text-xs font-black text-slate-500 px-2 pt-2">דף נחיתה</div>
                  <div className="grid grid-cols-2 gap-2">
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
                          <span className="block truncate">{sub.label}</span>
                        </Link>
                      );
                    })}
                  </div>
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
