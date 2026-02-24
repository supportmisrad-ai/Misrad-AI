'use client';

import React, { useCallback, useMemo, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, Cpu, SquareMousePointer } from 'lucide-react';
import { SharedHeader } from '@/components/shared/SharedHeader';
import MobileBottomNav from '@/components/shared/MobileBottomNav';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { Avatar } from '@/components/Avatar';
import { useWorkspaceSystemIdentity } from '@/hooks/useWorkspaceSystemIdentity';
import { getOSModule } from '@/types/os-modules';
import { ModuleBackground } from '@/components/shared/ModuleBackground';
import { GlobalSearchModal } from '@/components/shared/GlobalSearchModal';
import { GlobalSupportModal } from '@/components/shared/GlobalSupportModal';
import { GlobalNotificationsBell } from '@/components/shared/GlobalNotificationsBell';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';

type ShellUser = {
  name?: string | null;
  avatar?: string | null;
  role?: string | null;
};

export default function ClientMeShell({
  children,
  orgSlug,
  initialCurrentUser,
  workspaceLogo,
}: {
  children: React.ReactNode;
  orgSlug: string;
  initialCurrentUser?: ShellUser;
  workspaceLogo?: string | null;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const basePath = `/w/${encodeURIComponent(orgSlug)}/client`;

  const { identity: systemIdentity } = useWorkspaceSystemIdentity(orgSlug, {
    name: initialCurrentUser?.name ?? null,
    role: initialCurrentUser?.role ?? null,
    avatarUrl: typeof initialCurrentUser?.avatar === 'string' ? initialCurrentUser.avatar : null,
  });

  const moduleTitle = 'לקוחות';
  const currentDate = useMemo(
    () => new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );

  const resolvedUser = {
    name: systemIdentity?.name || String(initialCurrentUser?.name || 'משתמש'),
    role: systemIdentity?.role || String(initialCurrentUser?.role || 'משתמש'),
    avatarUrl: systemIdentity?.avatarUrl || (typeof initialCurrentUser?.avatar === 'string' ? initialCurrentUser.avatar : ''),
  };

  const fallbackIcon = <OSModuleSquircleIcon moduleKey="client" boxSize={32} iconSize={16} className="shadow-none" />;

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

  const onNavigateAction = useCallback(
    (path: string) => {
      const href = `${basePath}${path === '/' ? '' : path}`;
      startTransition(() => router.push(href));
    },
    [basePath, router, startTransition],
  );

  return (
    <div className="flex h-screen w-full bg-[color:var(--os-bg)] text-gray-900 font-sans overflow-hidden relative" dir="rtl">
      <ModuleBackground moduleKey="client" />

      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative z-10">
        <SharedHeader
          title={moduleTitle}
          subtitle="פרופיל"
          currentDate={currentDate}
          mobileBrand={{
            name: moduleTitle,
            logoUrl: workspaceLogo || null,
            fallbackIcon,
            badgeModuleKey: 'client',
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
          actionsSlot={<ModuleHelpVideos moduleKey="client" />}
          switcherSlot={<WorkspaceSwitcher />}
          notificationsSlot={<GlobalNotificationsBell />}
          user={{ name: resolvedUser.name, role: resolvedUser.role }}
          onProfileClickAction={undefined}
          profileHref={`${basePath}/me`}
          userAvatarSlot={avatarSlot}
          className="bg-transparent"
        />

        <div
          className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar p-4 md:p-8 pb-24 md:pb-8 min-h-0 touch-pan-y"
          id="main-scroll-container"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </main>

      <MobileBottomNav
        rightItems={[
          {
            id: 'dashboard',
            label: 'בית',
            icon: LayoutDashboard,
            active: false,
            onClick: () => onNavigateAction('/dashboard'),
          },
          {
            id: 'clients',
            label: 'לקוחות',
            icon: Users,
            active: false,
            onClick: () => onNavigateAction('/clients'),
          },
        ]}
        leftItems={[
          {
            id: 'intelligence',
            label: 'AI',
            icon: Cpu,
            active: false,
            onClick: () => onNavigateAction('/intelligence'),
          },
          {
            id: 'me',
            label: 'פרופיל',
            icon: SquareMousePointer,
            active: true,
            onClick: () => {},
          },
        ]}
        onPlusClickAction={() => {
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('open-nexus-command'));
          }
        }}
        plusAriaLabel="פעולה מהירה"
        plusGradient={getOSModule('client')?.gradient}
      />

      <GlobalSearchModal />
      <GlobalSupportModal />
    </div>
  );
}
