'use client';

import React from 'react';
import { NAV_ITEMS, PRIMARY_NAV_PATHS } from './layout.types';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { useRouter } from 'next/navigation';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { PermissionId } from '@/types';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  organization: {
    name: string;
    logo?: string;
    enabledModules: string[];
    systemFlags?: Record<string, string>;
  };
  hasPermission: (permission: PermissionId) => boolean;
  filteredNavItems: typeof NAV_ITEMS;
  isActive: (path: string) => boolean;
  navigate: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  organization,
  hasPermission,
  filteredNavItems,
  isActive,
  navigate,
}) => {
  const router = useRouter();

  const { roomName, room } = useRoomBranding();

  const fallbackIcon = room ? <OSModuleSquircleIcon moduleKey={room} boxSize={40} iconSize={18} className="shadow-none" /> : null;

  return (
    <SharedSidebar
      isOpen={isSidebarOpen}
      onSetOpenAction={setIsSidebarOpen}
      brand={{
        name: organization.name,
        logoUrl: organization.logo || null,
        fallbackIcon,
        badgeModuleKey: room,
      }}
      brandSubtitle={roomName || null}
      onBrandClickAction={() => router.push('/workspaces')}
      topSlot={
        <div className="flex flex-col gap-2">
          <BusinessSwitcher currentTenantName={organization.name} />
          <WorkspaceSwitcher className="w-full" />
        </div>
      }
      navItems={filteredNavItems}
      primaryNavPaths={PRIMARY_NAV_PATHS}
      isActiveAction={isActive}
      onNavigateAction={navigate}
      bottomSlot={
        <OSAppSwitcher
          compact={true}
          buttonVariant={isSidebarOpen ? 'wide' : 'icon'}
          buttonLabel="מודולים"
          className={isSidebarOpen ? '' : 'w-full flex justify-center'}
        />
      }
    />
  );
};

export const MemoSidebar = React.memo(Sidebar);

