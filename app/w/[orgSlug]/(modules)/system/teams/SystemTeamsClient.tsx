'use client';

import React from 'react';
import TeamsView from '@/components/system/TeamsView';

export default function SystemTeamsClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <TeamsView />;
}
