'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, ClipboardList, LayoutDashboard, Package, Settings, User, Users } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';

import { Avatar } from '@/components/Avatar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import MobileBottomNav from '@/components/shared/MobileBottomNav';

function buildTitle(pathname: string, basePath: string): string {
  const relative = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;

  if (relative === '/' || relative === '') return 'דשבורד תפעולי';
  if (relative === '/projects') return 'פרויקטים';
  if (relative === '/projects/new') return 'פרויקט חדש';
  if (relative.startsWith('/projects/')) return 'פרויקטים';
  if (relative === '/work-orders') return 'קריאות שירות';
  if (relative === '/work-orders/new') return 'קריאה חדשה';
  if (relative.startsWith('/work-orders/')) return 'קריאות שירות';
  if (relative === '/contractors') return 'קבלנים';
  if (relative === '/inventory') return 'מלאי';
  if (relative.startsWith('/inventory/')) return 'מלאי';
  if (relative === '/me') return 'אזור אישי';
  if (relative === '/settings') return 'הגדרות';

  return 'Operations';
}

export default function OperationsShell({
  orgSlug,
  workspace,
  user,
  entitlements,
  children,
}: {
  orgSlug: string;
  workspace: { name: string; logoUrl?: string | null };
  user: { name: string; role?: string | null; avatarUrl?: string | null };
  entitlements: Record<OSModuleKey, boolean>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const { roomNameHebrew, roomName } = useRoomBranding();

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: user.name,
    role: user.role ?? null,
    avatarUrl: user.avatarUrl ?? null,
  });

  const [currentDate, setCurrentDate] = React.useState('');
  React.useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }));
  }, []);

  const basePath = `/w/${encodeURIComponent(orgSlug)}/operations`;
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  const screenTitle = React.useMemo(() => buildTitle(pathname, basePath), [basePath, pathname]);
  const moduleTitle = React.useMemo(() => roomNameHebrew || roomName || 'Operations', [roomName, roomNameHebrew]);

  const navItems = React.useMemo(
    () => [
      { label: 'דשבורד', path: '/', icon: LayoutDashboard },
      { label: 'פרויקטים', path: '/projects', icon: Briefcase },
      { label: 'קריאות', path: '/work-orders', icon: ClipboardList },
      { label: 'מלאי', path: '/inventory', icon: Package },
      { label: 'קבלנים', path: '/contractors', icon: Users },
      { label: 'אזור אישי', path: '/me', icon: User },
      { label: 'הגדרות', path: '/settings', icon: Settings },
    ],
    []
  );

  const isActiveAction = React.useCallback(
    (path: string) => {
      const full = `${basePath}${path === '/' ? '' : path}`;
      if (path === '/') return pathname === basePath || pathname === `${basePath}/`;
      return pathname === full || pathname.startsWith(`${full}/`);
    },
    [basePath, pathname]
  );

  const onNavigateAction = React.useCallback(
    (path: string) => {
      const target = `${basePath}${path === '/' ? '' : path}`;
      router.push(target);
    },
    [basePath, router]
  );

  const resolvedUser = React.useMemo(
    () => ({
      name: systemIdentity?.name || user.name,
      role: systemIdentity?.role || user.role || null,
      avatarUrl: systemIdentity?.avatarUrl || user.avatarUrl || null,
      needsProfileCompletion: Boolean(systemIdentity?.needsProfileCompletion),
    }),
    [systemIdentity?.avatarUrl, systemIdentity?.name, systemIdentity?.needsProfileCompletion, systemIdentity?.role, user.avatarUrl, user.name, user.role]
  );

  const avatarSlot = React.useMemo(
    () => (
      <Avatar
        src={resolvedUser.avatarUrl || null}
        alt={resolvedUser.name}
        name={resolvedUser.name}
        size="md"
        rounded="full"
        className="border-2 border-white shadow-sm"
      />
    ),
    [resolvedUser.avatarUrl, resolvedUser.name]
  );

  return (
    <div className="flex h-screen w-full bg-[#f1f5f9] text-gray-900 overflow-hidden" dir="rtl">
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: workspace.name,
          logoUrl: workspace.logoUrl || null,
          fallbackIcon: (
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200">
              <Briefcase size={18} className="text-slate-900" />
            </div>
          ),
        }}
        brandSubtitle={'תפעול ושטח'}
        onBrandClickAction={() => router.push(basePath)}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={workspace.name} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={navItems}
        primaryNavPaths={['/', '/projects', '/work-orders', '/inventory', '/contractors', '/me', '/settings']}
        isActiveAction={isActiveAction}
        onNavigateAction={onNavigateAction}
        bottomSlot={
          <OSAppSwitcher
            compact={true}
            buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
            buttonLabel="מודולים"
            className={isSidebarOpen ? '' : 'w-full flex justify-center'}
            entitlements={entitlements}
            orgSlug={orgSlug}
            currentModule="operations"
          />
        }
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <SharedHeader
          title={moduleTitle}
          subtitle={screenTitle}
          currentDate={currentDate || ' '}
          mobileBrand={{ name: moduleTitle, logoUrl: workspace.logoUrl || null }}
          onOpenCommandPaletteAction={undefined}
          onOpenSupportAction={undefined}
          switcherSlot={null}
          notificationsSlot={null}
          user={{ name: resolvedUser.name, role: resolvedUser.role }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me${resolvedUser.needsProfileCompletion ? '?edit=profile' : ''}`}
          userAvatarSlot={avatarSlot}
          profileSlot={undefined}
          className="bg-transparent"
        />

        <main className="flex-1 overflow-y-auto no-scrollbar p-4 md:p-8 min-h-0" id="main-scroll-container">
          <div className="flex flex-col min-h-0 pb-24 md:pb-0">{children}</div>
        </main>
      </main>

      <MobileBottomNav
        rightItems={[
          {
            id: 'dashboard',
            label: 'דשבורד',
            icon: LayoutDashboard,
            active: isActiveAction('/'),
            onClick: () => onNavigateAction('/'),
          },
          {
            id: 'projects',
            label: 'פרויקטים',
            icon: Briefcase,
            active: isActiveAction('/projects'),
            onClick: () => onNavigateAction('/projects'),
          },
        ]}
        leftItems={[
          {
            id: 'work-orders',
            label: 'קריאות',
            icon: ClipboardList,
            active: isActiveAction('/work-orders'),
            onClick: () => onNavigateAction('/work-orders'),
          },
          {
            id: 'me',
            label: 'אזור אישי',
            icon: User,
            active: isActiveAction('/me'),
            onClick: () => onNavigateAction('/me'),
          },
        ]}
        onPlusClickAction={() => onNavigateAction('/projects/new')}
        plusAriaLabel="פרויקט חדש"
        plusActive={isActiveAction('/projects/new')}
      />
    </div>
  );
}
