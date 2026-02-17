'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, TrendingUp, Plug, Settings, Menu, User as UserIcon, Compass } from 'lucide-react';
import { useAuth } from '../system/contexts/AuthContext';
import { useToast } from '../system/contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { buildDocumentTitle } from '@/lib/room-branding';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { DataProvider } from '@/context/DataContext';
import { MeView } from '@/views/MeView';
import CommandPalette from './CommandPalette';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { GlobalNotificationsBell } from '@/components/shared/GlobalNotificationsBell';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import type { User as AppUser } from '@/types';

// Import placeholder components
import IntegrationsView from './integrations/IntegrationsView';
import OverviewView from './OverviewView';

const FinanceBootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center z-50">
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[40px] flex items-center justify-center text-white mb-8 shadow-2xl shadow-emerald-500/30 animate-bounce">
          <CreditCard size={48} strokeWidth={1.5} />
        </div>
        <div className="w-64 h-1.5 bg-emerald-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-1000 ease-out" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="mt-6 text-[10px] font-bold text-emerald-300 uppercase tracking-[0.3em] animate-pulse">מתניע כספת דיגיטלית...</p>
      </div>
    </div>
  );
};

const FinanceOSApp: React.FC<{
  initialFinanceOverview?: unknown;
  initialCurrentUser?: AppUser;
  initialOrganization?: Partial<{ name: string; logo: string; slug: string; id: string }>;
}> = ({ initialFinanceOverview, initialCurrentUser, initialOrganization }) => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { pathname, roomName } = useRoomBranding();
  const nextPathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [booted, setBooted] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const orgSlug = React.useMemo(() => parseWorkspaceRoute(nextPathname).orgSlug, [nextPathname]);

  const userRecord = user as unknown as Record<string, unknown> | null;
  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: (userRecord?.name as string) ?? null,
    role: (userRecord?.role as string) ?? null,
    avatarUrl: (userRecord?.avatar as string) ?? null,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const onBootComplete = useCallback(() => {
    setBooted(true);
    sessionStorage.setItem('finance_booted', 'true');
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('finance_booted');
    if (saved === 'true') {
      setBooted(true);
    }
  }, []);

  const navItems = [
    { id: 'overview', label: 'סקירה כללית', icon: TrendingUp },
    { id: 'integrations', label: 'אינטגרציות', icon: Plug },
    { id: 'hub', label: 'הגדרות', icon: Settings }
  ];

  const activeNavItem = navItems.find(item => item.id === activeTab);

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (!tab) return;
    const allowed = new Set(['overview', 'integrations', 'hub']);
    if (!allowed.has(tab)) return;
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [activeTab, searchParams]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = buildDocumentTitle({ pathname, screenName: activeNavItem?.label || null });
  }, [activeNavItem?.label, pathname]);

  const basePath = React.useMemo(() => {
    const info = parseWorkspaceRoute(nextPathname);
    if (info.orgSlug && info.module === 'finance') {
      return `/w/${encodeURIComponent(info.orgSlug)}/finance`;
    }
    return '/finance';
  }, [nextPathname]);

  const tourUrl = React.useMemo(() => {
    if (orgSlug) return `/w/${encodeURIComponent(orgSlug)}/nexus?tour=1`;
    return null;
  }, [orgSlug]);

  const [showTourPrompt, setShowTourPrompt] = useState(false);
  useEffect(() => {
    if (!orgSlug) return;
    if (typeof window === 'undefined') return;
    const key = `nexus_seen_tour_prompt_v1:finance:${encodeURIComponent(String(orgSlug))}`;
    try {
      const seen = window.localStorage.getItem(key);
      if (!seen) setShowTourPrompt(true);
    } catch {
      // ignore
    }
  }, [orgSlug]);

  const isMeRoute = React.useMemo(() => {
    return Boolean(nextPathname && nextPathname.startsWith(`${basePath}/me`));
  }, [basePath, nextPathname]);

  const isHubRoute = React.useMemo(() => {
    return Boolean(nextPathname && nextPathname.startsWith(`${basePath}/hub`));
  }, [basePath, nextPathname]);

  React.useEffect(() => {
    if (!booted) return;
    if (!isHubRoute) return;
    const drawer = searchParams?.get('drawer');
    if (drawer !== 'finance') return;
    router.replace(`${basePath}/hub`);
  }, [basePath, booted, isHubRoute, router, searchParams]);

  React.useEffect(() => {
    if (!booted) return;
    if (isHubRoute && activeTab !== 'hub') {
      setActiveTab('hub');
    }
    if (!isHubRoute && activeTab === 'hub') {
      setActiveTab('overview');
    }
  }, [activeTab, booted, isHubRoute]);

  React.useEffect(() => {
    if (!booted) return;
    if (isMeRoute && activeTab !== 'me') {
      setActiveTab('me');
    }
    if (!isMeRoute && activeTab === 'me') {
      setActiveTab('overview');
    }
  }, [activeTab, booted, isMeRoute]);

  React.useEffect(() => {
    if (!booted) return;
    if (activeTab !== 'hub') return;
    if (isHubRoute) return;
    router.push(`${basePath}/hub`);
  }, [activeTab, basePath, booted, isHubRoute, nextPathname, router]);

  React.useEffect(() => {
    if (!booted) return;
    if (activeTab !== 'me') return;
    if (isMeRoute) return;
    router.push(`${basePath}/me`);
  }, [activeTab, basePath, booted, isMeRoute, router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (user) setIsCommandPaletteOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true });
  }, [user]);

  const tourPrompt =
    showTourPrompt && !isMeRoute ? (
      <div className="mb-6 rounded-[1.5rem] bg-white/80 backdrop-blur border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/15 shrink-0">
              <Compass size={18} />
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-slate-900">חדש כאן?</div>
              <div className="text-xs text-slate-500 mt-1">סיור 30 שניות שמסביר איפה הדברים נמצאים במערכת.</div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              type="button"
              className="h-11 px-5 inline-flex items-center justify-center rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-black transition-colors"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined' && orgSlug) {
                    const key = `nexus_seen_tour_prompt_v1:finance:${encodeURIComponent(String(orgSlug))}`;
                    window.localStorage.setItem(key, 'true');
                  }
                } catch {
                  // ignore
                }
                setShowTourPrompt(false);
                if (tourUrl) router.push(tourUrl);
              }}
              disabled={!tourUrl}
            >
              התחל סיור
            </button>
            <button
              type="button"
              className="h-11 px-5 rounded-xl bg-white/70 border border-slate-200 text-sm font-black text-slate-700 hover:bg-white hover:text-slate-900 transition-all"
              onClick={() => {
                try {
                  if (typeof window !== 'undefined' && orgSlug) {
                    const key = `nexus_seen_tour_prompt_v1:finance:${encodeURIComponent(String(orgSlug))}`;
                    window.localStorage.setItem(key, 'true');
                  }
                } catch {
                  // ignore
                }
                setShowTourPrompt(false);
              }}
            >
              לא עכשיו
            </button>
          </div>
        </div>
      </div>
    ) : null;

  if (!user) {
    return <div className="p-8 text-center">נדרש התחברות</div>;
  }

  if (!booted) {
    return <FinanceBootScreen onComplete={onBootComplete} />;
  }

  const isProbablyTokenOrId = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return true;
    if (trimmed.length > 40) return true;
    if (/^[A-Za-z0-9_-]{25,}$/.test(trimmed)) return true;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) return true;
    return false;
  };

  const safeUserName = isProbablyTokenOrId(String(user?.name ?? ''))
    ? (String(user?.email ?? '').split('@')[0] || 'משתמש')
    : String(user?.name ?? '');

  const headerName = systemIdentity?.name || safeUserName;
  const headerRole = systemIdentity?.role || null;

  const currentDate = React.useMemo(
    () => new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
    []
  );

  const moduleTitle = roomName || 'Finance';
  const screenTitle = activeNavItem?.label || null;

  const fallbackIcon = <OSModuleSquircleIcon moduleKey="finance" boxSize={40} iconSize={18} className="shadow-none" />;

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewView initialFinanceOverview={initialFinanceOverview} />;
      case 'integrations':
        return <IntegrationsView />;
      case 'me':
        return (
          <DataProvider initialCurrentUser={initialCurrentUser as AppUser | undefined} initialOrganization={initialOrganization}>
            <MeView
              basePathOverride={basePath}
              moduleCards={
                basePath
                  ? [
                      {
                        title: 'אינטגרציות',
                        subtitle: 'חיבור חשבונית ירוקה ומערכות נוספות',
                        href: `${basePath}?tab=integrations`,
                        iconId: 'trending_up',
                      },
                      {
                        title: 'הגדרות פיננסיות',
                        subtitle: 'מסמכים, אינטגרציות ותשלומים',
                        href: `${basePath}/hub`,
                        iconId: 'settings',
                      },
                    ]
                  : undefined
              }
            />
          </DataProvider>
        );
      case 'hub':
        return <IntegrationsView />;
      default:
        return <OverviewView />;
    }
  };

  const goToMe = () => {
    router.push(`${basePath}/me`);
  };

  const navigateToTab = (tabId: string) => {
    if (tabId === 'me') {
      router.push(`${basePath}/me`);
      return;
    }
    if (tabId === 'hub') {
      router.push(`${basePath}/hub`);
      return;
    }
    if (tabId === 'overview') {
      router.push(basePath);
      return;
    }
    router.push(`${basePath}?tab=${encodeURIComponent(tabId)}`);
  };

  const isActiveAction = (path: string) => {
    const id = path.replace('/', '');
    return id === activeTab;
  };

  const onNavigateAction = (path: string) => {
    const id = path.replace('/', '');
    navigateToTab(id);
    setIsMobileMenuOpen(false);
  };

  const viewNavItems = navItems.map((item) => ({ label: item.label, path: `/${item.id}`, icon: item.icon }));

  const avatarSlot = (
    <Avatar
      src={systemIdentity?.avatarUrl || null}
      alt={headerName}
      name={headerName}
      size="md"
      rounded="full"
      className="border-2 border-white shadow-sm"
    />
  );

  const notificationsSlot = <GlobalNotificationsBell />;

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 overflow-hidden" dir="rtl">
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: String(initialOrganization?.name || moduleTitle),
          logoUrl: initialOrganization?.logo || null,
          fallbackIcon,
          badgeModuleKey: 'finance',
        }}
        brandSubtitle={moduleTitle}
        onBrandClickAction={() => router.push('/workspaces')}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={String(initialOrganization?.name || moduleTitle)} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={viewNavItems}
        primaryNavPaths={viewNavItems.map((n) => n.path)}
        isActiveAction={isActiveAction}
        onNavigateAction={onNavigateAction}
        bottomSlot={
          <OSAppSwitcher
            compact={true}
            buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
            buttonLabel="מודולים"
            className={isSidebarOpen ? '' : 'w-full flex justify-center'}
            orgSlug={orgSlug || undefined}
            currentModule="finance"
          />
        }
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <SharedHeader
          title={moduleTitle}
          subtitle={screenTitle || currentDate}
          currentDate={currentDate}
          mobileBrand={{
            name: moduleTitle,
            logoUrl: initialOrganization?.logo || null,
            fallbackIcon,
            badgeModuleKey: 'finance',
          }}
          mobileLeadingSlot={
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-full hover:bg-white/50 text-gray-600"
              aria-label="פתח תפריט"
              type="button"
            >
              <Menu size={18} />
            </button>
          }
          onOpenCommandPaletteAction={() => setIsCommandPaletteOpen(true)}
          onOpenSupportAction={undefined}
          actionsSlot={<ModuleHelpVideos moduleKey="finance" />}
          switcherSlot={<WorkspaceSwitcher />}
          notificationsSlot={notificationsSlot}
          user={{ name: headerName, role: headerRole }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me`}
          userAvatarSlot={avatarSlot}
          profileSlot={undefined}
          className="bg-transparent"
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 pb-32 w-full relative" id="main-scroll-container">
          {tourPrompt}
          {renderContent()}
        </main>
      </main>

      <AnimatePresence>
        {isMobileMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 400 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.35 }}
              onDragEnd={(_, info) => {
                const shouldClose = info.offset.y > 110 || info.velocity.y > 900;
                if (shouldClose) setIsMobileMenuOpen(false);
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] border-t border-white/50"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
              role="dialog"
              aria-modal="true"
              aria-label="תפריט"
            >
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 opacity-50"></div>

              <div className="grid grid-cols-4 gap-4">
                {[
                  { id: 'overview', label: 'סקירה', icon: TrendingUp, onClick: () => navigateToTab('overview') },
                  { id: 'integrations', label: 'אינטגרציות', icon: Plug, onClick: () => navigateToTab('integrations') },
                  { id: 'hub', label: 'הגדרות', icon: Settings, onClick: () => navigateToTab('hub') },
                  { id: 'me', label: 'פרופיל', icon: UserIcon, onClick: goToMe },
                ].map((item) => {
                  const isActiveItem = item.id === 'me' ? activeTab === 'me' : activeTab === item.id;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.onClick();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex flex-col items-center gap-2 group"
                      aria-label={item.label}
                    >
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md border ${
                          isActiveItem
                            ? 'bg-slate-900 text-white shadow-slate-900/20 border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                        }`}
                      >
                        <Icon size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                      </div>
                      <span className={`text-[10px] font-bold text-center leading-tight ${isActiveItem ? 'text-slate-900' : 'text-slate-500'}`}>
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent my-5"></div>

              <div className="space-y-3">
                <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">מודולים</div>
                <OSAppSwitcher compact={true} orgSlug={orgSlug || undefined} currentModule="finance" />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <MobileBottomNav
        rightItems={[
          {
            id: 'overview',
            label: 'סקירה',
            icon: TrendingUp,
            active: activeTab === 'overview',
            onClick: () => navigateToTab('overview'),
          },
          {
            id: 'integrations',
            label: 'אינטגרציות',
            icon: Plug,
            active: activeTab === 'integrations',
            onClick: () => navigateToTab('integrations'),
          },
        ]}
        leftItems={[
          {
            id: 'hub',
            label: 'הגדרות',
            icon: Settings,
            active: activeTab === 'hub',
            onClick: () => navigateToTab('hub'),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: Menu,
            active: isMobileMenuOpen,
            onClick: () => setIsMobileMenuOpen(true),
          },
        ]}
        onPlusClickAction={() => setIsCommandPaletteOpen((open) => !open)}
        plusAriaLabel={isCommandPaletteOpen ? 'סגור פעולות' : 'פתח פעולות'}
        plusActive={isCommandPaletteOpen}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onCloseAction={() => setIsCommandPaletteOpen(false)}
        onNavigateAction={navigateToTab}
        navItems={navItems.map((n) => ({ id: n.id, label: n.label }))}
      />
    </div>
  );
};

export default FinanceOSApp;

