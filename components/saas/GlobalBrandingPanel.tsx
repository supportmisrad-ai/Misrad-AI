'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, Upload, Trash2, Loader2 } from 'lucide-react';

export const GlobalBrandingPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [defaultLogoUrl, setDefaultLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/branding/logo', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        setDefaultLogoUrl(data?.defaultLogoUrl ?? null);
      } catch {
        if (cancelled) return;
        setDefaultLogoUrl(null);
      } finally {
        if (cancelled) return;
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const triggerUpload = () => fileInputRef.current?.click();

  const saveDefaultLogoUrl = async (url: string | null) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/branding/logo', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultLogoUrl: url }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || 'שגיאה בשמירה');
      }

      const data = await res.json().catch(() => null);
      setDefaultLogoUrl(data?.defaultLogoUrl ?? url);
      try {
        sessionStorage.setItem('global_default_logo_url', String(data?.defaultLogoUrl ?? url ?? ''));
      } catch {
        // ignore
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 5 * 1024 * 1024) {
        alert('הקובץ גדול מדי. מקסימום 5MB');
        return;
      }

      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('סוג קובץ לא נתמך. PNG / JPG / SVG / WebP');
        return;
      }

      setIsSaving(true);

      const form = new FormData();
      form.append('file', file);
      form.append('bucket', 'attachments');
      form.append('folder', 'global-branding');

      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: form,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => null);
        throw new Error(err?.error || 'שגיאה בהעלאה');
      }

      const upload = await uploadRes.json().catch(() => null);
      const url = String(upload?.url || '');
      if (!url) throw new Error('לא התקבל URL מהעלאה');

      await saveDefaultLogoUrl(url);
    } catch (err: any) {
      alert(err?.message || 'שגיאה');
    } finally {
      setIsSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    if (!confirm('למחוק לוגו ברירת־מחדל?')) return;
    try {
      await saveDefaultLogoUrl(null);
    } catch (e: any) {
      alert(e?.message || 'שגיאה');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-10">
        <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
          מיתוג גלובלי (White Label)
        </h1>
        <p className="text-slate-600 text-lg">
          לוגו ברירת־מחדל לכל המערכת. מוצג לכל Tenant שלא העלה לוגו משלו.
        </p>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 text-slate-900 shadow-2xl">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
                {isLoading ? (
                  <Loader2 size={28} className="animate-spin text-slate-500" />
                ) : defaultLogoUrl ? (
                  <img src={defaultLogoUrl} alt="Default Logo" className="w-full h-full object-contain p-3" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <ImageIcon size={28} />
                    <span className="text-[10px] font-black">אין לוגו</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerUpload}
                    disabled={isSaving || isLoading}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                    {defaultLogoUrl ? 'החלף לוגו' : 'העלה לוגו'}
                  </button>

                  {defaultLogoUrl && (
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isSaving || isLoading}
                      className="px-5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-black flex items-center gap-2 transition-all border border-slate-200 disabled:opacity-50"
                    >
                      <Trash2 size={18} />
                      מחק
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-slate-500 font-bold">מומלץ PNG/SVG שקוף, עד 5MB</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
          </div>

          <div className="w-full lg:w-[420px]">
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6">
              <p className="text-sm font-black mb-3">מה זה משפיע?</p>
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <div>מופיע ב־Favicon וב־Apple Touch Icon כשאין לוגו לארגון.</div>
                <div>לא מחליף לוגו של ארגון שכבר העלה לוגו משלו.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
