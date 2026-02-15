import React from 'react';

import { Skeleton } from './Skeleton';

export function SkeletonChart({ variant = 'bar', height = 320 }: { variant?: 'bar' | 'line'; height?: number }) {
  return (
    <div className="w-full" style={{ height }}>
      <div className="relative w-full h-full bg-white rounded-[48px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 p-8">
          <div className="flex items-center justify-between mb-10">
            <div className="space-y-2">
              <Skeleton className="h-6 w-44 rounded-2xl" />
              <Skeleton className="h-4 w-64 rounded-xl" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-24 rounded-2xl" />
              <Skeleton className="h-9 w-24 rounded-2xl" />
            </div>
          </div>

          <div className="relative w-full h-[calc(100%-72px)]">
            <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between">
              <Skeleton className="h-3 w-8 rounded-lg" />
              <Skeleton className="h-3 w-8 rounded-lg" />
              <Skeleton className="h-3 w-8 rounded-lg" />
              <Skeleton className="h-3 w-8 rounded-lg" />
            </div>

            <div className="absolute right-0 left-14 top-0 bottom-10">
              <div className="absolute inset-0 grid grid-rows-4 gap-6 opacity-60">
                <div className="border-t border-slate-100" />
                <div className="border-t border-slate-100" />
                <div className="border-t border-slate-100" />
                <div className="border-t border-slate-100" />
              </div>

              {variant === 'bar' ? (
                <div className="absolute inset-0 flex items-end gap-3">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton
                      key={i}
                      className="flex-1 rounded-t-2xl"
                      style={{ height: `${20 + ((i * 7) % 70)}%` } as React.CSSProperties}
                    />
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0">
                  <div className="absolute inset-x-0 top-[20%]">
                    <Skeleton className="h-2 w-[92%] rounded-full" />
                  </div>
                  <div className="absolute inset-x-0 top-[45%]">
                    <Skeleton className="h-2 w-[82%] rounded-full" />
                  </div>
                  <div className="absolute inset-x-0 top-[65%]">
                    <Skeleton className="h-2 w-[90%] rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="absolute right-0 left-14 bottom-0 h-10 flex items-end justify-between gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-10 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
