'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import LegacyNexusTenantsPanelClient from './LegacyNexusTenantsPanelClient';

export default function AdminNexusTenantsPageClient() {
  const router = useRouter();
  return <LegacyNexusTenantsPanelClient navigateAction={(path) => router.push(path)} />;
}
