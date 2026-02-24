'use client';

import { useSiteAnalytics } from '@/hooks/useSiteAnalytics';

export function SiteAnalyticsTracker() {
  useSiteAnalytics();
  return null;
}
