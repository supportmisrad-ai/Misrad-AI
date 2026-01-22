'use client';

import React from 'react';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import { useModuleIconNames } from '@/hooks/useModuleIconNames';
import { DynamicIcon } from '@/components/shared/DynamicIcon';

export function OSModuleIcon({
  moduleKey,
  size,
  strokeWidth,
  className,
}: {
  moduleKey: OSModuleKey | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const { moduleIcons } = useModuleIconNames();

  if (!moduleKey) return null;

  const iconName = String(moduleIcons?.[moduleKey] || modulesRegistry[moduleKey].iconName || '');
  if (!iconName) return null;

  return <DynamicIcon name={iconName} size={size} strokeWidth={strokeWidth} className={className} />;
}
