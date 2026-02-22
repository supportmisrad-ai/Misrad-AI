'use client';

import React from 'react';
import AutomationsView from '@/components/system/system.os/components/AutomationsView';

export default function SystemAutomationsClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <AutomationsView />;
}
