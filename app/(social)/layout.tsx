import React from 'react';
import { Metadata } from 'next';
import { getSystemMetadata } from '@/lib/metadata';
import { getModuleDefinition } from '@/lib/os/modules/registry';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('social');

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const def = getModuleDefinition('social');
  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900" dir="rtl">
      {children}
    </div>
  );
}
