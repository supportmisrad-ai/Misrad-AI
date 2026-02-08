import React from 'react';
import ClientsPageClient from '@/components/social/clients/ClientsPageClient';

export const dynamic = 'force-dynamic';


export default async function ClientsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }> | { orgSlug: string };
}) {
  const { orgSlug } = await params;
  return <ClientsPageClient orgSlug={orgSlug} />;
}
