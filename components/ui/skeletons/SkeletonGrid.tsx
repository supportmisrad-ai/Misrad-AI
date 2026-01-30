import React from 'react';

import { Skeleton } from './Skeleton';

export function SkeletonGrid({ cards = 6, columns = 3 }: { cards?: number; columns?: 1 | 2 | 3 | 4 }) {
  const cols = columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-2' : columns === 4 ? 'grid-cols-4' : 'grid-cols-3';

  return (
    <div className={["grid gap-4", cols].join(' ')}>
      {Array.from({ length: Math.max(0, cards) }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-3xl" />
      ))}
    </div>
  );
}
