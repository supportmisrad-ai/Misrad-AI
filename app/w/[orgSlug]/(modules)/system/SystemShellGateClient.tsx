'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, CalendarDays, CheckSquare, LayoutDashboard, Menu, Mic, Users } from 'lucide-react';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { CallAnalysisProvider } from '@/components/system/contexts/CallAnalysisContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import { NAV_ITEMS } from '@/components/system/constants';
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
import { getOSModule } from '@/types/os-modules';
import type { OrganizationProfile, User } from '@/types';
import type { WorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';

const SHELL_TABS = new Set([
  'workspace',
  'sales_leads',
  'sales_pipeline',
  'calendar',
  'dialer',
  'reports',
  'tasks',
  'me',
  'settings',
  'notifications',
  'analytics',
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

  const shouldWrapWithShell = activeTab ? SHELL_TABS.has(activeTab) : false;
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

  const navItems = NAV_ITEMS.map((i) => ({
    label: i.label,
    path: i.id === 'workspace' ? '/' : `/${i.id}`,
    icon: i.icon,
  }));
  const primaryNavPaths = ['/', '/sales_pipeline', '/tasks', '/calendar'];

  const isActiveAction = (path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    const currentPath = pathname || '';
    if (path === '/') {
      return currentPath === href || currentPath === `${href}/`;
    }
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  const onNavigateAction = (path: string) => {
    const href = `${basePath}${path === '/' ? '' : path}`;
    router.push(href);
    setIsMobileMenuOpen(false);
    setIsPlusFanOpen(false);
    setIsCalendarPlusOpen(false);
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

    if (tab === 'tasks') {
      setIsPlusFanOpen(false);
      setIsCalendarPlusOpen(false);
      dispatchSystemEvent('system:new-task');
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

  const goToTasksAndCreate = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem('system:pending-action', 'new-task');
    }
    onNavigateAction('/tasks');
  };

  const notificationsSlot = (
    <button
      onClick={() => router.push(`${basePath}/notifications`)}
      className="relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/50 text-gray-600"
      aria-label="התראות"
      type="button"
    >
      <Bell size={18} />
    </button>
  );

  return (
    <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser ?? null }}>
      <ToastProvider>
        <AuthProvider initialCurrentUser={initialCurrentUser}>
          <CallAnalysisProvider>
            <BrandProvider>
              <div className="flex h-screen w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
                <SharedSidebar
                  isOpen={isSidebarOpen}
                  onSetOpenAction={setIsSidebarOpen}
                  brand={{
                    name: String(initialOrganization?.name || moduleTitle),
                    logoUrl: initialOrganization?.logo || null,
                    fallbackIcon: <OSModuleSquircleIcon moduleKey="system" boxSize={40} iconSize={18} className="shadow-none" />,
                    badgeModuleKey: 'system',
                  }}
                  brandSubtitle={moduleTitle}
                  onBrandClickAction={() => router.push('/workspaces')}
                  topSlot={
                    <div className="flex flex-col gap-2">
                      <BusinessSwitcher currentTenantName={String(initialOrganization?.name || moduleTitle)} />
                      <WorkspaceSwitcher className="w-full" />
                    </div>
                  }
                  navItems={navItems}
                  primaryNavPaths={primaryNavPaths}
                  isActiveAction={isActiveAction}
                  onNavigateAction={onNavigateAction}
                  bottomSlot={
                    <OSAppSwitcher
                      compact={true}
                      buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
                      buttonLabel="מודולים"
                      className={isSidebarOpen ? '' : 'w-full flex justify-center'}
                      orgSlug={orgSlug}
                      currentModule="system"
                    />
                  }
                />

                <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
                  <SharedHeader
                    title={moduleTitle}
                    subtitle={screenTitle}
                    currentDate={currentDate}
                    mobileBrand={{
                      name: moduleTitle,
                      logoUrl: initialOrganization?.logo || null,
                      fallbackIcon: <OSModuleSquircleIcon moduleKey="system" boxSize={32} iconSize={16} className="shadow-none" />,
                      badgeModuleKey: 'system',
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
                    onOpenCommandPaletteAction={undefined}
                    onOpenSupportAction={undefined}
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
                    className={`flex-1 ${contentOverflowClass} overflow-x-hidden no-scrollbar p-4 md:p-8 pb-24 md:pb-8 min-h-0 touch-pan-y`}
                    id="main-scroll-container"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                    {children}
                  </div>
                </main>

                {isMobileMenuOpen ? (
                  <>
                    <div
                      className="fixed inset-0 z-[100] bg-black/50 md:hidden"
                      onClick={() => setIsMobileMenuOpen(false)}
                    />
                    <SharedSidebar
                      isOpen={true}
                      onSetOpenAction={() => setIsMobileMenuOpen(false)}
                      brand={{
                        name: String(initialOrganization?.name || moduleTitle),
                        logoUrl: initialOrganization?.logo || null,
                        fallbackIcon: <OSModuleSquircleIcon moduleKey="system" boxSize={40} iconSize={18} className="shadow-none" />,
                        badgeModuleKey: 'system',
                      }}
                      brandSubtitle={moduleTitle}
                      onBrandClickAction={() => {
                        setIsMobileMenuOpen(false);
                        router.push('/workspaces');
                      }}
                      topSlot={
                        <div className="flex flex-col gap-2">
                          <BusinessSwitcher currentTenantName={String(initialOrganization?.name || moduleTitle)} />
                          <WorkspaceSwitcher className="w-full" />
                        </div>
                      }
                      navItems={navItems}
                      primaryNavPaths={primaryNavPaths}
                      isActiveAction={isActiveAction}
                      onNavigateAction={onNavigateAction}
                      bottomSlot={<OSAppSwitcher compact={true} buttonLabel="מודולים" orgSlug={orgSlug} currentModule="system" />}
                      showCollapseControls={false}
                      containerClassName="fixed inset-y-0 right-0 z-[110] flex flex-col w-full max-w-[320px] p-4 md:hidden"
                    />
                  </>
                ) : null}

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
                            className="bg-slate-900 text-white rounded-2xl py-4 text-sm font-black"
                          >
                            ליד חדש
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              goToTasksAndCreate();
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black"
                          >
                            משימה חדשה
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              dispatchSystemEvent('system:calendar:new-meeting');
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black"
                          >
                            פגישה חדשה
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusFanOpen(false);
                              dispatchVoiceCommandEvent();
                            }}
                            className="bg-white border border-slate-200 text-slate-900 rounded-2xl py-4 text-sm font-black inline-flex items-center justify-center gap-2"
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
                      id: 'tasks',
                      label: 'משימות',
                      icon: CheckSquare,
                      active: isActiveAction('/tasks'),
                      onClick: () => onNavigateAction('/tasks'),
                    },
                    {
                      id: 'calendar',
                      label: 'אירועים',
                      icon: CalendarDays,
                      active: isActiveAction('/calendar'),
                      onClick: () => onNavigateAction('/calendar'),
                    },
                  ]}
                  onPlusClickAction={handlePlusClick}
                  plusAriaLabel={
                    activeTab === 'workspace'
                      ? 'פעולות מהירות'
                      : activeTab === 'sales_pipeline' || activeTab === 'sales_leads'
                        ? 'ליד חדש'
                        : activeTab === 'tasks'
                          ? 'משימה חדשה'
                          : activeTab === 'calendar'
                            ? 'הוסף ליומן'
                            : 'תפריט'
                  }
                  plusActive={isPlusFanOpen || isCalendarPlusOpen}
                  plusGradient={getOSModule('system')?.gradient}
                />
              </div>
            </BrandProvider>
          </CallAnalysisProvider>
        </AuthProvider>
      </ToastProvider>
    </SystemShellContext.Provider>
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
