import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('finance');

export default async function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const clerkUserId = await getCurrentUserId();
    if (clerkUserId) {
      const user = await prisma.organizationUser.findUnique({
        where: { clerk_user_id: clerkUserId },
        select: { organization_id: true, Organization: { select: { has_finance: true } } },
      });

      const organizationId = user?.organization_id;
      if (!organizationId) {
        redirect('/subscribe/checkout');
      }

      const org = user?.Organization;
      if (org && org.has_finance === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/login');
  }

  const def = getModuleDefinition('finance');
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
