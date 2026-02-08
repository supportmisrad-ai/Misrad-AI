import React from 'react';
import Link from 'next/link';
import { ArrowRight, AlertTriangle, Info } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';
import { getModuleDefinition, isOSModuleKey } from '@/lib/os/modules/registry';
import { requireWorkspaceAccessByOrgSlug } from '@/lib/server/workspace';
import { asObject } from '@/lib/shared/unknown';
import { getHelpVideoByRoute, getHelpVideosByModule } from '@/app/actions/help-videos';
import { getDocsArticle, getDocsCategory, getDocsCategoriesForModule, getDocsArticlesForModule } from '@/config/docs';
import { ArticleFeedbackClient } from '../../ArticleFeedbackClient';

export const dynamic = 'force-dynamic';

function isDirectVideo(url: string): boolean {
  const u = String(url || '').toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg');
}

function normalizeVideoUrl(url: string): string {
  const raw = String(url || '').trim();
  const u = raw.toLowerCase();

  try {
    if (u.includes('youtube.com/watch')) {
      const parsed = new URL(raw);
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (u.includes('youtu.be/')) {
      const parsed = new URL(raw);
      const id = parsed.pathname.replace('/', '').trim();
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (u.includes('vimeo.com/') && !u.includes('player.vimeo.com')) {
      const parsed = new URL(raw);
      const parts = parsed.pathname.split('/').filter(Boolean);
      const id = parts[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

function renderBlock(block: unknown) {
  const obj = asObject(block);
  if (!obj) return null;
  const type = typeof obj.type === 'string' ? obj.type : '';

  if (type === 'h2') {
    return <h2 className="text-xl md:text-2xl font-black text-slate-900 mt-8">{String(obj.text || '')}</h2>;
  }

  if (type === 'p') {
    return <p className="text-sm md:text-base font-bold text-slate-700 leading-relaxed mt-4">{String(obj.text || '')}</p>;
  }

  if (type === 'bullets') {
    const itemsRaw = obj.items;
    const items = Array.isArray(itemsRaw)
      ? itemsRaw.map((v) => String(v || '')).filter(Boolean)
      : [];
    return (
      <ul className="mt-4 space-y-2">
        {items.map((t, idx) => (
          <li key={idx} className="text-sm font-bold text-slate-700 leading-relaxed">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-300 ml-2" />
            {t}
          </li>
        ))}
      </ul>
    );
  }

  if (type === 'steps') {
    const itemsRaw = obj.items;
    const items: Array<{ title: string; body: string }> = Array.isArray(itemsRaw)
      ? itemsRaw
          .map((v) => {
            const stepObj = asObject(v);
            if (!stepObj) return null;
            const title = typeof stepObj.title === 'string' ? stepObj.title : String(stepObj.title || '');
            const body = typeof stepObj.body === 'string' ? stepObj.body : String(stepObj.body || '');
            return { title, body };
          })
          .filter((v): v is { title: string; body: string } => Boolean(v))
      : [];
    return (
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((s, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-5">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">צעד {idx + 1}</div>
            <div className="mt-2 text-sm font-black text-slate-900">{String(s.title || '')}</div>
            <div className="mt-2 text-sm font-bold text-slate-600 leading-relaxed">{String(s.body || '')}</div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'callout') {
    const variant = obj.variant === 'warning' ? 'warning' : 'tip';
    const Icon = variant === 'warning' ? AlertTriangle : Info;

    const styles =
      variant === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-blue-200 bg-blue-50 text-blue-900';

    return (
      <div className={`mt-5 rounded-3xl border p-5 ${styles}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/60 border border-white/60 flex items-center justify-center">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            {obj.title ? <div className="text-sm font-black">{String(obj.title)}</div> : null}
            <div className="mt-1 text-sm font-bold leading-relaxed">{String(obj.body || '')}</div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default async function WorkspaceSupportArticlePage({
  params,
}: {
  params:
    | Promise<{ orgSlug: string; module: string; articleId: string }>
    | { orgSlug: string; module: string; articleId: string };
}) {
  const resolvedParams = await params;
  const { orgSlug, module, articleId } = resolvedParams;

  await requireWorkspaceAccessByOrgSlug(orgSlug);

  if (!isOSModuleKey(module)) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
            <div className="text-lg font-black text-slate-900">מודול לא נמצא</div>
            <div className="mt-2 text-sm font-bold text-slate-600">בחר מודול חוקי מתוך הרשימה.</div>
            <div className="mt-5">
              <Link href={`/w/${encodeURIComponent(orgSlug)}/support`} className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black">
                חזרה לתמיכה
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const moduleKey = module as OSModuleKey;
  const def = getModuleDefinition(moduleKey);
  const accent = def.theme.accent || '#0F172A';

  const article = getDocsArticle(moduleKey, String(articleId));
  if (!article) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-6">
            <div className="text-lg font-black text-slate-900">מאמר לא נמצא</div>
            <div className="mt-2 text-sm font-bold text-slate-600">המאמר שביקשת לא קיים במרכז הידע.</div>
            <div className="mt-5 flex items-center gap-2">
              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-900 text-white font-black"
              >
                חזרה למודול
                <ArrowRight size={16} />
              </Link>
              <Link
                href={`/w/${encodeURIComponent(orgSlug)}/support`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black"
              >
                כל המודולים
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const category = getDocsCategory(moduleKey, article.categoryId);

  const pathname = `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}/${encodeURIComponent(article.id)}`;
  const byRoute = await getHelpVideoByRoute({ pathname, moduleKey });
  const routeVideo = byRoute.success ? byRoute.data : null;

  const byModule = await getHelpVideosByModule(moduleKey);
  const moduleVideos = byModule.success && Array.isArray(byModule.data) ? byModule.data : [];
  const video = routeVideo || (moduleVideos.length ? moduleVideos[0] : null);
  const videoUrl = video?.videoUrl ? String(video.videoUrl) : '';

  const categories = getDocsCategoriesForModule(moduleKey);
  const moduleArticles = getDocsArticlesForModule(moduleKey);

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-900" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="text-xs font-black text-slate-500">
          <Link href={`/w/${encodeURIComponent(orgSlug)}/support`} className="hover:text-slate-700 transition-colors">
            תמיכה
          </Link>
          <span className="mx-2 text-slate-300">&gt;</span>
          <Link
            href={`/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}`}
            className="hover:text-slate-700 transition-colors"
          >
            {def.labelHe}
          </Link>
          <span className="mx-2 text-slate-300">&gt;</span>
          <span className="text-slate-700">{article.title}</span>
        </div>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">{article.title}</h1>
            <p className="mt-2 text-sm md:text-base font-bold text-slate-600">{article.description}</p>
            <div className="mt-5 h-1.5 w-48 rounded-full" style={{ background: `linear-gradient(90deg, ${accent}, rgba(15,23,42,0.12))` }} />
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-5 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">ניווט</div>
                <div className="mt-1 text-xs font-bold text-slate-600">{def.labelHe}</div>
              </div>
              <div className="p-5 space-y-4">
                {category ? (
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קטגוריה</div>
                    <div className="mt-2 text-sm font-black text-slate-900">{category.title}</div>
                  </div>
                ) : null}

                {categories.length ? (
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קטגוריות</div>
                    <div className="mt-2 space-y-1">
                      {categories.map((c) => (
                        <div key={c.id} className="text-sm font-bold text-slate-700">{c.title}</div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {moduleArticles.length ? (
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מאמרים במודול</div>
                    <div className="mt-2 space-y-2">
                      {moduleArticles.slice(0, 8).map((a) => {
                        const href = `/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}/${encodeURIComponent(a.id)}`;
                        const active = a.id === article.id;
                        return (
                          <Link
                            key={a.id}
                            href={href}
                            className={`block rounded-2xl border px-3 py-2 text-sm font-black transition-colors ${
                              active ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                            }`}
                          >
                            {a.title}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <Link
              href={`/w/${encodeURIComponent(orgSlug)}/support/${encodeURIComponent(moduleKey)}`}
              className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-800 font-black hover:bg-slate-50 transition-colors"
            >
              חזרה למודול
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="lg:col-span-9 space-y-6">
            <div className="rounded-3xl border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_8px_40px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="p-6 border-b border-white/60">
                <div className="text-sm font-black text-slate-900">וידאו</div>
                <div className="mt-1 text-xs font-bold text-slate-600">{video?.title ? String(video.title) : 'וידאו למאמר'}</div>
              </div>
              <div className="p-6">
                {videoUrl ? (
                  isDirectVideo(videoUrl) ? (
                    <video className="w-full rounded-2xl bg-slate-950" controls preload="metadata" src={videoUrl} />
                  ) : (
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950" style={{ paddingTop: '56.25%' }}>
                      <iframe
                        src={normalizeVideoUrl(videoUrl)}
                        title={video?.title ? String(video.title) : article.title}
                        className="absolute inset-0 h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  )
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">אין עדיין סרטון</div>
                    <div className="mt-2 text-xs font-bold text-slate-600">אפשר להוסיף סרטון ולמפות עם route_prefix.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              {Array.isArray(article.content) ? article.content.map((b, idx) => <div key={idx}>{renderBlock(b)}</div>) : null}
            </div>

            <ArticleFeedbackClient />
          </div>
        </div>
      </div>
    </div>
  );
}
