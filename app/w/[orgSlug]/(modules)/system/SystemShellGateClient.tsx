'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LayoutDashboard, Menu, Mic, Users, PhoneCall, Network, Map, BarChart3, Settings, SquareMousePointer } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { CallAnalysisProvider } from '@/components/system/contexts/CallAnalysisContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import { TelephonyProvider, useTelephonyOptional } from '@/contexts/TelephonyContext';
import dynamic from 'next/dynamic';

const VoicecenterWidget = dynamic(() => import('@/components/telephony/VoicecenterWidget'), { ssr: false });
const ScreenPopNotification = dynamic(() => import('@/components/telephony/ScreenPopNotification'), { ssr: false });
import { NAV_ITEMS, NAV_GROUPS } from '@/components/system/constants';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import { GlobalNotificationsBell } from '@/components/shared/GlobalNotificationsBell';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { GlobalSupportModal } from '@/components/shared/GlobalSupportModal';
import { getOSModule } from '@/types/os-modules';
import type { OrganizationProfile, User } from '@/types';
import type { WorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { ModuleBackground } from '@/components/shared/ModuleBackground';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import MobileMenuAttendanceButton from '@/components/shared/MobileMenuAttendanceButton';

const SHELL_TABS = new Set([
  'workspace',
  'sales_leads',
  'sales_pipeline',
  'calendar',
  'dialer',
  'reports',
  'me',
  'settings',
  'notifications',
  'analytics',
  'forms',
  'automations',
  'call_analyzer',
  'partners',
  'teams',
  'field_map',
]);

type ShellUser = {
  id: string;
  avatar?: string | null;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  phone?: string | null;
  isSuperAdmin?: boolean;
};

const SystemShellContext = createContext<{ orgSlug: string; currentUser: ShellUser | null } | null>(null);

class ClerkProviderErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function useSystemShell() {
  const ctx = useContext(SystemShellContext);
  if (!ctx) {
    throw new Error('useSystemShell must be used within SystemShellGateClient');
  }
  return ctx;
}

function tabFromPathname(pathname: string | null | undefined) {
  if (!pathname) return null;
  const parts = pathname.split('/').filter(Boolean);
  const systemIndex = parts.indexOf('system');
  if (systemIndex === -1) return null;
  return parts[systemIndex + 1] || 'workspace';
}

function SystemShellGateClientCore({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
  systemIdentity,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: ShellUser;
  initialOrganization?: Partial<OrganizationProfile>;
  systemIdentity: WorkspaceSystemIdentity | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/w/${encodeURIComponent(orgSlug)}/system`;

  const activeTab = useMemo(() => tabFromPathname(pathname), [pathname]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlusFanOpen, setIsPlusFanOpen] = useState(false);
  const [isCalendarPlusOpen, setIsCalendarPlusOpen] = useState(false);
  const [, startTransition] = useTransition();

  // Prefetch main nav routes on fast connections, without blocking initial render
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (connection && (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g')) {
      return;
    }

    const prefetchAll = () => {
      const items = NAV_ITEMS;
      items.forEach((item) => {
        const href = `${basePath}${item.id === 'workspace' ? '' : `/${item.id}`}`;
        router.prefetch(href);
      });
    };

    if ('requestIdleCallback' in window) {
      const id = (window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number }).requestIdleCallback?.(
        prefetchAll,
        { timeout: 2000 }
      );
      return () => {
        if (!id) return;
        (window as unknown as { cancelIdleCallback?: (handle: number) => void }).cancelIdleCallback?.(id);
      };
    }

    const timeoutId = setTimeout(prefetchAll, 250);
    return () => clearTimeout(timeoutId);
  }, [basePath, router]);

  const shouldWrapWithShell = activeTab ? SHELL_TABS.has(activeTab) : false;

  // Side-effects-only callback for sidebar (Link handles actual navigation)
  const onSidebarItemClick = useCallback((path: string) => {
    setIsMobileMenuOpen(false);
    setIsPlusFanOpen(false);
    setIsCalendarPlusOpen(false);
  }, []);

  // Full navigation callback for programmatic nav (MobileBottomNav, etc.)
  const onNavigateAction = useCallback((path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    startTransition(() => router.push(href));
    setIsMobileMenuOpen(false);
    setIsPlusFanOpen(false);
    setIsCalendarPlusOpen(false);
  }, [basePath, router, startTransition]);

  if (!shouldWrapWithShell) {
    return (
      <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser ?? null }}>
        <ToastProvider>
          <AuthProvider initialCurrentUser={initialCurrentUser}>
            <CallAnalysisProvider>
              <BrandProvider>{children}</BrandProvider>
            </CallAnalysisProvider>
          </AuthProvider>
        </ToastProvider>
      </SystemShellContext.Provider>
    );
  }

  const contentOverflowClass = activeTab === 'sales_pipeline' ? 'overflow-hidden' : 'overflow-y-auto';

  const screenTitle = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'System';
  const moduleTitle = 'System';
  const orgTitle = String(initialOrganization?.name || moduleTitle);
  const currentDate = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const resolvedUser = {
    name: systemIdentity?.name || String(initialCurrentUser?.name || initialCurrentUser?.email || 'משתמש'),
    role: systemIdentity?.role || (initialCurrentUser?.isSuperAdmin ? 'סופר אדמין' : String(initialCurrentUser?.role || 'משתמש')),
    avatarUrl: systemIdentity?.avatarUrl || (typeof initialCurrentUser?.avatar === 'string' ? initialCurrentUser.avatar : ''),
    needsProfileCompletion: Boolean(systemIdentity?.needsProfileCompletion),
  };

  const avatarSlot = (
    <Avatar
      src={resolvedUser.avatarUrl || null}
      alt={resolvedUser.name}
      name={resolvedUser.name}
      size="md"
      rounded="full"
      className="border-2 border-white shadow-sm"
    />
  );

  const navItems = NAV_GROUPS.flatMap((group, gi) =>
    group.items.map((i, ii) => ({
      label: i.label,
      path: i.id === 'workspace' ? '/' : `/${i.id}`,
      icon: i.icon,
      ...(gi > 0 && ii === 0 ? { separatorBefore: true, sectionLabel: group.title || undefined } : {}),
    }))
  );
  const primaryNavPaths = ['/', '/sales_pipeline', '/dialer', '/calendar'];

  const isActiveAction = (path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    const currentPath = pathname || '';
    if (path === '/') {
      return currentPath === href || currentPath === `${href}/`;
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const dispatchSystemEvent = (type: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(type));
  };

  const dispatchVoiceCommandEvent = () => {
    try {
      if (typeof window === 'undefined') return;
      window.dispatchEvent(new CustomEvent('nexus:open-voice-command'));
    } catch {
      // ignore
    }
  };

  const handlePlusClick = () => {
    const tab = String(activeTab || '');

    if (tab === 'workspace') {
      setIsPlusFanOpen((v) => !v);
      setIsCalendarPlusOpen(false);
      return;
    }

    if (tab === 'sales_pipeline' || tab === 'sales_leads') {
      setIsPlusFanOpen(false);
      setIsCalendarPlusOpen(false);
      dispatchSystemEvent('system:new-lead');
      return;
    }

    if (tab === 'calendar') {
      setIsPlusFanOpen(false);
      setIsCalendarPlusOpen((v) => !v);
      return;
    }

    setIsPlusFanOpen(false);
    setIsCalendarPlusOpen(false);
    setIsMobileMenuOpen(true);
  };

  const notificationsSlot = <GlobalNotificationsBell />;

  return (
    <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser ?? null }}>
      <ToastProvider>
        <AuthProvider initialCurrentUser={initialCurrentUser}>
          <CallAnalysisProvider>
            <BrandProvider>
              <TelephonyProvider orgSlug={orgSlug}>
                <TelephonyWidgets orgSlug={orgSlug} />
                <div className="flex min-h-screen h-[100dvh] w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
                  <ModuleBackground moduleKey="system" />
                <SharedSidebar
                  isOpen={isSidebarOpen}
                  onSetOpenAction={setIsSidebarOpen}
                  brand={{
                    name: orgTitle,
                    logoUrl: initialOrganization?.logo || null,
                    fallbackIcon: <OSModuleSquircleIcon moduleKey="system" boxSize={40} iconSize={18} className="shadow-none" />,
                    badgeModuleKey: 'system',
                  }}
                  brandSubtitle={moduleTitle}
                  onBrandClickAction={() => startTransition(() => router.push('/workspaces'))}
                  topSlot={
                    <div className="flex flex-col gap-2">
                      <BusinessSwitcher currentTenantName={orgTitle} />
                      <WorkspaceSwitcher className="w-full" />
                    </div>
                  }
                  navItems={navItems}
                  primaryNavPaths={primaryNavPaths}
                  isActiveAction={isActiveAction}
                  onNavigateAction={onSidebarItemClick}
                  linkHrefPrefix={basePath}
                  bottomSlot={
                    <div className="space-y-3">
                      <AttendanceMiniStatus />
                      <OSAppSwitcher
                        compact={true}
                        buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
                        buttonLabel="מודולים"
                        className={isSidebarOpen ? '' : 'w-full flex justify-center'}
                        orgSlug={orgSlug}
                        currentModule="system"
                      />
                    </div>
                  }
                />

                <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative z-10">
                  <SharedHeader
                    title={orgTitle}
                    subtitle={screenTitle}
                    currentDate={currentDate}
                    mobileBrand={{
                      name: orgTitle,
                      logoUrl: initialOrganization?.logo || null,
                      fallbackIcon: <OSModuleSquircleIcon moduleKey="system" boxSize={32} iconSize={16} className="shadow-none" />,
                      badgeModuleKey: 'system',
                    }}
                    mobileLeadingSlot={undefined}
                    onOpenCommandPaletteAction={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('os:open-search'));
                      }
                    }}
                    onOpenSupportAction={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('os:open-support'));
                      }
                    }}
                    actionsSlot={<ModuleHelpVideos moduleKey="system" />}
                    switcherSlot={<WorkspaceSwitcher />}
                    notificationsSlot={notificationsSlot}
                    user={{ name: resolvedUser.name, role: resolvedUser.role }}
                    onProfileClickAction={undefined}
                    profileHref={`${basePath}/me`}
                    userAvatarSlot={avatarSlot}
                    profileSlot={undefined}
                    className="bg-transparent"
                  />

                  <div
                    className={`flex-1 ${contentOverflowClass} overflow-x-hidden no-scrollbar p-4 md:p-8 pb-[calc(128px+env(safe-area-inset-bottom))] md:pb-8 min-h-0 touch-pan-y`}
                    id="main-scroll-container"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {children}
                  </div>
                </main>

                <AnimatePresence>
                  {isMobileMenuOpen ? (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden fixed inset-0 bg-black/60 z-[100] backdrop-blur-sm"
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
                          if (info.offset.y > 110 || info.velocity.y > 900) setIsMobileMenuOpen(false);
                        }}
                        className="md:hidden fixed bottom-0 left-0 right-0 z-[101] bg-white/95 backdrop-blur-2xl rounded-t-[2.5rem] p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] border-t border-white/50"
                        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
                        role="dialog"
                        aria-modal="true"
                        aria-label="תפריט"
                      >
                        <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50" />
                        <div className="space-y-6">
                          <div className="grid grid-cols-4 gap-4">
                            {(() => {
                              const items = [
                                ...NAV_GROUPS[0]?.items.filter((item) => !['workspace', 'sales_pipeline', 'dialer'].includes(item.id)) || [],
                                ...NAV_GROUPS[1]?.items || [],
                                ...NAV_GROUPS[2]?.items || []
                              ];
                              
                              return items.map((item) => {
                                const path = item.id === 'workspace' ? '/' : `/${item.id}`;
                                const isActiveItem = isActiveAction(path);
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => { onNavigateAction(path); setIsMobileMenuOpen(false); }}
                                    className="flex flex-col items-center gap-2 group"
                                  >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${
                                      isActiveItem
                                        ? 'bg-[#A21D3C] text-white shadow-[#A21D3C]/30'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                    }`}>
                                      <item.icon size={22} strokeWidth={isActiveItem ? 2.5 : 2} className={isActiveItem ? 'text-white' : 'text-[#A21D3C]'} />
                                    </div>
                                    <span className={`text-[10px] font-bold text-center leading-tight ${isActiveItem ? 'text-[#A21D3C]' : 'text-slate-500'}`}>
                                      {item.label}
                                    </span>
                                  </button>
                                );
                              });
                            })()}
                          </div>

                          <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent" />

                          {/* Modules Section */}
                          <div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider text-right mb-3">מודולים</div>
                            
                            <div className="space-y-3">
                              <MobileMenuAttendanceButton />
                              <OSAppSwitcher mode="inlineGrid" compact={true} orgSlug={orgSlug} currentModule="system" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  ) : null}
                </AnimatePresence>

                {isPlusFanOpen ? (
                  <>
                    <div
                      className="md:hidden fixed inset-0 z-[90] bg-black/30"
                      onClick={() => setIsPlusFanOpen(false)}
                    />
                    <div className="md:hidden fixed left-4 right-4 bottom-[92px] z-[95]">
                      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.25rem] border border-white/60 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              dispatchSystemEvent('system:new-lead');
                            }}
                            className="bg-slate-900 text-white rounded-2xl py-4 text-sm font-black shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
                          >
                            ליד חדש
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              dispatchSystemEvent('system:calendar:new-meeting');
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black shadow-sm active:scale-95 transition-all"
                          >
                            פגישה חדשה
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-1">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              dispatchVoiceCommandEvent();
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black inline-flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-all"
                          >
                            <Mic size={18} />
                            פקודה קולית
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                {isCalendarPlusOpen ? (
                  <>
                    <div
                      className="md:hidden fixed inset-0 z-[90] bg-black/30"
                      onClick={() => setIsCalendarPlusOpen(false)}
                    />
                    <div className="md:hidden fixed left-4 right-4 bottom-[92px] z-[95]">
                      <div className="bg-white/95 backdrop-blur-2xl rounded-[2.25rem] border border-white/60 shadow-[0_-12px_40px_rgba(15,23,42,0.12)] p-4">
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCalendarPlusOpen(false);
                              dispatchSystemEvent('system:calendar:new-meeting');
                            }}
                            className="bg-slate-900 text-white rounded-2xl py-4 text-sm font-black"
                          >
                            פגישה חדשה
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCalendarPlusOpen(false);
                              dispatchSystemEvent('system:calendar:new-event');
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black"
                          >
                            אירוע חדש
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}

                <MobileBottomNav
                  rightItems={[
                    {
                      id: 'workspace',
                      label: 'לוח בקרה',
                      icon: LayoutDashboard,
                      active: isActiveAction('/'),
                      onClick: () => onNavigateAction('/'),
                    },
                    {
                      id: 'sales_pipeline',
                      label: 'לידים',
                      icon: Users,
                      active: isActiveAction('/sales_pipeline'),
                      onClick: () => onNavigateAction('/sales_pipeline'),
                    },
                  ]}
                  leftItems={[
                    {
                      id: 'dialer',
                      label: 'חייגן',
                      icon: PhoneCall,
                      active: isActiveAction('/dialer'),
                      onClick: () => onNavigateAction('/dialer'),
                    },
                    {
                      id: 'menu',
                      label: 'תפריט',
                      icon: SquareMousePointer,
                      active: isMobileMenuOpen,
                      onClick: () => setIsMobileMenuOpen(true),
                    },
                  ]}
                  onPlusClickAction={handlePlusClick}
                  plusAriaLabel={
                    activeTab === 'workspace'
                      ? 'פעולות מהירות'
                      : activeTab === 'sales_pipeline' || activeTab === 'sales_leads'
                        ? 'ליד חדש'
                        : activeTab === 'calendar'
                          ? 'הוסף ליומן'
                          : 'תפריט'
                  }
                  plusActive={isPlusFanOpen || isCalendarPlusOpen}
                  plusGradient={getOSModule('system')?.gradient}
                />
                </div>
              </TelephonyProvider>
            </BrandProvider>
          </CallAnalysisProvider>
        </AuthProvider>
      </ToastProvider>
      <GlobalSearchModal />
      <GlobalSupportModal />
    </SystemShellContext.Provider>
  );
}

// Telephony widgets component - renders WebRTC widget and screen pop
function TelephonyWidgets({ orgSlug }: { orgSlug: string }) {
  const telephony = useTelephonyOptional();
  
  if (!telephony?.config?.isActive) {
    return null;
  }

  return (
    <>
      <ScreenPopNotification orgSlug={orgSlug} />
      {telephony.widgetCredentials && (
        <VoicecenterWidget
          credentials={telephony.widgetCredentials}
          orgSlug={orgSlug}
          onIncomingCall={(call) => {
            console.log('[Telephony] Incoming call:', call);
          }}
          onCallEnded={(call) => {
            console.log('[Telephony] Call ended:', call);
          }}
        />
      )}
    </>
  );
}

function SystemShellGateClientWithClerk({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: ShellUser;
  initialOrganization?: Partial<OrganizationProfile>;
}) {
  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: initialCurrentUser?.name ?? null,
    role: initialCurrentUser?.role ?? null,
    avatarUrl: typeof initialCurrentUser?.avatar === 'string' ? initialCurrentUser.avatar : null,
  });

  return (
    <SystemShellGateClientCore
      orgSlug={orgSlug}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      systemIdentity={systemIdentity}
    >
      {children}
    </SystemShellGateClientCore>
  );
}

function SystemShellGateClientWithoutClerk({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: ShellUser;
  initialOrganization?: Partial<OrganizationProfile>;
}) {
  const fallbackIdentity = {
    name: String(initialCurrentUser?.name || initialCurrentUser?.email || 'משתמש'),
    role: (initialCurrentUser?.role ?? null) as string | null,
    avatarUrl: typeof initialCurrentUser?.avatar === 'string' ? initialCurrentUser.avatar : '',
    needsProfileCompletion: false,
    profileCompleted: true,
  };

  return (
    <SystemShellGateClientCore
      orgSlug={orgSlug}
      initialCurrentUser={initialCurrentUser}
      initialOrganization={initialOrganization}
      systemIdentity={fallbackIdentity}
    >
      {children}
    </SystemShellGateClientCore>
  );
}

export default function SystemShellGateClient({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: ShellUser;
  initialOrganization?: Partial<OrganizationProfile>;
}) {
  return (
    <ClerkProviderErrorBoundary
      fallback={
        <SystemShellGateClientWithoutClerk
          orgSlug={orgSlug}
          initialCurrentUser={initialCurrentUser}
          initialOrganization={initialOrganization}
        >
          {children}
        </SystemShellGateClientWithoutClerk>
      }
    >
      <SystemShellGateClientWithClerk
        orgSlug={orgSlug}
        initialCurrentUser={initialCurrentUser}
        initialOrganization={initialOrganization}
      >
        {children}
      </SystemShellGateClientWithClerk>
    </ClerkProviderErrorBoundary>
  );
}
