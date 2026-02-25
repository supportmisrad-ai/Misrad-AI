import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React, { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

/**
 * System.OS Layout
 * 
 * This is the main layout for System.OS (Sales & Leads management).
 * SystemApp already includes all necessary providers (AuthProvider, ToastProvider, etc.)
 */

export const metadata: Metadata = {
  ...getSystemMetadata('system'),
};

export default async function SystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: require System room access
  let clerkUserId: string | null = null;
  try {
    clerkUserId = await getCurrentUserId();
  } catch {
    redirect('/login');
  }
  if (!clerkUserId) redirect('/login');

  const user = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { organization_id: true, Organization: { select: { has_system: true } } },
  });

  if (!user?.organization_id) redirect('/subscribe/checkout');
  if (user.Organization && user.Organization.has_system === false) redirect('/subscribe/checkout');

  const def = getModuleDefinition('system');
  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900 font-sans" dir="rtl">
      <Suspense fallback={<ModuleLoadingScreen moduleKey="system" />}>
        {children}
      </Suspense>
    </div>
  );
}
