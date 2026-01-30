'use client';

import React from 'react';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

export function OSModuleIcon({
  moduleKey,
  size,
  strokeWidth,
  className,
  style,
}: {
  moduleKey: OSModuleKey | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!moduleKey) return null;

  const iconName = String(modulesRegistry[moduleKey].iconName || '');
  if (!iconName) return null;

  const isAssetPath = iconName.startsWith('/') || iconName.startsWith('http://') || iconName.startsWith('https://');
  if (isAssetPath) {
    const safeSize = typeof size === 'number' ? size : 20;
    return (
      <img
        src={iconName}
        alt=""
        width={safeSize}
        height={safeSize}
        className={className}
        style={{ width: safeSize, height: safeSize, ...style }}
        draggable={false}
      />
    );
  }

  return <DynamicIcon name={iconName} size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}

export function OSModuleSquircleIcon({
  moduleKey,
  boxSize,
  iconSize,
  strokeWidth,
  className,
  iconClassName,
  disabled,
}: {
  moduleKey: OSModuleKey | null | undefined;
  boxSize?: number;
  iconSize?: number;
  strokeWidth?: number;
  className?: string;
  iconClassName?: string;
  disabled?: boolean;
}) {
  if (!moduleKey) return null;

  const theme = modulesRegistry[moduleKey]?.theme;
  const accent = theme?.accent || '#0F172A';
  const gradient = theme?.gradient || null;
  const iconName = String(modulesRegistry[moduleKey]?.iconName || '');
  const isAssetIcon = iconName.startsWith('/') || iconName.startsWith('http://') || iconName.startsWith('https://');
  const safeBoxSize = typeof boxSize === 'number' ? boxSize : 56;
  const safeIconSize = typeof iconSize === 'number' ? iconSize : 22;
  const radius = Math.max(8, Math.round(safeBoxSize * 0.32));
  const shouldShadow = safeBoxSize >= 28;

  return (
    <div
      className={
        `flex items-center justify-center` +
        (!isAssetIcon && gradient ? ` bg-gradient-to-br ${gradient}` : '') +
        (shouldShadow ? ' shadow-[0_16px_36px_-20px_rgba(0,0,0,0.45)]' : '') +
        (disabled ? ' opacity-50' : '') +
        (className ? ` ${className}` : '')
      }
      style={{ width: safeBoxSize, height: safeBoxSize, backgroundColor: !isAssetIcon && gradient ? undefined : isAssetIcon ? 'transparent' : accent, borderRadius: radius, overflow: isAssetIcon ? 'hidden' : undefined }}
      aria-hidden="true"
    >
      <OSModuleIcon
        moduleKey={moduleKey}
        size={isAssetIcon ? safeBoxSize : safeIconSize}
        strokeWidth={strokeWidth}
        className={isAssetIcon ? 'w-full h-full object-cover' : iconClassName || 'text-white'}
      />
    </div>
  );
}
