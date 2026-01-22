import React from 'react';

import { Skeleton } from './Skeleton';

export function SkeletonForm({ fields = 6, columns = 1 }: { fields?: number; columns?: 1 | 2 }) {
  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <div className="space-y-6">
      <div className={["grid gap-4", gridCols].join(' ')}>
        {Array.from({ length: Math.max(0, fields) }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24 rounded-lg" />
            <Skeleton className="h-11 w-full rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-32 rounded-2xl" />
        <Skeleton className="h-11 w-24 rounded-2xl" />
      </div>
    </div>
  );
}
