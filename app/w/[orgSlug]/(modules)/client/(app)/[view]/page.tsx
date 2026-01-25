'use client';

import React from 'react';
import CyclesManager from '@/components/client-os-full/components/CyclesManager';
import { EmailCenter } from '@/components/client-os-full/components/EmailCenter';
import { FormsManager } from '@/components/client-os-full/components/FormsManager';
import FeedbackLoop from '@/components/client-os-full/components/FeedbackLoop';
import MeetingIntelligence from '@/components/client-os-full/components/MeetingIntelligence';
import MeetingAnalyzer from '@/components/client-os-full/components/MeetingAnalyzer';

export const dynamic = 'force-dynamic';

export default function ClientViewPage({
  params,
}: {
  params: { view: string };
}) {
  const view = String(params.view || '').trim();

  if (view === 'cycles') return <CyclesManager />;
  if (view === 'email') return <EmailCenter />;
  if (view === 'forms') return <FormsManager />;
  if (view === 'feedback') return <FeedbackLoop />;
  if (view === 'intelligence') return <MeetingIntelligence />;
  if (view === 'analyzer') return <MeetingAnalyzer />;

  return null;
}
