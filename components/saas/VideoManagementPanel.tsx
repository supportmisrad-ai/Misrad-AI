'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Save, Trash2, Video, X, RefreshCw, Monitor, Smartphone, Globe, BookOpen, Megaphone, HelpCircle } from 'lucide-react';
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

/**
 * Video categories — derived from title prefix convention:
 *   [tutorial] Title → tutorial
 *   [marketing] Title → marketing
 *   Everything else → support (default)
 */
type VideoCategory = 'support' | 'tutorial' | 'marketing';

const CATEGORIES: Array<{ key: VideoCategory | 'all'; label: string; icon: React.ReactNode; color: string }> = [
  { key: 'all', label: 'הכל', icon: <Video size={14} />, color: 'slate' },
  { key: 'support', label: 'תמיכה', icon: <HelpCircle size={14} />, color: 'blue' },
  { key: 'tutorial', label: 'הדרכות', icon: <BookOpen size={14} />, color: 'emerald' },
  { key: 'marketing', label: 'שיווק', icon: <Megaphone size={14} />, color: 'purple' },
];

const MODULES: Array<{ key: OSModuleKey; label: string }> = [
  { key: 'nexus', label: 'Nexus' },
  { key: 'system', label: 'System' },
  { key: 'operations', label: 'Operations' },
  { key: 'finance', label: 'Finance' },
  { key: 'social', label: 'Social' },
  { key: 'client', label: 'Client' },
];

const DEVICE_TYPES = [
  { key: 'desktop', label: 'Desktop', icon: <Monitor size={12} /> },
  { key: 'mobile', label: 'Mobile', icon: <Smartphone size={12} /> },
  { key: 'both', label: 'שניהם', icon: <Globe size={12} /> },
] as const;

function extractCategory(title: string): VideoCategory {
  const lower = title.toLowerCase();
  if (lower.startsWith('[tutorial]') || lower.startsWith('[הדרכה]')) return 'tutorial';
  if (lower.startsWith('[marketing]') || lower.startsWith('[שיווק]')) return 'marketing';
  return 'support';
}

function stripCategoryPrefix(title: string): string {
  return title.replace(/^\[(tutorial|marketing|הדרכה|שיווק)\]\s*/i, '');
}

function addCategoryPrefix(title: string, category: VideoCategory): string {
  const stripped = stripCategoryPrefix(title);
  if (category === 'support') return stripped;
  if (category === 'tutorial') return `[tutorial] ${stripped}`;
  if (category === 'marketing') return `[marketing] ${stripped}`;
  return stripped;
}

type ExtendedHelpVideo = HelpVideo & { category: VideoCategory; displayTitle: string };

function extendVideo(v: HelpVideo): ExtendedHelpVideo {
  return {
    ...v,
    category: extractCategory(v.title),
    displayTitle: stripCategoryPrefix(v.title),
  };
}

export function VideoManagementPanel() {
  const { addToast } = useData();

  const [moduleFilter, setModuleFilter] = useState<OSModuleKey | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<VideoCategory | 'all'>('all');
  const [items, setItems] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [draft, setDraft] = useState<{
    moduleKey: OSModuleKey;
    title: string;
    videoUrl: string;
    order: number;
    duration: string;
    category: VideoCategory;
    device: 'desktop' | 'mobile' | 'both';
  }>({
    moduleKey: 'system',
    title: '',
    videoUrl: '',
    order: 0,
    duration: '',
    category: 'support',
    device: 'both',
  });

  const load = useCallback(async () => {
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
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [moduleFilter, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const extended = useMemo(() => items.map(extendVideo), [items]);

  const filtered = useMemo(() => {
    let result = extended;
    if (categoryFilter !== 'all') {
      result = result.filter((v) => v.category === categoryFilter);
    }
    return result.sort((a, b) => {
      if (a.moduleKey !== b.moduleKey) return a.moduleKey.localeCompare(b.moduleKey);
      return a.order - b.order;
    });
  }, [extended, categoryFilter]);

  const stats = useMemo(() => ({
    total: extended.length,
    support: extended.filter((v) => v.category === 'support').length,
    tutorial: extended.filter((v) => v.category === 'tutorial').length,
    marketing: extended.filter((v) => v.category === 'marketing').length,
  }), [extended]);

  const addItem = async () => {
    const rawTitle = String(draft.title || '').trim();
    const videoUrl = String(draft.videoUrl || '').trim();
    if (!rawTitle || !videoUrl) {
      addToast('חסר כותרת או קישור', 'error');
      return;
    }

    const deviceSuffix = draft.device === 'both' ? '' : draft.device === 'desktop' ? ' [desktop]' : ' [mobile]';
    const fullTitle = addCategoryPrefix(rawTitle + deviceSuffix, draft.category);

    try {
      const res = await adminCreateHelpVideo({
        moduleKey: draft.moduleKey,
        title: fullTitle,
        videoUrl,
        order: Number.isFinite(draft.order) ? draft.order : 0,
        duration: draft.duration.trim() || undefined,
      });
      if (!res.success) {
        addToast(res.error || 'שגיאה', 'error');
        return;
      }
      addToast('סרטון נוסף בהצלחה', 'success');
      setIsAdding(false);
      setDraft({ moduleKey: draft.moduleKey, title: '', videoUrl: '', order: 0, duration: '', category: draft.category, device: 'both' });
      await load();
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה', 'error');
    }
  };

  const updateItem = async (id: string, patch: { title?: string; videoUrl?: string; order?: number; duration?: string }) => {
    try {
      const res = await adminUpdateHelpVideo(id, patch);
      if (!res.success) {
        addToast(res.error || 'שגיאה בעדכון', 'error');
        return;
      }
      setItems((prev) => prev.map((p) => (p.id === id && res.data ? res.data : p)));
      addToast('עודכן', 'success');
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה', 'error');
    }
  };

  const removeItem = async (id: string) => {
    if (typeof window !== 'undefined' && !window.confirm('למחוק את הסרטון?')) return;
    try {
      const res = await adminDeleteHelpVideo(id);
      if (!res.success) {
        addToast(res.error || 'שגיאה', 'error');
        return;
      }
      addToast('נמחק', 'success');
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה', 'error');
    }
  };

  const categoryColor = (cat: VideoCategory) => {
    if (cat === 'tutorial') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: '📚' };
    if (cat === 'marketing') return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', badge: '📣' };
    return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: '🎓' };
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center">
            <Video size={18} />
          </div>
          <div>
            <div className="text-sm font-black text-slate-900">ניהול סרטונים מרכזי</div>
            <div className="text-xs font-bold text-slate-600">תמיכה · הדרכות · שיווק — כל הסרטונים במקום אחד</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => load()} disabled={loading} variant="outline" size="sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </Button>
          <Button type="button" onClick={() => setIsAdding(true)} size="sm">
            <Plus size={14} />
            הוסף סרטון
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'סה"כ', value: stats.total, color: 'text-slate-700', bg: 'bg-slate-50' },
          { label: 'תמיכה', value: stats.support, color: 'text-blue-700', bg: 'bg-blue-50' },
          { label: 'הדרכות', value: stats.tutorial, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: 'שיווק', value: stats.marketing, color: 'text-purple-700', bg: 'bg-purple-50' },
        ].map((s, i) => (
          <div key={i} className={`rounded-2xl border border-slate-200 ${s.bg} p-4`}>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{s.label}</div>
            <div className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Category tabs */}
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              categoryFilter === cat.key
                ? 'bg-slate-900 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}

        <div className="w-px h-6 bg-slate-200 mx-1" />

        {/* Module filter */}
        <select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value as 'all' | OSModuleKey)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold outline-none focus:ring-4 ring-slate-100"
        >
          <option value="all">כל המודולים</option>
          {MODULES.map((m) => (
            <option key={m.key} value={m.key}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Video list */}
      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600 text-center">טוען...</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="text-3xl mb-3">🎬</div>
            <div className="text-sm font-black text-slate-900">אין סרטונים בקטגוריה הזו</div>
            <div className="mt-1 text-xs font-bold text-slate-600">הוסף סרטון חדש או שנה את הפילטר.</div>
          </div>
        ) : (
          filtered.map((item) => {
            const cc = categoryColor(item.category);
            return (
              <div key={item.id} className={`rounded-2xl border ${cc.border} ${cc.bg} p-4 transition-all hover:shadow-sm`}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                  {/* Category badge */}
                  <div className={`flex items-center gap-2 text-xs font-bold ${cc.text} whitespace-nowrap`}>
                    <span>{cc.badge}</span>
                    <span className="uppercase tracking-wider">{item.category}</span>
                  </div>

                  {/* Module badge */}
                  <div className="rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 whitespace-nowrap">
                    {MODULES.find((m) => m.key === item.moduleKey)?.label || item.moduleKey}
                  </div>

                  {/* Title (editable) */}
                  <div className="flex-1">
                    <input
                      defaultValue={item.title}
                      onBlur={(e) => {
                        const next = String(e.target.value || '').trim();
                        if (next && next !== item.title) updateItem(item.id, { title: next });
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>

                  {/* Order */}
                  <input
                    type="number"
                    defaultValue={String(item.order)}
                    onBlur={(e) => {
                      const next = Number(e.target.value);
                      if (Number.isFinite(next) && next !== item.order) updateItem(item.id, { order: next });
                    }}
                    className="w-16 rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-sm font-bold text-center outline-none focus:ring-4 ring-slate-100"
                    title="סדר"
                  />

                  {/* Duration */}
                  <input
                    defaultValue={item.duration || ''}
                    onBlur={(e) => {
                      const next = String(e.target.value || '').trim();
                      const curr = String(item.duration || '').trim();
                      if (next !== curr) updateItem(item.id, { duration: next });
                    }}
                    className="w-20 rounded-xl border border-slate-200 bg-white/80 px-2 py-2 text-sm font-bold text-center outline-none focus:ring-4 ring-slate-100"
                    placeholder="01:30"
                    title="משך"
                  />

                  {/* Delete */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 size={12} />
                  </Button>
                </div>

                {/* Video URL row */}
                <div className="mt-2">
                  <input
                    defaultValue={item.videoUrl}
                    onBlur={(e) => {
                      const next = String(e.target.value || '').trim();
                      if (next && next !== item.videoUrl) updateItem(item.id, { videoUrl: next });
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-slate-500 outline-none focus:ring-4 ring-slate-100"
                    dir="ltr"
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add dialog */}
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
              <Button type="button" variant="ghost" size="icon" className="absolute top-4 left-4 h-10 w-10" onClick={() => setIsAdding(false)}>
                <X size={20} />
              </Button>

              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white flex items-center justify-center">
                  <Video size={18} />
                </div>
                <div>
                  <div className="text-lg font-black text-slate-900">הוספת סרטון</div>
                  <div className="text-xs font-bold text-slate-600">קטגוריה · מודול · כותרת · קישור · מכשיר</div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Category */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">קטגוריה</div>
                  <div className="flex gap-2">
                    {(['support', 'tutorial', 'marketing'] as VideoCategory[]).map((cat) => {
                      const isActive = draft.category === cat;
                      const labels = { support: '🎓 תמיכה', tutorial: '📚 הדרכה', marketing: '📣 שיווק' };
                      const colors = { support: 'blue', tutorial: 'emerald', marketing: 'purple' };
                      return (
                        <button
                          key={cat}
                          onClick={() => setDraft((p) => ({ ...p, category: cat }))}
                          className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                            isActive
                              ? `bg-${colors[cat]}-50 border-2 border-${colors[cat]}-300 text-${colors[cat]}-700`
                              : 'bg-slate-50 border-2 border-transparent text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {labels[cat]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Module */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מודול</div>
                  <select
                    value={draft.moduleKey}
                    onChange={(e) => setDraft((p) => ({ ...p, moduleKey: e.target.value as OSModuleKey }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                  >
                    {MODULES.map((m) => (
                      <option key={m.key} value={m.key}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Device type */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">מכשיר</div>
                  <div className="flex gap-2">
                    {DEVICE_TYPES.map((d) => (
                      <button
                        key={d.key}
                        onClick={() => setDraft((p) => ({ ...p, device: d.key }))}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                          draft.device === d.key
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {d.icon}
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">כותרת</div>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((p) => ({ ...p, title: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="איך פותחים ליד"
                  />
                </div>

                {/* Video URL */}
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Video URL</div>
                  <input
                    value={draft.videoUrl}
                    onChange={(e) => setDraft((p) => ({ ...p, videoUrl: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    placeholder="https://..."
                    dir="ltr"
                  />
                </div>

                {/* Order + Duration row */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">סדר</div>
                    <input
                      type="number"
                      value={String(draft.order)}
                      onChange={(e) => setDraft((p) => ({ ...p, order: Number(e.target.value) }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">משך זמן</div>
                    <input
                      value={draft.duration}
                      onChange={(e) => setDraft((p) => ({ ...p, duration: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:ring-4 ring-slate-100"
                      placeholder="01:30"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
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
