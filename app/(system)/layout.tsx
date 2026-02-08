import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import React from 'react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

// Force dynamic rendering as this layout depends on authentication
export const dynamic = 'force-dynamic';

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
  try {
    const clerkUserId = await getCurrentUserId();
    if (clerkUserId) {
      const user = await prisma.organizationUser.findUnique({
        where: { clerk_user_id: clerkUserId },
        select: { organization_id: true },
      });

      const organizationId = user?.organization_id;
      if (!organizationId) {
        redirect('/subscribe/checkout');
      }

      const org = await prisma.organization.findUnique({
        where: { id: String(organizationId) },
        select: { has_system: true },
      });

      if (org && org.has_system === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/login');
  }

  const def = getModuleDefinition('system');
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
