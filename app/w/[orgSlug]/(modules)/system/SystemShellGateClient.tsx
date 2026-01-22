'use client';

import React, { createContext, useContext, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Menu } from 'lucide-react';
import { AuthProvider } from '@/components/system/contexts/AuthContext';
import { ToastProvider } from '@/components/system/contexts/ToastContext';
import { CallAnalysisProvider } from '@/components/system/contexts/CallAnalysisContext';
import { BrandProvider } from '@/components/system/contexts/BrandContext';
import { NAV_ITEMS } from '@/components/system/constants';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';

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

const SystemShellContext = createContext<{ orgSlug: string; currentUser: any } | null>(null);

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

export default function SystemShellGateClient({
  children,
  orgSlug,
  initialCurrentUser,
  initialOrganization,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: any;
  initialOrganization?: any;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = `/w/${encodeURIComponent(orgSlug)}/system`;

  const activeTab = useMemo(() => tabFromPathname(pathname), [pathname]);
  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: initialCurrentUser?.name ?? null,
    role: initialCurrentUser?.role ?? null,
    avatarUrl: (initialCurrentUser as any)?.avatar ?? null,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const shouldWrapWithShell = activeTab ? SHELL_TABS.has(activeTab) : false;
  if (!shouldWrapWithShell) {
    return (
      <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser }}>
        <ToastProvider>{children}</ToastProvider>
      </SystemShellContext.Provider>
    );
  }

  const contentOverflowClass = activeTab === 'sales_pipeline' ? 'overflow-hidden' : 'overflow-y-auto';

  const screenTitle = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'System';
  const moduleTitle = 'מכירות';
  const currentDate = new Date().toLocaleDateString('he-IL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const resolvedUser = {
    name: systemIdentity?.name || String(initialCurrentUser?.name || initialCurrentUser?.email || 'משתמש'),
    role: systemIdentity?.role || (initialCurrentUser?.isSuperAdmin ? 'סופר אדמין' : String(initialCurrentUser?.role || 'משתמש')),
    avatarUrl: systemIdentity?.avatarUrl || String((initialCurrentUser as any)?.avatar || ''),
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
  };

  const notificationsSlot = (
    <div className="flex items-center gap-2">
      <AttendanceMiniStatus />
      <button
        onClick={() => router.push(`${basePath}/notifications`)}
        className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
        aria-label="התראות"
        type="button"
      >
        <Bell size={18} />
      </button>
    </div>
  );

  return (
    <SystemShellContext.Provider value={{ orgSlug, currentUser: initialCurrentUser }}>
      <ToastProvider>
        <AuthProvider initialCurrentUser={initialCurrentUser}>
          <CallAnalysisProvider>
            <BrandProvider initialBrandName={String(initialOrganization?.name || 'system.OS')} initialBrandLogo={initialOrganization?.logo || null}>
              <div className="flex h-screen w-full bg-[var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
                <SharedSidebar
                  isOpen={isSidebarOpen}
                  onSetOpenAction={setIsSidebarOpen}
                  brand={{
                    name: String(initialOrganization?.name || moduleTitle),
                    logoUrl: initialOrganization?.logo || null,
                    fallbackIcon: <OSModuleIcon moduleKey="system" size={20} className="text-slate-900" />,
                    badgeIcon: <OSModuleIcon moduleKey="system" size={12} className="text-slate-900" />,
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
                      badgeIcon: <OSModuleIcon moduleKey="system" size={10} className="text-slate-900" />,
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
                    switcherSlot={null}
                    notificationsSlot={notificationsSlot}
                    user={{ name: resolvedUser.name, role: resolvedUser.role }}
                    onProfileClickAction={undefined}
                    profileHref={`${basePath}/me${resolvedUser.needsProfileCompletion ? '?edit=profile' : ''}`}
                    userAvatarSlot={avatarSlot}
                    profileSlot={undefined}
                    className="bg-transparent"
                  />

                  <div
                    className={`flex-1 ${contentOverflowClass} no-scrollbar p-4 md:p-8 min-h-0 touch-pan-y touch-pan-x`}
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
                        fallbackIcon: <OSModuleIcon moduleKey="system" size={20} className="text-slate-900" />,
                        badgeIcon: <OSModuleIcon moduleKey="system" size={12} className="text-slate-900" />,
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
              </div>
            </BrandProvider>
          </CallAnalysisProvider>
        </AuthProvider>
      </ToastProvider>
    </SystemShellContext.Provider>
  );
}
