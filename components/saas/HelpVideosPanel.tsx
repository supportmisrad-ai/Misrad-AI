'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Save, Trash2, Video, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import type { OSModuleKey } from '@/lib/os/modules/types';
import {
  adminCreateHelpVideo,
  adminDeleteHelpVideo,
  adminListHelpVideos,
  adminUpdateHelpVideo,
  type HelpVideo,
} from '@/app/actions/help-videos';

const MODULES: Array<{ key: OSModuleKey; label: string }> = [
  { key: 'nexus', label: 'Nexus' },
  { key: 'system', label: 'System' },
  { key: 'operations', label: 'Operations' },
  { key: 'finance', label: 'Finance' },
  { key: 'social', label: 'Social' },
  { key: 'client', label: 'Client' },
];

export function HelpVideosPanel({ hideHeader }: { hideHeader?: boolean }) {
  const { addToast } = useData();

  const [moduleFilter, setModuleFilter] = useState<OSModuleKey | 'all'>('all');
  const [items, setItems] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState<{ moduleKey: OSModuleKey; title: string; videoUrl: string; order: number; duration: string }>({
    moduleKey: 'system',
    title: '',
    videoUrl: '',
    order: 0,
    duration: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminListHelpVideos(moduleFilter === 'all' ? undefined : { moduleKey: moduleFilter });
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת סרטונים', 'error');
        setItems([]);
        return;
      }
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בטעינת סרטונים', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter]);

  const sorted = useMemo(() => {
    return [...items]
      .sort((a, b) => {
        if (a.moduleKey !== b.moduleKey) return a.moduleKey.localeCompare(b.moduleKey);
        return a.order - b.order;
      })
      .map((i) => ({ ...i }));
  }, [items]);

  const addItem = async () => {
    const title = String(draft.title || '').trim();
    const videoUrl = String(draft.videoUrl || '').trim();
    const order = Number(draft.order);
    const duration = String(draft.duration || '').trim();

    if (!title || !videoUrl) {
      addToast('חסר כותרת או קישור לסרטון', 'error');
      return;
    }

    try {
      const res = await adminCreateHelpVideo({
        moduleKey: draft.moduleKey,
        title,
        videoUrl,
        order: Number.isFinite(order) ? order : 0,
        duration,
      });

      if (!res.success) {
        addToast(res.error || 'שגיאה ביצירת סרטון', 'error');
        return;
      }

      addToast('סרטון נוסף בהצלחה', 'success');
      setIsAdding(false);
      setDraft({ moduleKey: draft.moduleKey, title: '', videoUrl: '', order: 0, duration: '' });
      await load();
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה ביצירת סרטון', 'error');
    }
  };

  const updateItem = async (id: string, patch: { title?: string; videoUrl?: string; order?: number; duration?: string }) => {
    try {
      const res = await adminUpdateHelpVideo(id, patch);
      if (!res.success) {
        addToast(res.error || 'שגיאה בעדכון סרטון', 'error');
        return;
      }
      setItems((prev) => prev.map((p) => (p.id === id && res.data ? res.data : p)));
      addToast('עודכן', 'success');
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בעדכון סרטון', 'error');
    }
  };

  const removeItem = async (id: string) => {
    const ok = typeof window !== 'undefined' ? window.confirm('למחוק את הסרטון?') : true;
    if (!ok) return;

    try {
      const res = await adminDeleteHelpVideo(id);
      if (!res.success) {
        addToast(res.error || 'שגיאה במחיקת סרטון', 'error');
        return;
      }
      addToast('נמחק', 'success');
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה במחיקת סרטון', 'error');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {!hideHeader ? (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center">
              <Video size={18} />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900">ספריית סרטוני הדרכה</div>
              <div className="text-xs font-bold text-slate-600">ניהול לפי מודול + סדר הופעה</div>
            </div>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2 justify-end">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value as 'all' | OSModuleKey)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
          >
            <option value="all">כל המודולים</option>
            {MODULES.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </select>

          <Button type="button" onClick={() => load()} disabled={loading}>
            <RefreshCw size={16} />
            רענון
          </Button>

          <Button type="button" onClick={() => setIsAdding(true)}>
            <Plus size={16} />
            הוסף סרטון
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">טוען...</div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="text-sm font-black text-slate-900">אין עדיין סרטונים</div>
            <div className="mt-1 text-xs font-bold text-slate-600">תוסיף סרטון ראשון, ואז הכפתור "הדרכה" יתחיל לעבוד.</div>
          </div>
        ) : (
          sorted.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מודול</div>
                    <div className="mt-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                      {MODULES.find((m) => m.key === item.moduleKey)?.label || item.moduleKey}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כותרת</div>
                    <input
                      defaultValue={item.title}
                      onBlur={(e) => {
                        const next = String(e.target.value || '').trim();
                        if (next && next !== item.title) updateItem(item.id, { title: next });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סדר</div>
                    <input
                      type="number"
                      defaultValue={String(item.order)}
                      onBlur={(e) => {
                        const next = Number(e.target.value);
                        if (Number.isFinite(next) && next !== item.order) updateItem(item.id, { order: next });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">משך זמן</div>
                    <input
                      defaultValue={item.duration || ''}
                      onBlur={(e) => {
                        const next = String(e.target.value || '').trim();
                        const curr = String(item.duration || '').trim();
                        if (next !== curr) updateItem(item.id, { duration: next });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                      placeholder="01:30"
                    />
                  </div>

                  <div className="md:col-span-5">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video URL</div>
                    <input
                      defaultValue={item.videoUrl}
                      onBlur={(e) => {
                        const next = String(e.target.value || '').trim();
                        if (next && next !== item.videoUrl) updateItem(item.id, { videoUrl: next });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => removeItem(item.id)}
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
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
                <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">הוספת סרטון</div>
                  <div className="text-xs font-bold text-slate-600">מודול · כותרת · קישור · סדר</div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מודול</div>
                  <select
                    value={draft.moduleKey}
                    onChange={(e) => setDraft((p) => ({ ...p, moduleKey: e.target.value as OSModuleKey }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                  >
                    {MODULES.map((m) => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כותרת</div>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="איך עושים את זה בלי חפירות"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video URL</div>
                  <input
                    value={draft.videoUrl}
                    onChange={(e) => setDraft((p) => ({ ...p, videoUrl: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="https://www.youtube.com/watch?v=... או https://player.vimeo.com/video/..."
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סדר</div>
                  <input
                    type="number"
                    value={String(draft.order)}
                    onChange={(e) => setDraft((p) => ({ ...p, order: Number(e.target.value) }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                  />
                </div>

                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">משך זמן</div>
                  <input
                    value={draft.duration}
                    onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="01:30"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <Button type="button" onClick={addItem}>
                    <Save size={16} />
                    שמור
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
