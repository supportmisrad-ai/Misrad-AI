import React from 'react';
import CyclesManager from '@/components/client-os-full/components/CyclesManager';
import { EmailCenter } from '@/components/client-os-full/components/EmailCenter';
import { FormsManager } from '@/components/client-os-full/components/FormsManager';
import FeedbackLoop from '@/components/client-os-full/components/FeedbackLoop';
import MeetingIntelligence from '@/components/client-os-full/components/MeetingIntelligence';
import MeetingAnalyzer from '@/components/client-os-full/components/MeetingAnalyzer';

export const dynamic = 'force-dynamic';

export default async function ClientViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = await params;
  const viewKey = String(view || '').trim();

  if (viewKey === 'cycles') return <CyclesManager />;
  if (viewKey === 'email') return <EmailCenter />;
  if (viewKey === 'forms') return <FormsManager />;
  if (viewKey === 'feedback') return <FeedbackLoop />;
  if (viewKey === 'intelligence') return <MeetingIntelligence />;
  if (viewKey === 'analyzer') return <MeetingAnalyzer />;

  return null;
}
