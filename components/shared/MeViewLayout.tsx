'use client';

import React from 'react';
import { Crown, MapPin } from 'lucide-react';

export default function MeViewLayout({
  name,
  role,
  location,
  phone,
  bio,
  avatarUrl,
  isCrowned,
  actions,
  children,
}: {
  name: string;
  role?: string | null;
  location?: string | null;
  phone?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  isCrowned?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-5xl mx-auto w-full pb-16 md:pb-20 px-4 md:px-0">
      <div className="flex flex-col gap-4">
        <div className="bg-white rounded-[2.5rem] border border-gray-200/60 shadow-xl shadow-gray-200/40 relative overflow-visible">
          <div className="h-56 w-full rounded-t-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a]/50 to-transparent pointer-events-none" />
          </div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row items-start justify-between relative">
              <div className="-mt-20 relative z-10">
                <div className="w-40 h-40 rounded-[2rem] border-[6px] border-white shadow-2xl bg-white p-1 overflow-hidden relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full rounded-[1.7rem] object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-[1.7rem] flex items-center justify-center text-slate-700 font-black text-3xl bg-slate-50">
                      {(name || 'U').charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-4 md:mt-4 md:mb-0 w-full md:w-auto justify-end relative z-50">{actions}</div>
            </div>

            <div className="mt-4 text-right">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight tracking-tight" suppressHydrationWarning>
                  {name}
                </h1>
                {isCrowned ? <Crown size={24} className="text-yellow-500 fill-yellow-500" /> : null}
              </div>

              <div className="flex items-center gap-4 text-gray-500 font-medium text-base mb-6 flex-wrap">
                {role ? <span suppressHydrationWarning>{role}</span> : null}
                {role && (location || phone) ? <span className="w-1 h-1 bg-gray-300 rounded-full" /> : null}
                {location ? (
                  <span className="flex items-center gap-1 text-gray-500 text-sm" suppressHydrationWarning>
                    <MapPin size={14} /> {location}
                  </span>
                ) : null}
                {phone ? (
                  <>
                    {location ? <span className="w-1 h-1 bg-gray-300 rounded-full" /> : null}
                    <span className="flex items-center gap-1 text-gray-500 text-sm dir-ltr" suppressHydrationWarning>
                      {phone}
                    </span>
                  </>
                ) : null}
              </div>

              {bio ? (
                <p className="text-gray-600 text-sm max-w-2xl mb-6 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 inline-block text-right" suppressHydrationWarning>
                  {bio}
                </p>
              ) : null}
            </div>

            <div className="mt-2">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
