import React from 'react';

import { Skeleton } from './Skeleton';

export function SkeletonTable({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  const safeCols = Math.max(1, Math.min(12, columns));
  const gridStyle = { gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` } as const;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <div className="grid gap-3" style={gridStyle}>
          {Array.from({ length: safeCols }).map((_, i) => (
            <Skeleton key={i} className="h-4 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: Math.max(0, rows) }).map((_, r) => (
          <div key={r} className="grid gap-3 items-center" style={gridStyle}>
            {Array.from({ length: safeCols }).map((_, c) => (
              <Skeleton key={c} className="h-5 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
