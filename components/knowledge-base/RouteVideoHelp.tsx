'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, X } from 'lucide-react';

import type { OSModuleKey } from '@/lib/os/modules/types';
import { getHelpVideoByRoute, type HelpVideo } from '@/app/actions/help-videos';

function normalizeRoute(pathname: string): string {
  const path = String(pathname || '/');
  const match = path.match(/^\/w\/[^/]+(\/.*)?$/);
  if (match) return match[1] || '/';
  return path || '/';
}

function inferModuleKeyFromPathname(pathname: string): OSModuleKey | null {
  const normalized = normalizeRoute(pathname);
  const first = normalized.split('/').filter(Boolean)[0] || '';
  if (
    first === 'nexus' ||
    first === 'system' ||
    first === 'social' ||
    first === 'finance' ||
    first === 'client' ||
    first === 'operations'
  ) {
    return first as OSModuleKey;
  }
  return null;
}

function isDirectVideo(url: string): boolean {
  const u = String(url || '').toLowerCase();
  return u.endsWith('.mp4') || u.endsWith('.webm') || u.endsWith('.ogg');
}

export function RouteVideoHelp() {
  const pathname = usePathname() || '/';
  const [isOpen, setIsOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [match, setMatch] = useState<HelpVideo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const normalizedPath = useMemo(() => normalizeRoute(pathname), [pathname]);
  const moduleKey = useMemo(() => inferModuleKeyFromPathname(pathname), [pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await getHelpVideoByRoute({
          pathname,
          ...(moduleKey ? { moduleKey } : {}),
        });
        if (!res.success) {
          setMatch(null);
          setLoadError(res.error || 'שגיאה בטעינת סרטון');
          return;
        }
        setMatch((res.data as any) || null);
      } catch (e: any) {
        setMatch(null);
        setLoadError(e?.message || 'שגיאה בטעינת סרטון');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, moduleKey, pathname]);

  const videoTitle = match?.title ? String(match.title) : 'עזרה בסרטון';
  const videoUrl = match?.videoUrl ? String(match.videoUrl) : '';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-[450] flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl hover:bg-slate-800 transition-colors"
        aria-label="עזרה בסרטון"
      >
        <Video size={18} />
        <span className="text-sm font-black">עזרה</span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <div
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setIsOpen(false)}
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-900 transition-colors"
                aria-label="סגירה"
              >
                <X size={20} />
              </button>

              <div className="p-6 border-b border-slate-100">
                <div className="text-lg font-black text-slate-900">{videoTitle}</div>
                <div className="mt-1 text-xs font-bold text-slate-500">דף נוכחי: {normalizedPath}</div>
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">טוען סרטון...</div>
                  </div>
                ) : loadError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
                    <div className="text-sm font-black text-rose-800">שגיאה בטעינת סרטון</div>
                    <div className="mt-2 text-xs font-bold text-rose-700">{loadError}</div>
                  </div>
                ) : videoUrl ? (
                  <div className="w-full">
                    {isDirectVideo(videoUrl) ? (
                      <video className="w-full rounded-2xl bg-slate-950" controls preload="metadata" src={videoUrl} />
                    ) : (
                      <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={videoUrl}
                          title={videoTitle}
                          className="absolute inset-0 h-full w-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          referrerPolicy="strict-origin-when-cross-origin"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="text-sm font-black text-slate-900">אין סרטון שמוגדר לדף הזה</div>
                    <div className="mt-2 text-xs font-bold text-slate-600">אפשר להוסיף מיפוי ב־Admin → גלובלי → ניהול סרטוני הדרכה.</div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
