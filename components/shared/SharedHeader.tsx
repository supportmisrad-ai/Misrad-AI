'use client';

import React, { useEffect, useState } from 'react';
import { Search, Headphones, Bell } from 'lucide-react';
import AttendanceMiniStatus from '@/components/shared/AttendanceMiniStatus';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { OSModuleSquircleIcon } from '@/components/shared/OSModuleIcon';
import { ModuleHelpVideos } from '@/components/help-videos/ModuleHelpVideos';

export function SharedHeader({
  title,
  subtitle,
  currentDate,
  mobileBrand,
  mobileLeadingSlot,
  onOpenCommandPaletteAction,
  onOpenSupportAction,
  actionsSlot,
  switcherSlot,
  notificationsSlot,
  user,
  onProfileClickAction,
  profileHref,
  userAvatarSlot,
  profileSlot,
  className,
}: {
  title: string;
  subtitle?: string | null;
  currentDate: string;
  mobileBrand: {
    name: string;
    logoUrl?: string | null;
    fallbackIcon?: React.ReactNode;
    badgeIcon?: React.ReactNode;
    badgeModuleKey?: OSModuleKey | null;
  };
  mobileLeadingSlot?: React.ReactNode;
  onOpenCommandPaletteAction?: () => void;
  onOpenSupportAction?: () => void;
  actionsSlot?: React.ReactNode;
  switcherSlot?: React.ReactNode;
  notificationsSlot?: React.ReactNode;
  user: {
    name: string;
    role?: string | null;
  };
  onProfileClickAction?: () => void;
  profileHref?: string;
  userAvatarSlot: React.ReactNode;
  profileSlot?: React.ReactNode;
  className?: string;
}) {
  const [mobileBrandLogoFailed, setMobileBrandLogoFailed] = useState(false);

  const resolvedRole = String(user?.role ?? '').trim();

  const openSupport = () => {
    if (onOpenSupportAction) {
      onOpenSupportAction();
      return;
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('os:open-support'));
    }
  };

  useEffect(() => {
    setMobileBrandLogoFailed(false);
  }, [mobileBrand.logoUrl]);

  return (
    <header className={`h-20 md:h-24 flex items-center justify-between px-4 md:px-8 z-40 sticky top-0 ${className || 'bg-white md:bg-transparent'}`}>
      <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
        {mobileLeadingSlot ? <div className="shrink-0">{mobileLeadingSlot}</div> : null}
        <div className="relative w-8 h-8 rounded-xl shrink-0">
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-[color:var(--os-header-mobile-logo-surface,#ffffff)] overflow-hidden border border-[color:var(--os-header-mobile-logo-border,#f3f4f6)] shadow-sm">
            {mobileBrand.logoUrl && !mobileBrandLogoFailed ? (
              <img
                src={mobileBrand.logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
                onError={() => setMobileBrandLogoFailed(true)}
              />
            ) : (
              mobileBrand.fallbackIcon || null
            )}
          </div>
          {mobileBrand.badgeModuleKey ? (
            <div className="absolute -bottom-1 -left-1 z-10">
              <OSModuleSquircleIcon moduleKey={mobileBrand.badgeModuleKey} boxSize={16} iconSize={10} className="shadow-none" />
            </div>
          ) : mobileBrand.badgeIcon ? (
            <div className="absolute -bottom-1 -left-1 z-10 w-4 h-4 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center">
              {mobileBrand.badgeIcon}
            </div>
          ) : null}
        </div>
        <span className="font-bold text-lg text-[color:var(--os-header-mobile-text,#111827)] truncate" suppressHydrationWarning>
          {mobileBrand.name}
        </span>
      </div>

      <div className="hidden md:flex flex-col justify-center">
        <h2 className="text-xl font-bold text-[color:var(--os-header-title,#111827)] tracking-tight flex items-center gap-2">{title}</h2>
        <p className="text-xs text-[color:var(--os-header-subtitle,#6b7280)] font-medium">{subtitle || currentDate}</p>
      </div>

      <div className="flex items-center gap-1 md:gap-5 relative bg-[color:var(--os-header-actions-surface,rgba(255,255,255,0.40))] backdrop-blur-xl p-1 pr-1.5 md:p-2 rounded-full border border-[color:var(--os-header-actions-border,rgba(255,255,255,0.60))] shadow-[0_4px_20px_rgba(0,0,0,0.03)] shrink-0 ml-2">
        {switcherSlot ? <div className="hidden md:contents">{switcherSlot}</div> : null}

        <AttendanceMiniStatus />

        <button
          id="command-search-btn"
          onClick={() => {
            if (onOpenCommandPaletteAction) {
              onOpenCommandPaletteAction();
            } else if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('os:open-search'));
            }
          }}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
          title="חיפוש (Cmd+K)"
          type="button"
        >
          <Search size={18} />
        </button>

        <button
          id="support-trigger"
          onClick={openSupport}
          className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
          aria-label="תמיכה"
          title="תמיכה"
          type="button"
        >
          <Headphones size={18} />
        </button>

        {actionsSlot !== undefined ? actionsSlot : null}

        {notificationsSlot ?? (
          <button
            id="notification-trigger"
            className="relative w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
            aria-label="התראות"
            title="התראות"
            type="button"
          >
            <Bell size={18} />
          </button>
        )}

        <div className="w-px h-6 bg-[color:var(--os-header-divider,rgba(156,163,175,0.20))] hidden md:block"></div>

        {profileSlot ? (
          <div className="flex items-center">{profileSlot}</div>
        ) : profileHref ? (
          <a
            id="user-profile-btn"
            href={profileHref}
            className="flex items-center gap-3 px-1.5 md:px-2.5 rounded-full transition-all hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))]"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-[color:var(--os-header-profile-name,#111827)] leading-none" suppressHydrationWarning>
                {user.name}
              </p>
              <p
                className="text-[10px] text-[color:var(--os-header-profile-role,#6b7280)] font-medium"
                suppressHydrationWarning
              >
                {resolvedRole || ''}
              </p>
            </div>
            {userAvatarSlot}
          </a>
        ) : (
          <button
            id="user-profile-btn"
            onClick={onProfileClickAction}
            className="flex items-center gap-3 px-1.5 md:px-2.5 rounded-full transition-all hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))]"
            type="button"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-[color:var(--os-header-profile-name,#111827)] leading-none" suppressHydrationWarning>
                {user.name}
              </p>
              <p
                className="text-[10px] text-[color:var(--os-header-profile-role,#6b7280)] font-medium"
                suppressHydrationWarning
              >
                {resolvedRole || ''}
              </p>
            </div>
            {userAvatarSlot}
          </button>
        )}
      </div>

      {mobileBrand.badgeModuleKey ? (
        <div className="hidden">
          <ModuleHelpVideos moduleKey={mobileBrand.badgeModuleKey} />
        </div>
      ) : null}
    </header>
  );
}
