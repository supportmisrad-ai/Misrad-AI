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
  const Icon = (name ? (Icons as any)[name] : null) as any;
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />;
}
