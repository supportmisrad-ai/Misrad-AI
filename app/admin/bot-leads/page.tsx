import { Suspense } from 'react';
import { Metadata } from 'next';
import { getBotLeads, getBotLeadCampaigns } from '@/app/actions/bot-leads';
import { BotLeadsClient } from '@/components/admin/bot-leads/bot-leads-client';

export const metadata: Metadata = {
  title: 'לידים מהבוט | MISRAD AI',
  description: 'ניהול לידים מבלאסטר וואטסאפ',
};

export const revalidate = 0; // Disable caching for real-time data

export default async function BotLeadsPage() {
  const [{ leads, total }, campaigns] = await Promise.all([
    getBotLeads({ page: 1, pageSize: 50 }),
    getBotLeadCampaigns(),
  ]);

  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<BotLeadsSkeleton />}>
        <BotLeadsClient
          initialLeads={leads}
          initialTotal={total}
          campaigns={campaigns}
        />
      </Suspense>
    </div>
  );
}

function BotLeadsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-10 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      
      <div className="h-20 w-full bg-gray-200 rounded animate-pulse" />
      
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
