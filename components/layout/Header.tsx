'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { Avatar } from '../Avatar';
import { NotificationsPanel } from '../NotificationsPanel';
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
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  hasUnread: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  openSupport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  location,
  currentDate,
  organization,
  currentUser,
  isNotificationsOpen,
  setIsNotificationsOpen,
  hasUnread,
  setCommandPaletteOpen,
  navigate,
  openSupport,
}) => {
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  const { room } = useRoomBranding();
  const isWorkspaceRoute = Boolean(location?.pathname?.startsWith('/w/'));

  const title =
    location.pathname === '/brain'
      ? 'Nexus AI'
      : NAV_ITEMS.find((i) => i.path === location.pathname)?.label || 'לוח בקרה';

  const mobileFallbackIcon = organization.logo ? null : room ? <OSModuleSquircleIcon moduleKey={room} boxSize={32} iconSize={16} className="shadow-none" /> : null;

  const notificationsSlot = (
    <>
      <button
        id="notification-trigger"
        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
        className={`relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors ${isNotificationsOpen ? 'bg-black text-white' : 'hover:bg-white/50 text-gray-600'}`}
        aria-label={isHydrated && hasUnread ? 'התראות - יש התראות חדשות' : 'התראות'}
        type="button"
      >
        <Bell size={18} />
        {isHydrated && hasUnread ? <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span> : null}
      </button>
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  );

  const switcherSlot = isWorkspaceRoute ? (
    <div className="flex items-center gap-2">
      <WorkspaceSwitcher />
    </div>
  ) : (
    <RoomSwitcher />
  );

  return (
    <SharedHeader
      title={title}
      subtitle={null}
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
      onProfileClickAction={undefined}
      profileHref="/me"
      userAvatarSlot={
        <Avatar
          src={currentUser.avatar}
          alt="Profile"
          name={currentUser.name}
          size="md"
          className="border-2 border-white shadow-sm"
        />
      }
    />
  );
};

export const MemoHeader = React.memo(Header);

