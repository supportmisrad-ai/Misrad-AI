'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AppWindow, Briefcase, ClipboardList, LayoutDashboard, Package, Settings, User, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
      setIsMobileMenuOpen(false);
    },
    [basePath, router]
  );

  const plusConfig = React.useMemo(() => {
    if (isActiveAction('/work-orders') || isActiveAction('/work-orders/new')) {
      return {
        targetPath: '/work-orders/new',
        ariaLabel: 'קריאה חדשה',
        active: isActiveAction('/work-orders/new'),
      };
    }

    if (isActiveAction('/projects') || isActiveAction('/projects/new')) {
      return {
        targetPath: '/projects/new',
        ariaLabel: 'פרויקט חדש',
        active: isActiveAction('/projects/new'),
      };
    }

    return {
      targetPath: '/projects/new',
      ariaLabel: 'פרויקט חדש',
      active: isActiveAction('/projects/new'),
    };
  }, [isActiveAction]);

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
    <div
      className="flex h-screen w-full text-gray-900 overflow-hidden"
      dir="rtl"
      style={{
        backgroundColor: '#f1f5f9',
        backgroundImage:
          'radial-gradient(at 0% 0%, rgba(14,165,233,0.10) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(2,132,199,0.08) 0px, transparent 55%), radial-gradient(at 100% 100%, rgba(14,165,233,0.06) 0px, transparent 50%), radial-gradient(at 0% 60%, rgba(2,132,199,0.05) 0px, transparent 55%)',
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
      }}
    >
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: workspace.name,
          logoUrl: workspace.logoUrl || null,
          fallbackIcon: (
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border border-slate-200">
              <OSModuleIcon moduleKey="operations" size={18} className="text-slate-900" />
            </div>
          ),
          badgeIcon: <OSModuleIcon moduleKey="operations" size={12} className="text-slate-900" />,
        }}
        brandSubtitle={'תפעול, מלאי ושטח'}
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
          mobileBrand={{
            name: moduleTitle,
            logoUrl: workspace.logoUrl || null,
            badgeIcon: <OSModuleIcon moduleKey="operations" size={10} className="text-slate-900" />,
          }}
          onOpenCommandPaletteAction={undefined}
          onOpenSupportAction={undefined}
          actionsSlot={<ModuleHelpVideos moduleKey="operations" />}
          switcherSlot={null}
          notificationsSlot={null}
          user={{ name: resolvedUser.name, role: resolvedUser.role }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me${resolvedUser.needsProfileCompletion ? '?edit=profile' : ''}`}
          userAvatarSlot={avatarSlot}
          profileSlot={undefined}
          className="bg-transparent"
        />

        <main className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 md:p-8 min-h-0" id="main-scroll-container">
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
            id: 'menu',
            label: 'תפריט',
            icon: AppWindow,
            active: isMobileMenuOpen,
            onClick: () => setIsMobileMenuOpen(true),
          },
        ]}
        onPlusClickAction={() => onNavigateAction(plusConfig.targetPath)}
        plusAriaLabel={plusConfig.ariaLabel}
        plusActive={plusConfig.active}
      />

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
                {navItems.map((item) => {
                  const isActiveItem = isActiveAction(item.path);
                  const IconComponent = item.icon;
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => {
                        onNavigateAction(item.path);
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
                        <IconComponent size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
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
                <OSAppSwitcher compact={true} orgSlug={orgSlug} currentModule="operations" entitlements={entitlements} />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
