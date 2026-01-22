import React from 'react';

export function Skeleton({ className }: { className?: string }) {
  return <div className={["animate-pulse rounded-xl bg-slate-200/60", className].filter(Boolean).join(' ')} />;
}
