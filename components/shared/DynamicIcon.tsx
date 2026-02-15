'use client';

import React from 'react';
import * as Icons from 'lucide-react';

export function DynamicIcon({
  name,
  size,
  strokeWidth,
  className,
  style,
}: {
  name: string | null | undefined;
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = (name
    ? (Icons as unknown as Record<
        string,
        React.ComponentType<{
          size?: number;
          strokeWidth?: number;
          className?: string;
          style?: React.CSSProperties;
        }>
      >)[name]
    : null);
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}
