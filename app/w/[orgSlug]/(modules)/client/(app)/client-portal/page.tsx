'use client';

import React, { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import ClientPortal from '@/components/client-os-full/components/ClientPortal';

export const dynamic = 'force-dynamic';

export default function ClientClientPortalPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const clientId = useMemo(() => {
    const id = searchParams?.get('clientId');
    return id ? String(id) : null;
  }, [searchParams]);

  if (!clientId) {
    return null;
  }

  return <ClientPortal clientId={clientId} onBack={() => router.back()} />;
}
