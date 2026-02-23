'use client';

import React from 'react';

export default function PremiumFrame({
  moduleLabel,
  title,
  subtitle,
  avatarUrl,
  actions,
  children,
}: {
  moduleLabel?: string | null;
  title: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto w-full pb-16 md:pb-20 px-4 md:px-0">
      <div className="bg-white rounded-[2.5rem] border border-gray-200/60 shadow-xl shadow-gray-200/40 relative overflow-visible">
        <div className="h-56 w-full rounded-t-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/50 to-transparent pointer-events-none" />
          {moduleLabel ? (
            <div className="absolute top-6 left-6">
              <div className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                {moduleLabel}
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-8 pb-8">
          <div className="flex flex-col md:flex-row items-start justify-between relative">
            <div className="-mt-20 relative z-10">
              <div className="w-40 h-40 rounded-[2rem] border-[6px] border-white shadow-2xl bg-white p-1 overflow-hidden relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={title} className="w-full h-full rounded-[1.7rem] object-cover" />
                ) : (
                  <div className="w-full h-full rounded-[1.7rem] flex items-center justify-center text-slate-700 font-black text-3xl bg-slate-50">
                    {(title || 'U').charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-4 md:mt-4 md:mb-0 w-full md:w-auto justify-end relative z-50">
              {actions}
            </div>
          </div>

          <div className="mt-4 text-right">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight" suppressHydrationWarning>
              {title}
            </h1>
            {subtitle ? (
              <div className="text-gray-500 font-medium text-base mt-2" suppressHydrationWarning>
                {subtitle}
              </div>
            ) : null}
          </div>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
