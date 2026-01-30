'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';

type ModuleCard = {
  moduleKey: OSModuleKey;
  title: string;
  titleHe: string;
  accent: string;
  categories: Array<{ id: string; title: string }>;
  href: string;
};

type SearchArticle = {
  id: string;
  title: string;
  description: string;
  moduleKey: OSModuleKey;
  categoryId: string;
  tags: string[];
  href: string;
  moduleTitleHe: string;
  categoryTitle?: string;
};

export function SupportHomeClient(props: {
  orgSlug: string;
  modules: ModuleCard[];
  articles: SearchArticle[];
}) {
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalized) return [];
    const tokens = normalized.split(/\s+/).filter(Boolean);
    const scored = props.articles
      .map((a) => {
        const hay = `${a.title} ${a.description} ${a.moduleTitleHe} ${(a.categoryTitle || '')} ${a.tags.join(' ')}`.toLowerCase();
        const score = tokens.reduce((acc, t) => (hay.includes(t) ? acc + 1 : acc), 0);
        return { a, score };
      })
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score);

    return scored.slice(0, 12).map((x) => x.a);
  }, [normalized, props.articles]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6 md:p-8">
          <div className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">איך אפשר לעזור?</div>
          <div className="mt-2 text-sm md:text-base font-bold text-slate-600">חפש מאמר, או היכנס למודול כדי להתחיל.</div>

          <div className="mt-6">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400">
                <Search size={18} />
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="חיפוש (לדוגמה: חשבונית, Dispatch, נוכחות...)"
                className="w-full h-14 md:h-16 rounded-3xl border border-slate-200 bg-white px-12 md:px-14 text-base md:text-lg font-bold outline-none focus:ring-4 ring-slate-100"
              />
            </div>

            {normalized ? (
              <div className="mt-4">
                {results.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {results.map((r) => (
                      <Link
                        key={`${r.moduleKey}/${r.id}`}
                        href={r.href}
                        className="group rounded-2xl border border-slate-200 bg-white px-4 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900 truncate">{r.title}</div>
                            <div className="mt-1 text-xs font-bold text-slate-600 line-clamp-2">{r.description}</div>
                            <div className="mt-2 text-[11px] font-black text-slate-500">
                              {r.moduleTitleHe}
                              {r.categoryTitle ? <span className="text-slate-300"> · </span> : null}
                              {r.categoryTitle ? r.categoryTitle : null}
                            </div>
                          </div>
                          <div className="shrink-0 text-slate-400 group-hover:text-slate-600 transition-colors">
                            <ArrowRight size={16} />
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">
                    לא נמצאו תוצאות.
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <div className="text-sm font-black text-slate-900">מודולים</div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {props.modules.map((m) => (
              <Link
                key={m.moduleKey}
                href={m.href}
                className="group rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-5 hover:bg-white transition-colors"
              >
                <div className="h-1.5 w-full rounded-full" style={{ background: `linear-gradient(90deg, ${m.accent}, rgba(15,23,42,0.08))` }} />
                <div className="mt-4">
                  <div className="text-lg font-black text-slate-900">{m.title}</div>
                  <div className="text-sm font-bold text-slate-600 mt-1">{m.titleHe}</div>
                </div>

                {m.categories.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {m.categories.slice(0, 3).map((c) => (
                      <span key={c.id} className="text-[11px] font-black text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        {c.title}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-xs font-bold text-slate-500">בקרוב: קטגוריות ומאמרים</div>
                )}

                <div className="mt-4 text-xs font-bold text-slate-500 group-hover:text-slate-600">פתח תיעוד</div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
