'use client';

import React from 'react';
import CallAnalyzerView from '@/components/system/system.os/components/CallAnalyzerView';

export default function SystemCallAnalyzerClient({
  orgSlug: _orgSlug,
}: {
  orgSlug: string;
}) {
  return <CallAnalyzerView />;
}
