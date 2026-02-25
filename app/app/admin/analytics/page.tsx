import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import AdminAnalyticsClient from './AdminAnalyticsClient';
import { getAnalyticsOverview, getPageAnalytics, getUserJourneys, getSignupRecords } from '@/app/actions/admin-analytics';

export const metadata = {
  title: 'אנליטיקס אתר | Admin',
};

async function AnalyticsLoader() {
  const [overviewRes, pagesRes, journeysRes, signupsRes] = await Promise.all([
    getAnalyticsOverview(30),
    getPageAnalytics(30),
    getUserJourneys({ days: 30, limit: 100 }),
    getSignupRecords(90),
  ]);

  return (
    <AdminAnalyticsClient
      overview={overviewRes.success ? overviewRes.data! : null}
      pages={pagesRes.success ? pagesRes.data! : []}
      journeys={journeysRes.success ? journeysRes.data! : []}
      signups={signupsRes.success ? signupsRes.data! : []}
      error={overviewRes.error || pagesRes.error || journeysRes.error || signupsRes.error || null}
    />
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    }>
      <AnalyticsLoader />
    </Suspense>
  );
}
