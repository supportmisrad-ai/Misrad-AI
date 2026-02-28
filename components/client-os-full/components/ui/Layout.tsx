'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { LayoutDashboard, Users, Settings, Sparkles, Cpu, MessageSquareQuote, ChevronRight, ClipboardList, GitMerge, Bell, Plus, Menu, Mail, Layers, X, Send, SquareMousePointer } from 'lucide-react';
import NotificationsPanel from '../NotificationsPanel';
import { Notification } from '../../types';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { CustomSelect } from '@/components/CustomSelect';
import { useNexus } from '../../context/ClientContext';
import { usePathname, useRouter } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import { getOSModule } from '@/types/os-modules';
import { ModuleBackground } from '@/components/shared/ModuleBackground';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onNavigate: (view: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onNavigate }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications: contextNotifications } = useNexus();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportDraft, setSupportDraft] = useState({ category: 'Tech', subject: '', message: '' });
  const [supportError, setSupportError] = useState<string | null>(null);
  const [supportTicketId, setSupportTicketId] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(contextNotifications);
  const { title, roomName } = useRoomBranding();
  const isWorkspaceRoute = Boolean(pathname?.startsWith('/w/'));

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [workspaceBrand, setWorkspaceBrand] = useState<{ name: string; logoUrl?: string | null }>({
    name: roomName || 'Client',
    logoUrl: null,
  });

  const fallbackIcon = <OSModuleSquircleIcon moduleKey="client" boxSize={40} iconSize={18} className="shadow-none" />;

  const [clientUserData, setClientUserData] = useState<Record<string, unknown> | null>(null);
  const [currentDate, setCurrentDate] = useState<string>('—');
  const [greeting, setGreeting] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    try {
      setClientUserData(((window as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as Record<string, unknown>) || null);
    } catch {
      setClientUserData(null);
    }

    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) setGreeting('בוקר טוב');
    else if (hour < 18) setGreeting('צהריים טובים');
    else setGreeting('ערב טוב');

    setCurrentDate(now.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  const userLabel = useMemo(() => {
    const userData = clientUserData as Record<string, unknown> | null | undefined;
    const identity = userData?.identity as Record<string, unknown> | undefined;
    const rawName = identity?.name || userData?.name || '';
    const rawRole = identity?.role || userData?.role || '';
    const name = String(rawName || '').trim();
    const roleLabel = String(rawRole || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return { name: name || null, roleLabel: roleLabel || null, initials: initials || null };
  }, [clientUserData]);

  const orgSlug = useMemo(() => parseWorkspaceRoute(pathname).orgSlug, [pathname]);

  const basePath = useMemo(() => {
    const info = parseWorkspaceRoute(pathname);
    if (info.orgSlug && info.module === 'client') {
      return `/w/${encodeURIComponent(info.orgSlug)}/client`;
    }
    return '/client';
  }, [pathname]);

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug || null, {
    name: userLabel.name,
    role: userLabel.roleLabel,
    avatarUrl: null,
  });

  const displayInitials = useMemo(() => {
    const name = String(systemIdentity?.name || userLabel.name || '').trim();
    const initials = name
      ? name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p: string) => p[0])
          .join('')
          .toUpperCase()
      : '';
    return initials || userLabel.initials || null;
  }, [systemIdentity?.name, userLabel.initials, userLabel.name]);

  const shouldResolveLogoRef = useMemo(() => {
    const raw = String(workspaceBrand.logoUrl || '').trim();
    return raw.startsWith('sb://');
  }, [workspaceBrand.logoUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const userData = ((window as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as Record<string, unknown> | null) || null;
    const orgSlug = String(userData?.organizationSlug || userData?.orgSlug || '') || null;
    const org = (userData?.organization && typeof userData.organization === 'object' ? userData.organization : null) as Record<string, unknown> | null;
    const orgName = org?.name || org?.name_he || org?.id || null;
    const logoUrl = (typeof org?.logo === 'string' ? org.logo : null) as string | null;
    if (!orgName) return;
    setWorkspaceBrand({ name: String(orgName), logoUrl: String(logoUrl || '') });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!shouldResolveLogoRef) return;

    const controller = new AbortController();

    const run = async () => {
      try {
        const userData = ((window as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as Record<string, unknown> | null) || null;
        const injectedOrgId = String(userData?.organizationId || '') || '';
        const routeOrgSlug = String(orgSlug || '').trim();
        const targetSlug = routeOrgSlug;
        const targetOrgId = injectedOrgId.trim();
        if (!targetSlug && !targetOrgId) return;

        const res = await fetch('/api/workspaces', {
          cache: 'no-store',
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) return;

        const raw = (await res.json().catch(() => null)) as unknown;
        const obj = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
        const data = (obj?.data && typeof obj.data === 'object' ? (obj.data as Record<string, unknown>) : obj) as
          | Record<string, unknown>
          | null;
        const list = (data?.workspaces && Array.isArray(data.workspaces) ? data.workspaces : []) as unknown[];

        const normalizeSlug = (s: string) => {
          const trimmed = String(s || '').trim();
          if (!trimmed) return '';
          try {
            return decodeURIComponent(trimmed);
          } catch {
            return trimmed;
          }
        };

        const targetSlugNorm = normalizeSlug(targetSlug);

        const match = list.find((w) => {
          if (!w || typeof w !== 'object') return false;
          const row = w as Record<string, unknown>;
          const rowId = String(row.id || '').trim();
          const rowSlug = normalizeSlug(String(row.slug || ''));
          if (targetOrgId && rowId && rowId === targetOrgId) return true;
          if (targetSlugNorm && rowSlug && rowSlug === targetSlugNorm) return true;
          return false;
        });

        if (!match || typeof match !== 'object') return;
        const logo = (match as Record<string, unknown>).logo;
        const logoUrl = typeof logo === 'string' ? logo.trim() : '';
        if (!logoUrl || logoUrl.startsWith('sb://')) return;

        setWorkspaceBrand((prev) => {
          const current = String(prev.logoUrl || '').trim();
          if (!current || current.startsWith('sb://')) {
            return { ...prev, logoUrl };
          }
          return prev;
        });
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
      }
    };

    void run();
    return () => controller.abort();
  }, [orgSlug, shouldResolveLogoRef]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = title;
  }, [title]);

  // Sync notifications from context
  useEffect(() => {
    setNotifications(contextNotifications);
  }, [contextNotifications]);

  // Org-level feature flags (temporary hardcoded). Later: load from system_settings.system_flags.
  const featureFlags: Record<string, boolean> = {
    email: true,
    workflows: false,
  };

  const ALL_NAV_ITEMS = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'ראשי' },
    { id: 'clients', icon: Users, label: 'לקוחות' },
    { id: 'cycles', icon: Layers, label: 'מחזורים', separatorBefore: true },
    { id: 'email', icon: Mail, label: 'דואר' },
    { id: 'workflows', icon: GitMerge, label: 'תהליכים' },
    { id: 'forms', icon: ClipboardList, label: 'טפסים' },
    { id: 'feedback', icon: MessageSquareQuote, label: 'משובים' },
    { id: 'intelligence', icon: Cpu, label: 'פענוח' },
    { id: 'analyzer', icon: Sparkles, label: 'ניתוח' },
    { id: 'settings', icon: Settings, label: 'הגדרות', separatorBefore: true },
  ];

  const navItems = ALL_NAV_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const firstName = useMemo(() => {
    const name = String(systemIdentity?.name || userLabel.name || '').trim();
    if (!name) return '';
    return name.split(' ')[0] || '';
  }, [systemIdentity?.name, userLabel.name]);

  const moduleTitle = useMemo(() => roomName || 'Client', [roomName]);

  const headerTitle = useMemo(() => {
    if (activeView === 'dashboard') return 'לוח בקרה';
    const found = navItems.find((n) => n.id === activeView);
    return found?.label || moduleTitle;
  }, [activeView, moduleTitle, navItems]);

  const headerSubtitle = useMemo(() => {
    if (!isMounted) return null;
    if (activeView === 'dashboard') {
      if (!greeting) return null;
      return `${greeting}${firstName ? `, ${firstName}` : ''}`;
    }
    return null;
  }, [activeView, firstName, greeting, isMounted]);

  const screenTitle = useMemo(() => {
    const found = navItems.find((n) => n.id === activeView);
    return found?.label || null;
  }, [activeView, navItems]);

  const viewNavItems = useMemo(
    () => navItems.map((item) => ({ label: item.label, path: `/${item.id}`, icon: item.icon, separatorBefore: item.separatorBefore })),
    [navItems]
  );

  const isActiveAction = (path: string) => {
    const id = path.replace('/', '');
    return id === activeView;
  };

  const onNavigateAction = (path: string) => {
    const id = path.replace('/', '');
    onNavigate(id);
    setIsMobileMenuOpen(false);
  };

  const handleMarkAsRead = (id?: string) => {
      if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      } else {
          setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
  };

  const handleDismiss = (id: string) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleClearAll = () => {
      setNotifications([]);
  };

  const ALL_MOBILE_EXTRA_ITEMS = [
      { id: 'cycles', icon: Layers, label: 'מחזורים', desc: 'ניהול קבוצות לקוחות' },
      { id: 'email', icon: Mail, label: 'דואר', desc: 'מרכז תקשורת ו-AI' },
      { id: 'workflows', icon: GitMerge, label: 'תהליכים', desc: 'בניית שיטות עבודה' },
      { id: 'forms', icon: ClipboardList, label: 'טפסים', desc: 'שאלונים וקליטת לקוח' },
      { id: 'feedback', icon: MessageSquareQuote, label: 'משובים', desc: 'סקרים ו-NPS' },
      { id: 'analyzer', icon: Sparkles, label: 'ניתוח טקסט', desc: 'בדיקת שיחות חופשית' },
      { id: 'settings', icon: Settings, label: 'הגדרות', desc: 'ניהול המערכת' },
  ];

  const mobileExtraItems = ALL_MOBILE_EXTRA_ITEMS.filter((item) => featureFlags[item.id] !== false);

  const mobileNavItems = [
      { id: 'dashboard', icon: LayoutDashboard, label: 'בית' },
      { id: 'clients', icon: Users, label: 'לקוחות' },
      { id: 'ADD_ACTION', icon: Plus, label: 'פעולה' },
      { id: 'intelligence', icon: Cpu, label: 'AI' },
      { id: 'MENU', icon: Menu, label: 'תפריט' },
  ];

  const triggerCommand = () => {
      window.dispatchEvent(new CustomEvent('open-nexus-command'));
  };

  const plusConfig = useMemo(() => {
    if (activeView === 'dashboard') {
      return {
        ariaLabel: 'אירוע חדש',
        onClick: () => window.dispatchEvent(new CustomEvent('client-os:create-event')),
      };
    }

    if (activeView === 'clients') {
      return {
        ariaLabel: 'לקוח חדש',
        onClick: () => window.dispatchEvent(new CustomEvent('client-os:create-client')),
      };
    }

    if (activeView === 'email') {
      return {
        ariaLabel: 'הודעה חדשה',
        onClick: () => window.dispatchEvent(new CustomEvent('client-os:compose-email')),
      };
    }

    return {
      ariaLabel: 'פעולה מהירה',
      onClick: triggerCommand,
    };
  }, [activeView]);

  const openSupport = () => {
    setSupportError(null);
    setSupportTicketId(null);
    setIsSupportOpen(true);
  };

  const closeSupport = () => {
    setIsSupportOpen(false);
  };

  const submitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingSupport) return;

    setIsSubmittingSupport(true);
    setSupportError(null);
    setSupportTicketId(null);

    try {
      const organizationId =
        (typeof window !== 'undefined'
          ? ((window as unknown as Record<string, unknown>).__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined)?.organizationId
          : null) ?? null;

      const response = await fetch('/api/support', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(organizationId ? { 'x-org-id': String(organizationId) } : {}),
        },
        body: JSON.stringify({
          category: supportDraft.category,
          subject: supportDraft.subject,
          message: supportDraft.message,
          priority: 'medium',
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const errPayload = errorData?.data && typeof errorData.data === 'object' ? (errorData.data as Record<string, unknown>) : errorData;
        throw new Error(String(errorData?.error || errPayload?.error || 'שגיאה ביצירת קריאת תמיכה'));
      }

      const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const payload = data?.data && typeof data.data === 'object' ? (data.data as Record<string, unknown>) : data;
      const ticket = (payload?.ticket && typeof payload.ticket === 'object' ? payload.ticket : null) as Record<string, unknown> | null;
      const ticketNumber = String(ticket?.ticket_number || '').trim();
      setSupportTicketId(ticketNumber || '');
      setSupportDraft({ category: 'Tech', subject: '', message: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאה ביצירת קריאת תמיכה. אנא נסה שוב.';
      setSupportError(msg);
    } finally {
      setIsSubmittingSupport(false);
    }
  };

  const handleMobileNavClick = (id: string) => {
      if (id === 'MENU') {
          setIsMobileMenuOpen(true);
      } else if (id === 'ADD_ACTION') {
          triggerCommand();
      } else {
          onNavigate(id);
      }
  };

  const handleDrawerNav = (id: string) => {
      onNavigate(id);
      setIsMobileMenuOpen(false);
  };

  const notificationsSlot = (
    <button
      onClick={() => setIsNotificationsOpen(true)}
      className="relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/50 text-gray-600"
      aria-label="התראות"
      type="button"
    >
      <Bell size={18} />
      {unreadCount > 0 ? <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" /> : null}
    </button>
  );

  const switcherSlot = <WorkspaceSwitcher />;

  const userAvatarSlot = (
    <Avatar
      src={systemIdentity?.avatarUrl || null}
      alt={systemIdentity?.name || userLabel.name || 'User'}
      name={systemIdentity?.name || userLabel.name || 'User'}
      size="md"
      rounded="full"
      className="border-2 border-white shadow-sm"
    />
  );

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 overflow-hidden relative" dir="rtl">
      <ModuleBackground moduleKey="client" />
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: workspaceBrand.name,
          logoUrl: workspaceBrand.logoUrl || null,
          fallbackIcon,
          badgeModuleKey: 'client',
        }}
        brandSubtitle={roomName || 'Client'}
        onBrandClickAction={() => router.push('/workspaces')}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={workspaceBrand.name} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={viewNavItems}
        primaryNavPaths={['/dashboard', '/clients']}
        isActiveAction={isActiveAction}
        onNavigateAction={onNavigateAction}
        bottomSlot={
          <div className="space-y-3">
            <AttendanceMiniStatus />
            <OSAppSwitcher
              compact={true}
              buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
              buttonLabel="מודולים"
              className={isSidebarOpen ? '' : 'w-full flex justify-center'}
              orgSlug={orgSlug || undefined}
              currentModule="client"
            />
          </div>
        }
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <SharedHeader
          title={headerTitle}
          subtitle={headerSubtitle}
          currentDate={currentDate}
          mobileBrand={{
            name: moduleTitle,
            logoUrl: workspaceBrand.logoUrl || null,
            fallbackIcon,
            badgeModuleKey: 'client',
          }}
          onOpenCommandPaletteAction={triggerCommand}
          onOpenSupportAction={openSupport}
          actionsSlot={<ModuleHelpVideos moduleKey="client" />}
          switcherSlot={switcherSlot}
          notificationsSlot={notificationsSlot}
          user={{
            name: systemIdentity?.name || userLabel.name || '—',
            role: systemIdentity?.role || userLabel.roleLabel || null,
          }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me`}
          userAvatarSlot={userAvatarSlot}
          className="bg-transparent"
        />

        <main id="main-scroll-container" className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0">
          <div className="flex flex-col min-h-0 pb-36 md:pb-0">{children}</div>
        </main>
      </main>

      <MobileBottomNav
        rightItems={[
          {
            id: 'dashboard',
            label: 'בית',
            icon: LayoutDashboard,
            active: activeView === 'dashboard',
            onClick: () => handleMobileNavClick('dashboard'),
          },
          {
            id: 'clients',
            label: 'לקוחות',
            icon: Users,
            active: activeView === 'clients',
            onClick: () => handleMobileNavClick('clients'),
          },
        ]}
        leftItems={[
          {
            id: 'intelligence',
            label: 'AI',
            icon: Cpu,
            active: activeView === 'intelligence',
            onClick: () => handleMobileNavClick('intelligence'),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: SquareMousePointer,
            active: isMobileMenuOpen,
            onClick: () => handleMobileNavClick('MENU'),
          },
        ]}
        onPlusClickAction={plusConfig.onClick}
        plusAriaLabel={plusConfig.ariaLabel}
        plusGradient={getOSModule('client')?.gradient}
      />

      {/* DRAWER */}
      {isMobileMenuOpen ? (
        <div className="md:hidden fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Full menu">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
            role="presentation"
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] z-[100] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-white/50" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50" />
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-4">
                {navItems.filter((item) => !['dashboard', 'clients', 'intelligence'].includes(item.id)).map((item) => {
                  const isActiveItem = item.id === activeView;
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleDrawerNav(item.id)}
                      className="flex flex-col items-center gap-2 group"
                      aria-label={item.label}
                      type="button"
                    >
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${
                        isActiveItem
                          ? 'bg-[#C5A572] text-white shadow-[#C5A572]/30'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}>
                        <IconComponent size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-bold text-center leading-tight ${
                        isActiveItem ? 'text-[#C5A572]' : 'text-slate-500'
                      }`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />

              <button
                onClick={() => handleDrawerNav('me')}
                className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-[0.98] transition-transform"
                type="button"
              >
                <div className="w-12 h-12 bg-[#C5A572] text-white rounded-full flex items-center justify-center font-black text-lg shadow-md">
                  {(displayInitials || 'U').slice(0, 2)}
                </div>
                <div className="flex-1 text-right">
                  <span className="block font-bold text-gray-900" suppressHydrationWarning>
                    {systemIdentity?.name || userLabel.name || '—'}
                  </span>
                  <span className="text-xs text-gray-500" suppressHydrationWarning>
                    {systemIdentity?.role || userLabel.roleLabel || 'אזור אישי'}
                  </span>
                </div>
                <div className="p-2 text-gray-400 bg-gray-50 rounded-lg">
                  <ChevronRight size={20} className="rotate-180" />
                </div>
              </button>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />

              <div className="space-y-3">
                <AttendanceMiniStatus />
                <OSAppSwitcher mode="inlineGrid" compact={true} orgSlug={orgSlug || undefined} currentModule="client" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <NotificationsPanel
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onMarkAsRead={handleMarkAsRead}
        onDismiss={handleDismiss}
        onClearAll={handleClearAll}
      />

      {isSupportOpen ? (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={closeSupport}
          role="dialog"
          aria-modal="true"
          aria-label="תמיכה"
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-200/70 flex items-center justify-between">
              <div className="font-bold text-lg text-slate-900">תמיכה</div>
              <button
                onClick={closeSupport}
                className="p-2 text-slate-400 hover:text-slate-700"
                aria-label="סגור"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              {supportTicketId ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="text-emerald-800 font-bold">פנייתך התקבלה בהצלחה</div>
                  <div className="mt-1 text-sm text-emerald-700">מספר קריאה: {supportTicketId}</div>
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={closeSupport}
                      className="px-5 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 font-bold hover:bg-emerald-50 transition-colors"
                      type="button"
                    >
                      סגור
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={submitSupport} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">קטגוריה</label>
                      <CustomSelect
                        value={supportDraft.category}
                        onChange={(val) => setSupportDraft((prev) => ({ ...prev, category: val }))}
                        options={[
                          { value: 'Tech', label: 'תמיכה טכנית' },
                          { value: 'Account', label: 'חשבון ופרטים' },
                          { value: 'Billing', label: 'חיוב ומנויים' },
                          { value: 'Feature', label: 'בקשת פיצ׳ר' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase block mb-2">כותרת</label>
                      <input
                        value={supportDraft.subject}
                        onChange={(e) => setSupportDraft((prev) => ({ ...prev, subject: e.target.value }))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-nexus-primary"
                        placeholder="במה נוכל לעזור?"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">פירוט</label>
                    <textarea
                      value={supportDraft.message}
                      onChange={(e) => setSupportDraft((prev) => ({ ...prev, message: e.target.value }))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-nexus-primary min-h-[140px] resize-none"
                      placeholder="תאר את הבעיה/הבקשה..."
                      required
                    />
                  </div>

                  {supportError ? (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                      {supportError}
                    </div>
                  ) : null}

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      onClick={closeSupport}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                      type="button"
                      disabled={isSubmittingSupport}
                    >
                      ביטול
                    </button>
                    <button
                      className="px-6 py-3 rounded-xl bg-nexus-primary text-white font-bold hover:opacity-95 transition-all disabled:opacity-50 flex items-center gap-2"
                      type="submit"
                      disabled={isSubmittingSupport}
                    >
                      <Send size={16} className="rotate-180" />
                      {isSubmittingSupport ? 'שולח...' : 'שלח'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default Layout;
