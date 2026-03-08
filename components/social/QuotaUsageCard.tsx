'use client';

/**
 * Quota Usage Card - מציג שימוש במכסות Social Plan
 */

import { useMemo } from 'react';
import { AlertCircle, TrendingUp, Users, FileText } from 'lucide-react';
import { SocialPlan } from '@/types/social';
import { SOCIAL_PLAN_LIMITS, calculateQuotaUsage, getSocialPlanLabel } from '@/lib/social/plan-limits';

interface QuotaUsageCardProps {
  plan: SocialPlan;
  currentPosts: number;
  currentClients: number;
  currentPlatforms: number;
}

export default function QuotaUsageCard({
  plan,
  currentPosts,
  currentClients,
  currentPlatforms,
}: QuotaUsageCardProps) {
  const limits = SOCIAL_PLAN_LIMITS[plan];

  const postsQuota = useMemo(
    () => calculateQuotaUsage(currentPosts, plan, 'posts'),
    [currentPosts, plan]
  );

  const clientsQuota = useMemo(
    () => calculateQuotaUsage(currentClients, plan, 'clients'),
    [currentClients, plan]
  );

  const platformsQuota = useMemo(
    () => calculateQuotaUsage(currentPlatforms, plan, 'platforms'),
    [currentPlatforms, plan]
  );

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'ללא הגבלה' : limit.toLocaleString();
  };

  const getProgressColor = (percentage: number, warning: boolean) => {
    if (warning) return 'bg-red-500';
    if (percentage > 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">מכסות חודשיות</h3>
        <span className="text-sm text-muted-foreground">
          {getSocialPlanLabel(plan)}
        </span>
      </div>

      <div className="space-y-4">
        {/* Posts Quota */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">פוסטים</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentPosts} / {formatLimit(limits.maxPostsPerMonth)}
            </span>
          </div>
          {limits.maxPostsPerMonth !== -1 && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    postsQuota.percentage,
                    postsQuota.warning
                  )}`}
                  style={{ width: `${Math.min(postsQuota.percentage, 100)}%` }}
                />
              </div>
              {postsQuota.warning && (
                <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                  <AlertCircle className="h-3 w-3" />
                  <span>מתקרב למגבלה - שדרג תוכנית</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Clients Quota (if relevant) */}
        {limits.maxClients > 1 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">לקוחות</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {currentClients} / {formatLimit(limits.maxClients)}
              </span>
            </div>
            {limits.maxClients !== -1 && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressColor(
                      clientsQuota.percentage,
                      clientsQuota.warning
                    )}`}
                    style={{ width: `${Math.min(clientsQuota.percentage, 100)}%` }}
                  />
                </div>
                {clientsQuota.warning && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    <span>מתקרב למגבלה - שדרג ל-Agency</span>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Platforms Quota */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">פלטפורמות</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {currentPlatforms} / {formatLimit(limits.maxPlatforms)}
            </span>
          </div>
          {limits.maxPlatforms !== -1 && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    platformsQuota.percentage,
                    platformsQuota.warning
                  )}`}
                  style={{ width: `${Math.min(platformsQuota.percentage, 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Upgrade CTA if at risk */}
      {(postsQuota.warning || clientsQuota.warning) && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-900 font-medium">
            💡 זמן לשדרג?
          </p>
          <p className="text-xs text-blue-700 mt-1">
            שדרג את התוכנית שלך כדי לקבל יותר מכסות ותכונות מתקדמות
          </p>
          <button className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium">
            צפה בתוכניות ←
          </button>
        </div>
      )}
    </div>
  );
}
