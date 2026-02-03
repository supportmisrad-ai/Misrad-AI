import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = getSystemMetadata('client');

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const clerkUserId = await getCurrentUserId();
    if (clerkUserId) {
      const user = await prisma.social_users.findUnique({
        where: { clerk_user_id: clerkUserId },
        select: { organization_id: true },
      });

      const organizationId = user?.organization_id;
      if (!organizationId) {
        redirect('/subscribe/checkout');
      }

      const org = await prisma.social_organizations.findUnique({
        where: { id: String(organizationId) },
        select: { has_client: true },
      });

      if (org && org.has_client === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/sign-in');
  }

  const def = getModuleDefinition('client');
  const style = {
    '--os-accent': def.theme.accent,
    '--os-bg': def.theme.background,
  } as React.CSSProperties;

  return (
    <div style={style} data-module={def.key} className="min-h-screen bg-[var(--os-bg)] text-slate-900 font-sans" dir="rtl">
      {children}
    </div>
  );
}
