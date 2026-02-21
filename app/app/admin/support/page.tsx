'use client';

import React, { useEffect, useState } from 'react';
import { LifeBuoy, Save } from 'lucide-react';
import { getContentByKey } from '@/app/actions/site-content';
import { bulkUpdateSiteContent } from '@/app/actions/admin-site-content';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

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
    } catch (e: unknown) {
      setStatus({ type: 'error', message: (e instanceof Error ? e.message : String(e)) || 'שגיאה בשמירה' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הגדרות תמיכה" subtitle="קישורים ותצוגה בחלון התמיכה" icon={LifeBuoy} />

      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 max-w-2xl">
        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">קישור להצטרפות לקבוצת הוואטסאפ</label>
        <div className="text-xs font-bold text-slate-400 mt-2">
          הקישור יוצג בחלון התמיכה למשתמשים (כפתור &quot;הצטרפות לקבוצת תמיכה ועדכונים בוואטסאפ&quot;).
        </div>

        <Input
          value={whatsappGroupUrl}
          onChange={(e) => setWhatsappGroupUrl(e.target.value)}
          placeholder="הדבק כאן קישור (invite link)"
          className="mt-3"
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
          <Button onClick={onSave} disabled={isSaving} variant="secondary" className="w-full md:w-auto">
            <Save size={16} />
            {isSaving ? 'שומר…' : 'שמור'}
          </Button>
        </div>
      </div>
    </div>
  );
}
