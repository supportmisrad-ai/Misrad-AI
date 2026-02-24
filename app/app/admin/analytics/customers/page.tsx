import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CustomerAnalyticsClient from './CustomerAnalyticsClient';
import { getCustomerAnalyticsOverview, getCustomerActivityList, generateAIInsights } from '@/app/actions/admin-analytics-ai';

export const metadata = {
  title: 'אנליטיקס לקוחות | Admin',
};

async function loadCustomerAnalyticsData() {
  const [overviewRes, activityRes, insightsRes] = await Promise.all([
    getCustomerAnalyticsOverview(90),
    getCustomerActivityList(),
    generateAIInsights(30),
  ]);

  return {
    overview: overviewRes.success ? overviewRes.data! : null,
    activity: activityRes.success ? activityRes.data! : [],
    insights: insightsRes.success ? insightsRes.data! : [],
    error: overviewRes.error || activityRes.error || insightsRes.error || null,
  };
}

export default async function AdminCustomerAnalyticsPage() {
  const data = await loadCustomerAnalyticsData();

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <CustomerAnalyticsClient
        overview={data.overview}
        activity={data.activity}
        insights={data.insights}
        error={data.error}
      />
    </Suspense>
  );
}
