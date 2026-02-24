/**
 * Social Media Publishing Service
 *
 * Architecture:
 *   Publishing is handled server-side via Webhooks (Make.com / Zapier).
 *   The actual publish flow lives in `app/actions/posts.ts` → `publishPost()`,
 *   which calls `triggerWebhookEvent({ eventType: 'post_published', payload })`.
 *
 *   This client-side module exposes helpers for UI components that need to
 *   reference the publishing status or metrics. Real engagement data
 *   (likes, comments, reach) will become available when a direct Meta /
 *   LinkedIn / TikTok API integration is connected.
 *
 * See also:
 *   - `app/actions/posts.ts`         → Server Actions (create / update / publish / delete)
 *   - `app/actions/integrations.ts`  → Webhook configuration (Make, Zapier, Morning, etc.)
 *   - `components/social/settings/SocialConnectionsTab.tsx` → UI for API connections
 */

export type PublishStatus = 'pending' | 'sent_to_webhook' | 'published' | 'failed';

export interface PostPublishResult {
  status: PublishStatus;
  webhookDelivered: boolean;
  error?: string;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  dataSource: 'platform_api' | 'internal_estimate' | 'unavailable';
}

/**
 * Returns empty metrics with an 'unavailable' data source indicator.
 * When a real platform API integration is connected, this will fetch
 * actual engagement data from Facebook / Instagram / LinkedIn / TikTok.
 */
export function getPostMetricsPlaceholder(): PostMetrics {
  return {
    likes: 0,
    comments: 0,
    shares: 0,
    reach: 0,
    dataSource: 'unavailable',
  };
}
