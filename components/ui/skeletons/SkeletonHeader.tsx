import React from 'react';

import { Skeleton } from './Skeleton';

export function SkeletonHeader({ showSubtitle = true, actions = 2 }: { showSubtitle?: boolean; actions?: number }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4" dir="rtl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 rounded-2xl" />
        {showSubtitle ? <Skeleton className="h-4 w-64 rounded-xl" /> : null}
      </div>
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.max(0, actions) }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
