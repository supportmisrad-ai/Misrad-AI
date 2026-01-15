'use client';

import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { WorkspaceSwitcher } from '@/components/os/WorkspaceSwitcher';
import { SharedHeader } from '@/components/shared/SharedHeader';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';

export function SystemHeader({
  title,
  currentDate,
  brand,
  isWorkspaceRoute,
  onOpenCommandPaletteAction,
  onNavigateToNotificationsAction,
  onProfileClickAction,
  user,
  roleLabel,
  avatarUrl,
  hasValidAvatarSrc,
}: {
  title: string;
  currentDate: string;
  brand: {
    name: string;
    logoUrl?: string | null;
    fallbackIcon?: React.ReactNode;
  };
  isWorkspaceRoute: boolean;
  onOpenCommandPaletteAction: () => void;
  onNavigateToNotificationsAction: () => void;
  onProfileClickAction: () => void;
  user: {
    name: string;
    email?: string | null;
  };
  roleLabel: string;
  avatarUrl: string;
  hasValidAvatarSrc: boolean;
}) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = document.getElementById('main-scroll-container');
    if (!el) return;
    const onScroll = () => setIsScrolled(el.scrollTop > 0);
    onScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const headerClassName = isScrolled
    ? 'bg-transparent backdrop-blur-xl border-b border-white/30 transition-colors duration-200'
    : 'bg-transparent transition-colors duration-200';

  const profileSlot = (
    <div className="relative hidden md:block">
      <button
        onClick={onProfileClickAction}
        className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-white/50"
        type="button"
        aria-label="פרופיל"
      >
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-gray-900 leading-none" suppressHydrationWarning>
            {user.name}
          </p>
          <p className="text-[10px] text-gray-500 font-medium" suppressHydrationWarning>
            {roleLabel}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-nexus-gradient flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden">
          {hasValidAvatarSrc ? (
            <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name.charAt(0)
          )}
        </div>
      </button>
    </div>
  );

  const notificationsSlot = (
    <div className="flex items-center gap-2">
      <AttendanceMiniStatus />
      <button
        onClick={onNavigateToNotificationsAction}
        className="relative p-2 rounded-full transition-colors hover:bg-white/50 text-gray-600"
        aria-label="התראות"
        type="button"
      >
        <Bell size={18} />
      </button>
      <button
        onClick={onProfileClickAction}
        className="md:hidden w-9 h-9 rounded-full bg-nexus-gradient flex items-center justify-center text-white text-sm font-bold shadow-md border-2 border-white overflow-hidden"
        aria-label="פרופיל"
        type="button"
      >
        {hasValidAvatarSrc ? (
          <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover" />
        ) : (
          user.name.charAt(0)
        )}
      </button>
    </div>
  );

  const switcherSlot = (
    <div className="flex items-center gap-2">
      {isWorkspaceRoute ? <WorkspaceSwitcher /> : <RoomSwitcher />}
    </div>
  );

  return (
    <SharedHeader
      title={title}
      subtitle={null}
      currentDate={currentDate}
      mobileBrand={brand}
      onOpenCommandPaletteAction={onOpenCommandPaletteAction}
      onOpenSupportAction={undefined}
      switcherSlot={switcherSlot}
      notificationsSlot={notificationsSlot}
      user={{ name: user.name, role: roleLabel }}
      onProfileClickAction={undefined}
      userAvatarSlot={null}
      profileSlot={profileSlot}
      className={headerClassName}
    />
  );
}
