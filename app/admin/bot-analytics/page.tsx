import { Suspense } from 'react';
import { Metadata } from 'next';
import { BotAnalyticsDashboard } from '@/components/admin/bot-leads/bot-analytics-dashboard';

export const metadata: Metadata = {
  title: 'אנליטיקס לידים | MISRAD AI',
  description: 'סקירת ביצועים וניתוח לידים מהבוט',
};

export const revalidate = 60; // Revalidate every minute

export default function BotAnalyticsPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Suspense fallback={<AnalyticsSkeleton />}>
        <BotAnalyticsDashboard />
      </Suspense>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 w-24 bg-gray-200 rounded animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 w-full bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
