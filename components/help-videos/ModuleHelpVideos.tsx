'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Video, X, ExternalLink } from 'lucide-react';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { getHelpVideosByModule, type HelpVideo } from '@/app/actions/help-videos';

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

export function ModuleHelpVideos(props: { moduleKey: OSModuleKey }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HelpVideo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getHelpVideosByModule(props.moduleKey);
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
        setActiveId(res.data[0]?.id || null);
      } else {
        setItems([]);
        setActiveId(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, props.moduleKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onOpen = () => {
      setIsOpen(true);
    };

    const listener = onOpen as unknown as EventListener;
    window.addEventListener('os:open-help-videos', listener);
    return () => window.removeEventListener('os:open-help-videos', listener);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    const options: AddEventListenerOptions = { capture: true };
    document.addEventListener('keydown', onKeyDown, options);
    return () => document.removeEventListener('keydown', onKeyDown, options);
  }, [isOpen]);

  const active = useMemo(() => items.find((v) => v.id === activeId) || null, [activeId, items]);

  const modal = (
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
            className="bg-white w-full max-w-4xl rounded-[28px] shadow-2xl overflow-hidden relative max-h-[85vh] flex flex-col"
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

            <div className="p-6 border-b border-slate-100 shrink-0">
              <div className="text-lg font-black text-slate-900">הדרכה</div>
              <div className="mt-1 text-xs font-bold text-slate-600">בחר סרטון, צפה, וחזור לעבוד.</div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto min-h-0">
              <div className="lg:col-span-1">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">סרטונים</div>
                <div className="mt-3 space-y-2">
                  {loading ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-600">טוען...</div>
                  ) : items.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-black text-slate-900">אין עדיין סרטונים למודול הזה</div>
                      <div className="mt-1 text-xs font-bold text-slate-600">אפשר להוסיף ב-Admin → גלובלי → ניהול סרטוני הדרכה.</div>
                    </div>
                  ) : (
                    items.map((v) => {
                      const activeRow = v.id === activeId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setActiveId(v.id)}
                          className={`w-full text-right rounded-2xl border px-4 py-3 transition-colors ${
                            activeRow ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-sm font-black truncate">{v.title}</div>
                          <div className="mt-1 text-[11px] font-bold opacity-70">#{v.order}</div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="text-xs font-black text-slate-500 uppercase tracking-wider">צפייה</div>
                <div className="mt-3">
                  {active?.videoUrl ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-black text-slate-900 truncate">{active.title}</div>
                        <a
                          href={active.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink size={14} />
                          פתח בטאב
                        </a>
                      </div>

                      {isDirectVideo(active.videoUrl) ? (
                        <video className="w-full rounded-2xl bg-slate-950" controls preload="metadata" src={active.videoUrl} />
                      ) : (
                        <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950" style={{ paddingTop: '56.25%' }}>
                          <iframe
                            src={normalizeVideoUrl(active.videoUrl)}
                            title={active.title}
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
                      <div className="text-sm font-black text-slate-900">בחר סרטון מהרשימה</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 inline-flex items-center justify-center rounded-full hover:bg-[color:var(--os-header-action-hover,rgba(255,255,255,0.50))] text-[color:var(--os-header-action-icon,#4b5563)] transition-colors"
        title="הדרכה"
        aria-label="הדרכה"
      >
        <Video size={18} />
      </button>

      {mounted && typeof document !== 'undefined' ? createPortal(modal, document.body) : null}
    </>
  );
}
