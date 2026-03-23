'use client';

import React from 'react';
import { Avatar } from '../Avatar';
import { UnifiedNotificationsBell } from '@/components/shared/UnifiedNotificationsBell';
import { RoomSwitcher } from '../shared/RoomSwitcher';
import { WorkspaceSwitcher } from '../os/WorkspaceSwitcher';
import { NAV_ITEMS } from './layout.types';
import { useRoomBranding } from '@/hooks/useRoomBranding';
import { SharedHeader } from '@/components/shared/SharedHeader';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';

interface HeaderProps {
  location: { pathname: string };
  currentDate: string;
  organization: {
    name: string;
    logo?: string;
  };
  currentUser: {
    name: string;
    role: string;
    avatar?: string;
  };
  setCommandPaletteOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  openSupport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  location,
  currentDate,
  organization,
  currentUser,
  setCommandPaletteOpen,
  navigate,
  openSupport,
}) => {
  const { room } = useRoomBranding();
  const isWorkspaceRoute = Boolean(location?.pathname?.startsWith('/w/'));

  const pageLabel =
    location.pathname === '/brain'
      ? 'Nexus AI'
      : NAV_ITEMS.find((i) => i.path === location.pathname)?.label || 'לוח בקרה';

  const mainTitle = organization.name || pageLabel;

  const mobileFallbackIcon = organization.logo ? null : room ? <OSModuleSquircleIcon moduleKey={room} boxSize={32} iconSize={16} className="shadow-none" /> : null;

  const notificationsSlot = <UnifiedNotificationsBell />;

  const switcherSlot = isWorkspaceRoute ? (
    <div className="flex items-center gap-2">
      <WorkspaceSwitcher />
    </div>
  ) : (
    <RoomSwitcher />
  );

  return (
    <SharedHeader
      title={mainTitle}
      subtitle={pageLabel}
      currentDate={currentDate}
      mobileBrand={{
        name: organization.name,
        logoUrl: organization.logo || null,
        fallbackIcon: mobileFallbackIcon,
        badgeModuleKey: room,
      }}
      onOpenCommandPaletteAction={() => setCommandPaletteOpen(true)}
      onOpenSupportAction={openSupport}
      switcherSlot={switcherSlot}
      notificationsSlot={notificationsSlot}
      user={{ name: currentUser.name, role: currentUser.role }}
      onProfileClickAction={() => navigate('/me')}
      profileHref={undefined}
      userAvatarSlot={
        <Avatar
          src={currentUser.avatar}
          alt="Profile"
          name={currentUser.name}
          size="md"
          className="border-2 border-white shadow-sm"
        />
      }
      className="bg-transparent"
    />
  );
};

export const MemoHeader = React.memo(Header);

