import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React, { Suspense } from 'react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('client');

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let clerkUserId: string | null = null;
  try {
    clerkUserId = await getCurrentUserId();
  } catch {
    redirect('/login');
  }
  if (!clerkUserId) redirect('/login');

  const user = await prisma.organizationUser.findUnique({
    where: { clerk_user_id: clerkUserId },
    select: { organization_id: true, Organization: { select: { has_client: true } } },
  });

  if (!user?.organization_id) redirect('/subscribe/checkout');
  if (user.Organization && user.Organization.has_client === false) redirect('/subscribe/checkout');

  const def = getModuleDefinition('client');
  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900 font-sans" dir="rtl">
      <Suspense fallback={<ModuleLoadingScreen moduleKey="client" />}>
        {children}
      </Suspense>
    </div>
  );
}
