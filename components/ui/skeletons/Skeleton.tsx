import React from 'react';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={["animate-pulse rounded-xl bg-slate-200/60", className].filter(Boolean).join(' ')}
    />
  );
}
