'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, Search, SlidersHorizontal } from 'lucide-react';
import { CustomSelect } from '@/components/CustomSelect';
import { useApp } from '@/contexts/AppContext';
import ClientsHeaderActions from '@/components/social/clients/ClientsHeaderActions';
import { Avatar } from '@/components/Avatar';
import { joinPath } from '@/lib/os/social-routing';
import { getClientsPage } from '@/app/actions/clients';
import type { Client } from '@/types/social';

export default function ClientsPageClient({ orgSlug }: { orgSlug: string }) {
  const basePath = `/w/${orgSlug}/social`;
  const { addToast, clients: contextClients } = useApp();

  const [clients, setClients] = useState<Client[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro' | 'agency' | 'custom'>('all');
  const [onboardingFilter, setOnboardingFilter] = useState<'all' | 'invited' | 'completed'>('all');
  const [sort, setSort] = useState<'name_asc' | 'name_desc'>('name_asc');

  const list = useMemo(() => (Array.isArray(clients) ? clients : []), [clients]);

  useEffect(() => {
    const incoming = Array.isArray(contextClients) ? contextClients : [];
    if (incoming.length === 0) return;

    setClients((prev) => {
      const base = Array.isArray(prev) ? prev : [];
      const byId = new Map<string, any>();
      for (const c of base) byId.set(String(c?.id), c);
      for (const c of incoming) byId.set(String(c?.id), c);
      return Array.from(byId.values());
    });
  }, [contextClients]);

  useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setClients([]);
        const res = await getClientsPage({
          orgSlug,
          cursor: null,
          pageSize: 60,
          query: query.trim() || undefined,
          plan: planFilter === 'all' ? undefined : planFilter,
          onboardingStatus: onboardingFilter === 'all' ? undefined : onboardingFilter,
        });

        if (!res.success) {
          setClients([]);
          setNextCursor(null);
          setHasMore(false);
          addToast(res.error || 'שגיאה בטעינת לקוחות', 'error');
          return;
        }

        setClients(res.data.clients);
        setNextCursor(res.data.nextCursor);
        setHasMore(Boolean(res.data.hasMore));
      } catch (e: unknown) {
        setClients([]);
        setNextCursor(null);
        setHasMore(false);
        const msg = e instanceof Error ? e.message : 'שגיאה בטעינת לקוחות';
        addToast(msg, 'error');
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [addToast, onboardingFilter, orgSlug, planFilter, query]);

  const filtered = useMemo(() => {
    const base = list;

    return base.sort((a, b) => {
      const an = String(a.companyName || a.name || '').trim();
      const bn = String(b.companyName || b.name || '').trim();
      const cmp = an.localeCompare(bn, 'he', { sensitivity: 'base' });
      return sort === 'name_desc' ? -cmp : cmp;
    });
  }, [list, sort]);

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
              }}
              placeholder="חיפוש לפי שם / אימייל..."
              className="w-full bg-white border border-slate-200 rounded-2xl pr-12 pl-4 py-3 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-300 transition-all"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <CustomSelect
              value={planFilter}
              onChange={(val) => setPlanFilter(val as typeof planFilter)}
              icon={<SlidersHorizontal size={16} />}
              options={[
                { value: 'all', label: 'כל החבילות' },
                { value: 'starter', label: 'Starter' },
                { value: 'pro', label: 'Professional' },
                { value: 'agency', label: 'Agency' },
                { value: 'custom', label: 'Custom' },
              ]}
            />

            <CustomSelect
              value={onboardingFilter}
              onChange={(val) => setOnboardingFilter(val as typeof onboardingFilter)}
              icon={<SlidersHorizontal size={16} />}
              options={[
                { value: 'all', label: 'כל הסטטוסים' },
                { value: 'invited', label: 'ממתין להקמה' },
                { value: 'completed', label: 'הושלם' },
              ]}
            />

            <CustomSelect
              value={sort}
              onChange={(val) => setSort(val as typeof sort)}
              icon={<ArrowUpDown size={16} />}
              options={[
                { value: 'name_asc', label: 'שם (א-ת)' },
                { value: 'name_desc', label: 'שם (ת-א)' },
              ]}
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
          <div>{isLoading ? 'טוען...' : `נטענו ${filtered.length} לקוחות`}</div>
          {query || planFilter !== 'all' || onboardingFilter !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setPlanFilter('all');
                setOnboardingFilter('all');
                setSort('name_asc');
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
        {filtered.map((client) => {
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

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            onClick={async () => {
              try {
                if (isLoading) return;
                setIsLoading(true);
                const res = await getClientsPage({
                  orgSlug,
                  cursor: nextCursor,
                  pageSize: 60,
                  query: query.trim() || undefined,
                  plan: planFilter === 'all' ? undefined : planFilter,
                  onboardingStatus: onboardingFilter === 'all' ? undefined : onboardingFilter,
                });

                if (!res.success) {
                  addToast(res.error || 'שגיאה בטעינת לקוחות', 'error');
                  return;
                }

                setClients((prev) => {
                  const base = Array.isArray(prev) ? prev : [];
                  const incoming = Array.isArray(res.data.clients) ? res.data.clients : [];
                  const byId = new Map<string, Client>();
                  for (const c of base) byId.set(String(c?.id), c);
                  for (const c of incoming) byId.set(String(c?.id), c);
                  return Array.from(byId.values());
                });

                setNextCursor(res.data.nextCursor);
                setHasMore(Boolean(res.data.hasMore));
              } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'שגיאה בטעינת לקוחות';
                addToast(msg, 'error');
              } finally {
                setIsLoading(false);
              }
            }}
            disabled={isLoading}
            className="bg-white px-8 py-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all font-black text-slate-700 disabled:opacity-60"
          >
            {isLoading ? 'טוען...' : 'טען עוד'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
