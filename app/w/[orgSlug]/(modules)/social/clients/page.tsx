import React from 'react';
import ClientsPageClient from '@/components/social/clients/ClientsPageClient';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls


export default async function ClientsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  return <ClientsPageClient orgSlug={orgSlug} />;
}
