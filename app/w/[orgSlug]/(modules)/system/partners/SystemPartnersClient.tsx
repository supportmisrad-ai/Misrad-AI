'use client';

import React from 'react';
import PartnersView from '@/components/system/system.os/components/PartnersView';

export default function SystemPartnersClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <PartnersView />;
}
