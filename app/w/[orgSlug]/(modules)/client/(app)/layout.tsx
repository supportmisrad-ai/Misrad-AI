import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { getSystemMetadata } from '@/lib/metadata';
import { ModuleLoadingScreen } from '@/components/shared/ModuleLoadingScreen';
import ClientAppLayoutShell from './ClientAppLayoutShell';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export const metadata: Metadata = getSystemMetadata('client');

export default async function ClientAppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;

  return (
    <Suspense fallback={<ModuleLoadingScreen moduleKey="client" />}>
      <ClientAppLayoutShell orgSlug={orgSlug}>
        {children}
      </ClientAppLayoutShell>
    </Suspense>
  );
}
