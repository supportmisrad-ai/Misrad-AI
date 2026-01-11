'use client';

import React, { useEffect, useState } from 'react';
import { Search, Headphones } from 'lucide-react';

export function SharedHeader({
  title,
  subtitle,
  currentDate,
  mobileBrand,
  mobileLeadingSlot,
  onOpenCommandPaletteAction,
  onOpenSupportAction,
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
  };
  mobileLeadingSlot?: React.ReactNode;
  onOpenCommandPaletteAction?: () => void;
  onOpenSupportAction?: () => void;
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

  useEffect(() => {
    setMobileBrandLogoFailed(false);
  }, [mobileBrand.logoUrl]);

  return (
    <header className={`h-20 md:h-24 flex items-center justify-between px-4 md:px-8 z-40 sticky top-0 ${className || ''}`}>
      <div className="flex items-center gap-2 md:hidden flex-1 min-w-0">
        {mobileLeadingSlot ? mobileLeadingSlot : null}
        <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center bg-[color:var(--os-header-mobile-logo-surface,#ffffff)] overflow-hidden border border-[color:var(--os-header-mobile-logo-border,#f3f4f6)] shadow-sm">
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
        <span className="font-bold text-lg text-[color:var(--os-header-mobile-text,#111827)] truncate" suppressHydrationWarning>
          {mobileBrand.name}
        </span>
      </div>

      <div className="hidden md:flex flex-col justify-center">
        <h2 className="text-xl font-bold text-[color:var(--os-header-title,#111827)] tracking-tight flex items-center gap-2">{title}</h2>
        <p className="text-xs text-[color:var(--os-header-subtitle,#6b7280)] font-medium">{subtitle || currentDate}</p>
      </div>

      <div className="flex items-center gap-1 md:gap-5 relative bg-[color:var(--os-header-actions-surface,rgba(255,255,255,0.40))] backdrop-blur-xl p-1 pr-1.5 md:p-2 rounded-full border border-[color:var(--os-header-actions-border,rgba(255,255,255,0.60))] shadow-[0_4px_20px_rgba(0,0,0,0.03)] shrink-0 ml-2">
        <button
          id="command-search-btn"
          onClick={() => onOpenCommandPaletteAction?.()}
          className="p-2 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
          title="חיפוש (Cmd+K)"
          type="button"
        >
          <Search size={18} />
        </button>

        <button
          onClick={() => onOpenSupportAction?.()}
          className="p-2 rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
          aria-label="תמיכה"
          title="תמיכה"
          type="button"
        >
          <Headphones size={18} />
        </button>

        <div className="hidden md:flex items-center gap-2">{switcherSlot}</div>

        {notificationsSlot}

        <div className="w-px h-6 bg-[color:var(--os-header-divider,rgba(156,163,175,0.20))] hidden md:block"></div>

        {profileSlot ? (
          profileSlot
        ) : profileHref ? (
          <a
            id="user-profile-btn"
            href={profileHref}
            className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))]"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-[color:var(--os-header-profile-name,#111827)] leading-none" suppressHydrationWarning>
                {user.name}
              </p>
              <p className="text-[10px] text-[color:var(--os-header-profile-role,#6b7280)] font-medium" suppressHydrationWarning>
                {user.role || ''}
              </p>
            </div>
            {userAvatarSlot}
          </a>
        ) : (
          <button
            id="user-profile-btn"
            onClick={onProfileClickAction}
            className="flex items-center gap-3 pl-0.5 pr-0.5 md:pr-4 rounded-full transition-all hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))]"
            type="button"
          >
            <div className="text-right hidden md:block">
              <p className="text-sm font-bold text-[color:var(--os-header-profile-name,#111827)] leading-none" suppressHydrationWarning>
                {user.name}
              </p>
              <p className="text-[10px] text-[color:var(--os-header-profile-role,#6b7280)] font-medium" suppressHydrationWarning>
                {user.role || ''}
              </p>
            </div>
            {userAvatarSlot}
          </button>
        )}
      </div>
    </header>
  );
}
