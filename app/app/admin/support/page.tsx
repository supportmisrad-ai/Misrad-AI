'use client';

import React, { useEffect, useState } from 'react';
import { LifeBuoy, Save } from 'lucide-react';
import { getContentByKey } from '@/app/actions/site-content';
import { bulkUpdateSiteContent } from '@/app/actions/admin-site-content';

export const dynamic = 'force-dynamic';

export default function AdminSupportSettingsPage() {
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getContentByKey('landing', 'support', 'support_whatsapp_group_url');
        if (!cancelled) {
          setWhatsappGroupUrl(typeof res.data === 'string' ? res.data : '');
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const onSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      const trimmed = whatsappGroupUrl.trim();
      const result = await bulkUpdateSiteContent([
        {
          page: 'landing',
          section: 'support',
          key: 'support_whatsapp_group_url',
          content: trimmed,
        },
      ]);

      if (!result.success) {
        setStatus({ type: 'error', message: result.error || 'שגיאה בשמירה' });
        return;
      }

      setStatus({ type: 'success', message: 'נשמר בהצלחה' });
    } catch (e: any) {
      setStatus({ type: 'error', message: e?.message || 'שגיאה בשמירה' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
          <LifeBuoy className="text-slate-700" size={22} />
        </div>
        <div>
          <div className="text-2xl font-black text-slate-900">הגדרות תמיכה</div>
          <div className="text-sm font-bold text-slate-500 mt-1">קישורים ותצוגה בחלון התמיכה</div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-2xl">
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">קישור להצטרפות לקבוצת הוואטסאפ</label>
        <div className="text-xs font-bold text-slate-400 mt-2">
          הקישור יוצג בחלון התמיכה למשתמשים (כפתור "הצטרפות לקבוצת תמיכה ועדכונים בוואטסאפ").
        </div>

        <input
          value={whatsappGroupUrl}
          onChange={(e) => setWhatsappGroupUrl(e.target.value)}
          placeholder="הדבק כאן קישור (invite link)"
          className="mt-3 w-full h-11 px-4 rounded-xl bg-white border border-slate-200 text-slate-900 font-bold outline-none focus:border-indigo-300"
        />

        {status ? (
          <div
            className={`mt-4 text-sm font-bold ${
              status.type === 'success' ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {status.message}
          </div>
        ) : null}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-black disabled:opacity-60"
          >
            <Save size={16} />
            {isSaving ? 'שומר…' : 'שמור'}
          </button>
        </div>
      </div>
    </div>
  );
}
