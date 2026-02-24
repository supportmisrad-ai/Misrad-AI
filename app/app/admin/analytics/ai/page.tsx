import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AIAnalyticsClient from './AIAnalyticsClient';
import { getAIUsageOverview, getAIUsageLogs, generateAIInsights } from '@/app/actions/admin-analytics-ai';

export const metadata = {
  title: 'אנליטיקס AI | Admin',
};

async function loadAIAnalyticsData() {
  const [overviewRes, logsRes, insightsRes] = await Promise.all([
    getAIUsageOverview(30),
    getAIUsageLogs({ days: 30, limit: 200 }),
    generateAIInsights(30),
  ]);

  return {
    overview: overviewRes.success ? overviewRes.data! : null,
    logs: logsRes.success ? logsRes.data! : [],
    insights: insightsRes.success ? insightsRes.data! : [],
    error: overviewRes.error || logsRes.error || insightsRes.error || null,
  };
}

export default async function AdminAIAnalyticsPage() {
  const data = await loadAIAnalyticsData();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <AIAnalyticsClient
        overview={data.overview}
        logs={data.logs}
        insights={data.insights}
        error={data.error}
      />
    </Suspense>
  );
}
