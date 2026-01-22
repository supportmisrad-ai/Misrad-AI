'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import ClientsHeaderActions from '@/components/social/clients/ClientsHeaderActions';
import { Avatar } from '@/components/Avatar';
import { joinPath } from '@/lib/os/social-routing';

export default function ClientsPageClient({ orgSlug }: { orgSlug: string }) {
  const basePath = `/w/${orgSlug}/social`;
  const { clients } = useApp();

  const [visibleCount, setVisibleCount] = useState(60);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro' | 'agency' | 'custom'>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<'all' | 'invited' | 'completed'>('all');
  const [sort, setSort] = useState<'name_asc' | 'name_desc'>('name_asc');

  const list = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    const base = list.filter((c: any) => {
      const company = String(c.companyName || '').toLowerCase();
      const email = String(c.email || '').toLowerCase();
      const name = String(c.name || '').toLowerCase();

      if (q) {
        const match = company.includes(q) || email.includes(q) || name.includes(q);
        if (!match) return false;
      }

      if (planFilter !== 'all') {
        const plan = String(c.plan || '').toLowerCase();
        if (plan !== planFilter) return false;
      }

      if (onboardingFilter !== 'all') {
        const status = String(c.onboardingStatus || '').toLowerCase();
        if (status !== onboardingFilter) return false;
      }

      return true;
    });

    return base.sort((a: any, b: any) => {
      const an = String(a.companyName || a.name || '').trim();
      const bn = String(b.companyName || b.name || '').trim();
      const cmp = an.localeCompare(bn, 'he', { sensitivity: 'base' });
      return sort === 'name_desc' ? -cmp : cmp;
    });
  }, [list, onboardingFilter, planFilter, query, sort]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  return (
    <div className="flex flex-col gap-10 p-4 w-full max-w-7xl mx-auto">
      <ClientsHeaderActions />

      <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[40px] shadow-[0_12px_50px_rgba(0,0,0,0.06)] p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setVisibleCount(60);
              }}
              placeholder="חיפוש לפי שם / אימייל..."
              className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-4 py-3 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <SlidersHorizontal size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={planFilter}
                onChange={(e) => {
                  setPlanFilter(e.target.value as any);
                  setVisibleCount(60);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pr-10 pl-10 py-3 font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              >
                <option value="all">כל החבילות</option>
                <option value="starter">Starter</option>
                <option value="pro">Professional</option>
                <option value="agency">Agency</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div className="relative">
              <SlidersHorizontal size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={onboardingFilter}
                onChange={(e) => {
                  setOnboardingFilter(e.target.value as any);
                  setVisibleCount(60);
                }}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pr-10 pl-10 py-3 font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              >
                <option value="all">כל הסטטוסים</option>
                <option value="invited">ממתין להקמה</option>
                <option value="completed">הושלם</option>
              </select>
            </div>

            <div className="relative">
              <ArrowUpDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="appearance-none bg-white border border-slate-200 rounded-2xl pr-10 pl-10 py-3 font-black text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
              >
                <option value="name_asc">שם (א-ת)</option>
                <option value="name_desc">שם (ת-א)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>נמצאו {filtered.length} לקוחות</div>
          {query || planFilter !== 'all' || onboardingFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setPlanFilter('all');
                setOnboardingFilter('all');
                setSort('name_asc');
                setVisibleCount(60);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all"
            >
              נקה סינון
            </button>
          ) : (
            <span />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {visible.map((client: any) => {
          const href = joinPath(
            basePath,
            `/workspace?clientId=${encodeURIComponent(String(client.id))}&clientName=${encodeURIComponent(String(client.companyName || ''))}${client.onboardingStatus === 'invited' ? '&onboarding=1' : ''}`
          );

          return (
            <Link
              key={String(client.id)}
              href={href}
              className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm cursor-pointer hover:shadow-2xl transition-all flex flex-col items-center gap-6 group relative"
            >
              <Avatar
                src={String(client.avatar || '')}
                name={String(client.companyName || client.name || '')}
                alt={String(client.companyName || '')}
                size="xl"
                className="w-24 h-24 rounded-[32px] shadow-lg group-hover:scale-110 transition-transform"
              />
              <div className="flex flex-col items-center">
                <h3 className="text-2xl font-black text-slate-800">{String(client.companyName || '')}</h3>
                {client.onboardingStatus === 'invited' && (
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg mt-2">ממתין להקמה</span>
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
