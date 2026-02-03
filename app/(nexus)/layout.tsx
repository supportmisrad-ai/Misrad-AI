import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSystemMetadata } from '@/lib/metadata';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { getModuleDefinition } from '@/lib/os/modules/registry';

// Force dynamic rendering as this layout depends on authentication
export const dynamic = 'force-dynamic';

/**
 * Nexus OS Layout
 * 
 * This layout wraps all Nexus OS routes.
 * The actual Layout component is used inside app/app/page.tsx with react-router.
 */

export const metadata: Metadata = {
  ...getSystemMetadata('nexus'),
};

export default async function NexusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard: require Nexus room access
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
        select: { has_nexus: true },
      });

      if (org && org.has_nexus === false) {
        redirect('/subscribe/checkout');
      }
    }
  } catch {
    redirect('/sign-in');
  }

  const def = getModuleDefinition('nexus');
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

