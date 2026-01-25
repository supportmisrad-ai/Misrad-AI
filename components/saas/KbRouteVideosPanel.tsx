'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Save, Trash2, Video, X, Eye } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Button } from '@/components/ui/button';

type KbRouteVideo = {
  id: string;
  routePrefix: string;
  title: string;
  videoUrl: string;
  isActive: boolean;
  order: number;
};

const STORAGE_KEY = 'kb_route_videos';

function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function newId() {
  return `kb-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const KbRouteVideosPanel: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
  const { addToast, updateSettings } = useData();

  const [items, setItems] = useState<KbRouteVideo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = safeParseJson<KbRouteVideo[]>(saved, []);
      if (parsed.length) {
        return parsed
          .map((i, idx) => ({
            id: String(i?.id || newId()),
            routePrefix: String(i?.routePrefix || '/'),
            title: String(i?.title || 'עזרה בסרטון'),
            videoUrl: String(i?.videoUrl || ''),
            isActive: Boolean((i as any)?.isActive ?? true),
            order: Number((i as any)?.order ?? idx),
          }))
          .sort((a, b) => a.order - b.order);
      }
    }

    return [
      {
        id: newId(),
        routePrefix: '/nexus',
        title: 'נקסוס: ניווט וזרימת עבודה',
        videoUrl: 'https://example.com/nexus-intro.mp4',
        isActive: false,
        order: 0,
      },
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<KbRouteVideo>>({
    routePrefix: '/system',
    title: 'עזרה בסרטון',
    videoUrl: '',
    isActive: true,
    order: items.length,
  });

  const [previewItem, setPreviewItem] = useState<KbRouteVideo | null>(null);

  const sorted = useMemo(() => [...items].sort((a, b) => a.order - b.order), [items]);

  const persist = (next: KbRouteVideo[]) => {
    const normalized = [...next]
      .map((i, idx) => ({ ...i, order: Number.isFinite(i.order) ? i.order : idx }))
      .sort((a, b) => a.order - b.order)
      .map((i, idx) => ({ ...i, order: idx }));

    setItems(normalized);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }

    updateSettings('kbRouteVideos', normalized);
    addToast('Knowledge Base עודכן בהצלחה', 'success');
  };

  const addItem = () => {
    const routePrefix = String(draft.routePrefix || '').trim() || '/';
    const title = String(draft.title || '').trim() || 'עזרה בסרטון';
    const videoUrl = String(draft.videoUrl || '').trim();

    if (!videoUrl) {
      addToast('חסר קישור לסרטון', 'error');
      return;
    }

    const next: KbRouteVideo = {
      id: newId(),
      routePrefix,
      title,
      videoUrl,
      isActive: Boolean(draft.isActive ?? true),
      order: items.length,
    };

    persist([...items, next]);
    setIsAdding(false);
    setDraft({ routePrefix: '/system', title: 'עזרה בסרטון', videoUrl: '', isActive: true, order: items.length + 1 });
  };

  const updateItem = (id: string, patch: Partial<KbRouteVideo>) => {
    const next = items.map((i) => (i.id === id ? { ...i, ...patch } : i));
    persist(next);
  };

  const removeItem = (id: string) => {
    persist(items.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        {!hideHeader ? (
          <div>
            <div className="text-lg font-black text-slate-900">Knowledge Base · מיפוי Route → סרטון</div>
            <div className="mt-1 text-xs font-bold text-slate-600">
              טיפ: הגדירו <span className="font-mono">routePrefix</span> כמו <span className="font-mono">/w/&lt;org&gt;/system</span> לא נתמך כאן — המערכת מסירה אוטומטית את <span className="font-mono">/w/&lt;org&gt;</span> ומתחילה מ־<span className="font-mono">/system</span> וכו׳.
            </div>
          </div>
        ) : null}
        <Button type="button" onClick={() => setIsAdding(true)}>
          <Plus size={16} />
          הוסף
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-black text-slate-900">אין עדיין מיפויים</div>
            <div className="mt-1 text-xs font-bold text-slate-600">תוסיף אחד, ואז הכפתור "עזרה" יתחיל לעבוד לפי Route.</div>
          </div>
        ) : (
          sorted.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Prefix</div>
                    <input
                      value={item.routePrefix}
                      onChange={(e) => updateItem(item.id, { routePrefix: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כותרת</div>
                    <input
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video URL</div>
                    <input
                      value={item.videoUrl}
                      onChange={(e) => updateItem(item.id, { videoUrl: e.target.value })}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => updateItem(item.id, { isActive: !item.isActive })}
                    className={`rounded-xl px-3 py-2 text-xs font-black border transition-colors ${item.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {item.isActive ? 'פעיל' : 'כבוי'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewItem(item)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    <Eye size={14} />
                    תצוגה
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={14} />
                    מחיקה
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {isAdding ? (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsAdding(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white w-full max-w-xl rounded-[28px] shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 h-10 w-10"
                onClick={() => setIsAdding(false)}
              >
                <X size={20} />
              </Button>

              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">הוספת מיפוי</div>
                  <div className="text-xs font-bold text-slate-600">Route prefix → סרטון</div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Prefix</div>
                  <input
                    value={String(draft.routePrefix || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, routePrefix: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="/system/leads"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כותרת</div>
                  <input
                    value={String(draft.title || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="איך עובדים עם לידים"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video URL</div>
                  <input
                    value={String(draft.videoUrl || '')}
                    onChange={(e) => setDraft((p) => ({ ...p, videoUrl: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="https://www.youtube.com/embed/... או https://.../video.mp4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft((p) => ({ ...p, isActive: !Boolean(p.isActive ?? true) }))}
                    className={`rounded-xl px-4 py-2 text-xs font-black border transition-colors ${Boolean(draft.isActive ?? true) ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                  >
                    {Boolean(draft.isActive ?? true) ? 'פעיל' : 'כבוי'}
                  </Button>

                  <Button type="button" onClick={addItem} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-black">
                    <Save size={16} />
                    שמור
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {previewItem ? (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setPreviewItem(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              className="bg-white w-full max-w-3xl rounded-[28px] shadow-2xl overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-4 left-4 h-10 w-10"
                onClick={() => setPreviewItem(null)}
              >
                <X size={20} />
              </Button>

              <div className="p-6 border-b border-slate-100">
                <div className="text-lg font-black text-slate-900">{previewItem.title}</div>
                <div className="mt-1 text-xs font-bold text-slate-600">Prefix: {previewItem.routePrefix}</div>
              </div>

              <div className="p-6">
                {String(previewItem.videoUrl || '').toLowerCase().endsWith('.mp4') ? (
                  <video className="w-full rounded-2xl bg-slate-950" controls preload="metadata" src={previewItem.videoUrl} />
                ) : (
                  <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950" style={{ paddingTop: '56.25%' }}>
                    <iframe
                      src={previewItem.videoUrl}
                      title={previewItem.title}
                      className="absolute inset-0 h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};
