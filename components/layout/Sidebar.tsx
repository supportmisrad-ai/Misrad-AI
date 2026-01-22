'use client';

import React from 'react';
import { NAV_ITEMS, PRIMARY_NAV_PATHS } from './layout.types';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { useRouter } from 'next/navigation';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { OSModuleIcon } from '@/components/shared/OSModuleIcon';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  organization: {
    name: string;
    logo?: string;
    enabledModules: string[];
    systemFlags?: Record<string, string>;
  };
  hasPermission: (permission: string) => boolean;
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
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  console.log(`[Nexus][Sidebar] render #${renderCountRef.current}`);

  const { roomIconName, roomName, roomNameHebrew, room } = useRoomBranding();

  const fallbackIcon =
    room === 'nexus' ? (
      <img src="/icons/nexus-icon.svg" alt="Nexus" className="w-full h-full object-cover" />
    ) : roomIconName ? (
      <DynamicIcon name={roomIconName} size={20} className="text-gray-900" />
    ) : null;

  return (
    <SharedSidebar
      isOpen={isSidebarOpen}
      onSetOpenAction={setIsSidebarOpen}
      brand={{
        name: organization.name,
        logoUrl: organization.logo || null,
        fallbackIcon,
        badgeIcon: <OSModuleIcon moduleKey={room} size={12} className="text-slate-900" />,
      }}
      brandSubtitle={roomName || roomNameHebrew || null}
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

