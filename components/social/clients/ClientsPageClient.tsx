'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/contexts/AppContext';
import ClientsHeaderActions from '@/components/social/clients/ClientsHeaderActions';
import { joinPath } from '@/lib/os/social-routing';

export default function ClientsPageClient({ orgSlug }: { orgSlug: string }) {
  const basePath = `/w/${orgSlug}/social`;
  const { clients } = useApp();

  const [visibleCount, setVisibleCount] = useState(60);

  const list = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);
  const visible = useMemo(() => list.slice(0, visibleCount), [list, visibleCount]);

  return (
    <div className="flex flex-col gap-10 p-4 w-full max-w-7xl mx-auto">
      <ClientsHeaderActions />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {visible.map((client: any) => {
          const href = joinPath(
            basePath,
            `/workspace?clientId=${encodeURIComponent(String(client.id))}${client.onboardingStatus === 'invited' ? '&onboarding=1' : ''}`
          );

          return (
            <Link
              key={String(client.id)}
              href={href}
              className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-2xl transition-all flex flex-col items-center gap-6 group relative"
            >
              {client.avatar ? (
                <img
                  src={String(client.avatar)}
                  className="w-24 h-24 rounded-[32px] shadow-lg group-hover:scale-110 transition-transform"
                  alt={String(client.companyName || '')}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-24 h-24 bg-slate-100 rounded-[32px] flex items-center justify-center text-slate-300 font-black text-2xl group-hover:scale-110 transition-transform">
                  ?
                </div>
              )}
              <div className="flex flex-col items-center">
                <h3 className="text-2xl font-black text-slate-800">{String(client.companyName || '')}</h3>
                {client.onboardingStatus === 'invited' && (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg mt-2 animate-pulse">ממתין להקמה</span>
                )}
              </div>
              <span className="text-xs font-black text-slate-900 bg-slate-50 px-6 py-2 rounded-xl">
                {String(client.postingRhythm || '')}
              </span>
            </Link>
          );
        })}
      </div>

      {visibleCount < list.length && (
        <div className="flex justify-center pt-2">
          <button
            onClick={() => setVisibleCount((v) => v + 60)}
            className="bg-white px-8 py-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all font-black text-slate-700"
          >
            טען עוד
          </button>
        </div>
      )}
    </div>
  );
}
