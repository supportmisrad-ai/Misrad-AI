import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import CustomerAnalyticsClient from './CustomerAnalyticsClient';
import { getCustomerAnalyticsOverview, getCustomerActivityList, generateAIInsights, getRealtimeActivity } from '@/app/actions/admin-analytics-ai';

export const metadata = {
  title: 'אנליטיקס לקוחות | Admin',
};

async function loadCustomerAnalyticsData() {
  const overviewP = getCustomerAnalyticsOverview(90);
  const activityP = getCustomerActivityList();
  const insightsP = generateAIInsights(30);
  const realtimeP = getRealtimeActivity();

  const [overviewRes, activityRes, insightsRes, realtimeRes] = await Promise.all([
    overviewP, activityP, insightsP, realtimeP,
  ]);

  return {
    overview: overviewRes.success ? overviewRes.data! : null,
    activity: activityRes.success ? activityRes.data! : [],
    insights: insightsRes.success ? insightsRes.data! : [],
    realtime: realtimeRes.success ? realtimeRes.data! : null,
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
        realtime={data.realtime}
        error={data.error}
      />
    </Suspense>
  );
}
