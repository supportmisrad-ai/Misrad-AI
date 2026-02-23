'use client';

import React, { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SquareMousePointer, Briefcase, ClipboardList, LayoutDashboard, Mic, Package, Plus, Settings, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { OSModuleKey } from '@/lib/os/modules/types';

import { Avatar } from '@/components/Avatar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { GlobalNotificationsBell } from '@/components/shared/GlobalNotificationsBell';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { GlobalSupportModal } from '@/components/shared/GlobalSupportModal';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

import { getOSModule } from '@/types/os-modules';
import { ModuleBackground } from '@/components/shared/ModuleBackground';

function buildTitle(pathname: string, basePath: string): string {
  const relative = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || '/' : pathname;

  if (relative === '/' || relative === '') return 'דשבורד תפעולי';
  if (relative === '/projects') return 'פרויקטים';
  if (relative === '/projects/new') return 'פרויקט חדש';
  if (relative.startsWith('/projects/')) return 'פרויקטים';
  if (relative === '/work-orders') return 'קריאות שירות';
  if (relative === '/work-orders/new') return 'קריאה חדשה';
  if (relative.startsWith('/work-orders/')) return 'קריאות שירות';
  if (relative === '/contractors') return 'ספקים וקבלנים';
  if (relative === '/inventory') return 'מלאי';
  if (relative.startsWith('/inventory/')) return 'מלאי';
  if (relative === '/attendance-reports') return 'דוחות נוכחות';
  if (relative === '/me') return 'הפרופיל שלי';
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
  const { roomName } = useRoomBranding();

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
  const [isPlusMenuOpen, setIsPlusMenuOpen] = React.useState(false);
  const [, startTransition] = useTransition();

  const screenTitle = React.useMemo(() => buildTitle(pathname, basePath), [basePath, pathname]);
  const moduleTitle = React.useMemo(() => roomName || 'Operations', [roomName]);

  const navItems = React.useMemo(
    () => [
      { label: 'דשבורד', path: '/', icon: LayoutDashboard },
      { label: 'קריאות', path: '/work-orders', icon: ClipboardList },
      { label: 'פרויקטים', path: '/projects', icon: Briefcase, separatorBefore: true },
      { label: 'מלאי', path: '/inventory', icon: Package },
      { label: 'ספקים וקבלנים', path: '/contractors', icon: Users },
      { label: 'הגדרות', path: '/settings', icon: Settings, separatorBefore: true },
    ],
    []
  );

  const primaryNavPaths = undefined;

  // Prefetch all nav routes on mount
  React.useEffect(() => {
    navItems.forEach((item) => {
      const href = `${basePath}${item.path === '/' ? '' : item.path}`;
      router.prefetch(href);
    });
  }, [basePath, navItems, router]);

  const isActiveAction = React.useCallback(
    (path: string) => {
      const full = `${basePath}${path === '/' ? '' : path}`;
      if (path === '/') return pathname === basePath || pathname === `${basePath}/`;
      return pathname === full || pathname.startsWith(`${full}/`);
    },
    [basePath, pathname]
  );

  // Side-effects-only for sidebar (Link handles actual navigation)
  const onSidebarItemClick = React.useCallback(
    (_path: string) => {
      setIsMobileMenuOpen(false);
      setIsPlusMenuOpen(false);
    },
    []
  );

  const onNavigateAction = React.useCallback(
    (path: string) => {
      const target = `${basePath}${path === '/' ? '' : path}`;
      startTransition(() => router.push(target));
      setIsMobileMenuOpen(false);
      setIsPlusMenuOpen(false);
    },
    [basePath, router, startTransition]
  );

  const togglePlusMenu = React.useCallback(() => {
    setIsMobileMenuOpen(false);
    setIsPlusMenuOpen((v) => !v);
  }, []);

  const handleVoiceClick = React.useCallback(() => {
    setIsPlusMenuOpen(false);
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nexus:open-voice-command'));
      }
    } catch {
      // ignore
    }
  }, []);

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
      className="flex h-[100dvh] w-full bg-[#f1f5f9] text-gray-900 overflow-hidden relative"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
      dir="rtl"
    >
      <ModuleBackground moduleKey="operations" />
      <SharedSidebar
        isOpen={isSidebarOpen}
        onSetOpenAction={setIsSidebarOpen}
        brand={{
          name: workspace.name,
          logoUrl: workspace.logoUrl || null,
          fallbackIcon: <OSModuleSquircleIcon moduleKey="operations" boxSize={40} iconSize={18} className="shadow-none" />,
          badgeModuleKey: 'operations',
        }}
        brandSubtitle={'תפעול, מלאי ושטח'}
        onBrandClickAction={() => startTransition(() => router.push(basePath))}
        topSlot={
          <div className="flex flex-col gap-2">
            <BusinessSwitcher currentTenantName={workspace.name} />
            <WorkspaceSwitcher className="w-full" />
          </div>
        }
        navItems={navItems}
        primaryNavPaths={primaryNavPaths}
        isActiveAction={isActiveAction}
        onNavigateAction={onSidebarItemClick}
        linkHrefPrefix={basePath}
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
            fallbackIcon: <OSModuleSquircleIcon moduleKey="operations" boxSize={32} iconSize={16} className="shadow-none" />,
            badgeModuleKey: 'operations',
          }}
          onOpenCommandPaletteAction={undefined}
          onOpenSupportAction={undefined}
          actionsSlot={<ModuleHelpVideos moduleKey="operations" />}
          switcherSlot={<WorkspaceSwitcher />}
          notificationsSlot={<GlobalNotificationsBell />}
          user={{ name: resolvedUser.name, role: resolvedUser.role }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me`}
          userAvatarSlot={avatarSlot}
          profileSlot={undefined}
          className="bg-transparent"
        />

        <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 md:p-8 min-h-0" id="main-scroll-container">
          <div className="flex flex-col min-h-0 pb-36 md:pb-0">{children}</div>
        </div>
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
            id: 'work-orders',
            label: 'קריאות',
            icon: ClipboardList,
            active: isActiveAction('/work-orders'),
            onClick: () => onNavigateAction('/work-orders'),
          },
        ]}
        leftItems={[
          {
            id: 'inventory',
            label: 'מלאי',
            icon: Package,
            active: isActiveAction('/inventory'),
            onClick: () => onNavigateAction('/inventory'),
          },
          {
            id: 'menu',
            label: 'תפריט',
            icon: SquareMousePointer,
            active: isMobileMenuOpen,
            onClick: () => setIsMobileMenuOpen(true),
          },
        ]}
        onPlusClickAction={togglePlusMenu}
        plusAriaLabel={isPlusMenuOpen ? 'סגור פעולות' : 'פעולה חדשה'}
        plusActive={isPlusMenuOpen}
        plusGradient={getOSModule('operations')?.gradient}
      />

      <AnimatePresence>
        {isPlusMenuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[45] backdrop-blur-sm md:hidden"
              onClick={() => setIsPlusMenuOpen(false)}
            />
            <div className="fixed bottom-28 left-0 right-0 z-[50] flex justify-center gap-3 sm:gap-5 md:hidden pointer-events-none px-4">
              {[
                { icon: Mic, label: 'פקודה קולית', onClick: handleVoiceClick, bg: 'bg-gradient-to-br from-red-500 to-red-600', shadow: 'shadow-red-500/30', border: 'border-red-400/20', delay: 0.1 },
                { icon: ClipboardList, label: 'קריאה חדשה', onClick: () => onNavigateAction('/work-orders/new'), bg: 'bg-gradient-to-br from-amber-500 to-orange-600', shadow: 'shadow-amber-500/30', border: 'border-amber-400/20', delay: 0.05 },
                { icon: Briefcase, label: 'פרויקט חדש', onClick: () => onNavigateAction('/projects/new'), bg: 'bg-white', shadow: 'shadow-black/10', border: 'border-gray-200/60', delay: 0, textColor: 'text-slate-900' },
                { icon: Package, label: 'מלאי', onClick: () => onNavigateAction('/inventory'), bg: 'bg-white', shadow: 'shadow-black/10', border: 'border-gray-200/60', delay: 0.05, textColor: 'text-slate-900' },
              ].map((item) => (
                <motion.div
                  key={item.label}
                  initial={{ y: 30, opacity: 0, scale: 0.9 }}
                  animate={{ y: 0, opacity: 1, scale: 1 }}
                  exit={{ y: 30, opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30, delay: item.delay }}
                  className="flex flex-col items-center gap-2.5 pointer-events-auto"
                >
                  <button
                    onClick={item.onClick}
                    className={`group relative w-14 h-14 sm:w-16 sm:h-16 ${item.bg} ${item.textColor || 'text-white'} rounded-2xl shadow-lg ${item.shadow} flex items-center justify-center active:scale-95 transition-all duration-200 border ${item.border}`}
                    aria-label={item.label}
                  >
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <item.icon size={22} className="sm:w-6 sm:h-6 relative z-10" strokeWidth={2.5} />
                  </button>
                  <span className="text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full shadow-lg border border-white/20">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </>
        ) : null}
      </AnimatePresence>

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
              <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-8 opacity-50"></div>
              <div className="space-y-6">
                <div className="grid grid-cols-4 gap-4">
                  {navItems.filter(i => i.path !== '/settings' && i.path !== '/me').map((item) => {
                    const isActiveItem = isActiveAction(item.path);
                    const IconComponent = item.icon;
                    return (
                      <button
                        key={item.path}
                        type="button"
                        onClick={() => { onNavigateAction(item.path); setIsMobileMenuOpen(false); }}
                        className="flex flex-col items-center gap-2 group"
                        aria-label={item.label}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${
                          isActiveItem
                            ? 'bg-[#0EA5E9] text-white shadow-[#0EA5E9]/30'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                        }`}>
                          <IconComponent size={22} strokeWidth={isActiveItem ? 2.5 : 2} />
                        </div>
                        <span className={`text-[10px] font-bold text-center leading-tight ${isActiveItem ? 'text-[#0EA5E9]' : 'text-slate-500'}`}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { onNavigateAction('/settings'); setIsMobileMenuOpen(false); }}
                    className={`flex items-center justify-center gap-3 w-full max-w-xs px-6 py-4 rounded-2xl transition-all duration-200 shadow-md ${
                      isActiveAction('/settings')
                        ? 'bg-[#0EA5E9] text-white shadow-lg shadow-[#0EA5E9]/30'
                        : 'bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-slate-300/50'
                    }`}
                  >
                    <Settings size={24} strokeWidth={2} />
                    <span className="text-sm font-bold">הגדרות ופיצ׳רים</span>
                  </button>
                </div>

                <div className="h-px bg-gradient-to-r from-transparent via-gray-300/40 to-transparent"></div>

                <div className="space-y-3">
                  <div className="text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">מודולים</div>
                  <OSAppSwitcher compact={true} orgSlug={orgSlug} currentModule="operations" entitlements={entitlements} />
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <GlobalSearchModal />
      <GlobalSupportModal />
    </div>
  );
}
