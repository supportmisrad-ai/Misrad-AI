'use client';

import React from 'react';
import { NAV_ITEMS, PRIMARY_NAV_PATHS } from './layout.types';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import OSAppSwitcher from '@/components/shared/OSAppSwitcher';
import { SharedSidebar } from '@/components/shared/SharedSidebar';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { BusinessSwitcher } from '@/components/BusinessSwitcher';

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
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  console.log(`[Nexus][Sidebar] render #${renderCountRef.current}`);

  const { RoomIcon, roomName, roomNameHebrew, room } = useRoomBranding();

  const fallbackIcon =
    room === 'nexus' ? (
      <img src="/icons/nexus-icon.svg" alt="Nexus" className="w-full h-full object-cover" />
    ) : RoomIcon ? (
      <RoomIcon size={20} className="text-gray-900" />
    ) : null;

  return (
    <SharedSidebar
      isOpen={isSidebarOpen}
      onSetOpenAction={setIsSidebarOpen}
      brand={{
        name: organization.name,
        logoUrl: organization.logo || null,
        fallbackIcon,
      }}
      brandSubtitle={roomName || roomNameHebrew || null}
      onBrandClickAction={() => navigate('/')}
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
      bottomSlot={<OSAppSwitcher mode="inlineGrid" compact={true} className={isSidebarOpen ? '' : 'w-full'} />}
    />
  );
};

export const MemoSidebar = React.memo(Sidebar);

