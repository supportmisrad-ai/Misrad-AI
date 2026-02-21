import React from 'react';
import CyclesManager from '@/components/client-os-full/components/CyclesManager';
import { EmailCenter } from '@/components/client-os-full/components/EmailCenter';
import { FormsManager } from '@/components/client-os-full/components/FormsManager';
import FeedbackLoop from '@/components/client-os-full/components/FeedbackLoop';
import MeetingIntelligence from '@/components/client-os-full/components/MeetingIntelligence';
import MeetingAnalyzer from '@/components/client-os-full/components/MeetingAnalyzer';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function ClientViewPage({
  params,
}: {
  params: { view: string };
}) {
  const { view } = params;
  const viewKey = String(view || '').trim();

  if (viewKey === 'cycles') return <CyclesManager />;
  if (viewKey === 'email') return <EmailCenter />;
  if (viewKey === 'forms') return <FormsManager />;
  if (viewKey === 'feedback') return <FeedbackLoop />;
  if (viewKey === 'intelligence') return <MeetingIntelligence />;
  if (viewKey === 'analyzer') return <MeetingAnalyzer />;

  return null;
}
