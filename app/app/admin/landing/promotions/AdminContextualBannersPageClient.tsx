'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Trash2, Save, ToggleLeft, ToggleRight, AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import {
  getContextualBanners,
  saveContextualBanners,
  type ContextualBanner,
} from '@/app/actions/admin-landing-marketing';

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_BANNER: Omit<ContextualBanner, 'id'> = {
  title: '',
  message: '',
  ctaText: '',
  ctaUrl: '',
  bgColor: 'bg-blue-50',
  textColor: 'text-blue-900',
  active: false,
  showOnPricing: true,
  showOnSignup: true,
  showOnLanding: true,
  startDate: null,
  endDate: null,
};

const BANNER_THEMES = [
  { label: 'כחול (ברירת מחדל)', bg: 'bg-blue-50', text: 'text-blue-900' },
  { label: 'ירוק (חיובי)', bg: 'bg-emerald-50', text: 'text-emerald-900' },
  { label: 'כתום (אזהרה)', bg: 'bg-amber-50', text: 'text-amber-900' },
  { label: 'סגול (מיוחד)', bg: 'bg-purple-50', text: 'text-purple-900' },
  { label: 'אפור (ניטרלי)', bg: 'bg-slate-100', text: 'text-slate-900' },
  { label: 'אדום (דחוף)', bg: 'bg-red-50', text: 'text-red-900' },
];

export default function AdminContextualBannersPageClient() {
  const [banners, setBanners] = useState<ContextualBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const bannerRes = await getContextualBanners();
      if (bannerRes.success) setBanners(bannerRes.banners || []);
      setLoading(false);
    })();
  }, []);

  const handleSaveBanners = async () => {
    setSaving(true);
    const res = await saveContextualBanners(banners);
    setSaving(false);
    if (res.success) showToast('באנרים נשמרו בהצלחה');
    else showToast('שגיאה בשמירת באנרים');
  };

  const addBanner = () => {
    setBanners(prev => [...prev, { ...EMPTY_BANNER, id: generateId('banner') }]);
  };

  const removeBanner = (id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  const updateBanner = (id: string, patch: Partial<ContextualBanner>) => {
    setBanners(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="באנרים תקופתיים" subtitle="טוען..." icon={Megaphone} />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="באנרים תקופתיים" subtitle="באנרים לא-פולשניים לדפים שיווקיים — מלחמה, חגים, אירועים מיוחדים" icon={Megaphone} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl font-bold text-sm animate-fade-in">
          {toast}
        </div>
      )}

      {/* Link to promotions page */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-indigo-800 font-medium">לניהול מבצעים והנחות (הנחה באחוזים, קופונים, FOMO)</span>
        <Link href="/app/admin/global/promotions" className="text-sm font-bold text-indigo-600 hover:text-indigo-800 underline">
          עבור לדף מבצעים →
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">באנרים תקופתיים מוצגים בדפים השיווקיים בצורה לא פולשנית — לדוגמה הזדהות עם תקופת מלחמה, חגים, אירועים מיוחדים.</p>
          <div className="flex gap-2">
            <button onClick={addBanner} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors">
              <Plus size={14} /> הוסף באנר
            </button>
            <button onClick={handleSaveBanners} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              <Save size={14} /> שמור הכל
            </button>
          </div>
        </div>

        {banners.length === 0 && (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <AlertTriangle size={40} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-bold">אין באנרים תקופתיים</p>
            <p className="text-slate-400 text-sm mt-1">לחץ על &quot;הוסף באנר&quot; כדי ליצור באנר ראשון</p>
          </div>
        )}

        {banners.map((banner) => (
          <div key={banner.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${banner.active ? 'border-indigo-300 shadow-md' : 'border-slate-200'}`}>
            {/* Preview */}
            {banner.active && banner.message && (
              <div className={`${banner.bgColor} ${banner.textColor} px-6 py-4 border-b border-slate-200`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {banner.title && <div className="font-black text-sm mb-1">{banner.title}</div>}
                    <div className="text-sm font-medium leading-relaxed">{banner.message}</div>
                    {banner.ctaText && (
                      <span className="inline-block mt-2 px-3 py-1 bg-white/60 rounded-lg text-xs font-bold">
                        {banner.ctaText} →
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold bg-white/50 px-2 py-0.5 rounded shrink-0">תצוגה מקדימה</span>
                </div>
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateBanner(banner.id, { active: !banner.active })}
                    className={`transition-colors ${banner.active ? 'text-indigo-600' : 'text-slate-300'}`}
                  >
                    {banner.active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                  </button>
                  <span className={`text-xs font-black px-2 py-1 rounded ${banner.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {banner.active ? 'פעיל' : 'כבוי'}
                  </span>
                </div>
                <button onClick={() => removeBanner(banner.id)} className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">כותרת</label>
                  <input type="text" value={banner.title} onChange={e => updateBanner(banner.id, { title: e.target.value })} placeholder="אנחנו איתכם" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">סגנון צבע</label>
                  <select value={`${banner.bgColor}|${banner.textColor}`} onChange={e => { const [bg, text] = e.target.value.split('|'); updateBanner(banner.id, { bgColor: bg, textColor: text }); }} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none">
                    {BANNER_THEMES.map(t => (
                      <option key={t.bg} value={`${t.bg}|${t.text}`}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 block mb-1">הודעה</label>
                <textarea value={banner.message} onChange={e => updateBanner(banner.id, { message: e.target.value })} placeholder="אנחנו איתכם גם ברגעים האלו. גם מהממד או מהמקלט אפשר לעשות סדר בעסק שלך..." rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none resize-none" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">טקסט CTA</label>
                  <input type="text" value={banner.ctaText} onChange={e => updateBanner(banner.id, { ctaText: e.target.value })} placeholder="הצטרפו לוובינר" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">קישור CTA</label>
                  <input type="text" value={banner.ctaUrl} onChange={e => updateBanner(banner.id, { ctaUrl: e.target.value })} placeholder="https://zoom.us/..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">תאריך התחלה</label>
                  <input type="datetime-local" value={banner.startDate?.slice(0, 16) ?? ''} onChange={e => updateBanner(banner.id, { startDate: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1">תאריך סיום</label>
                  <input type="datetime-local" value={banner.endDate?.slice(0, 16) ?? ''} onChange={e => updateBanner(banner.id, { endDate: e.target.value ? new Date(e.target.value).toISOString() : null })} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none" />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={banner.showOnPricing} onChange={e => updateBanner(banner.id, { showOnPricing: e.target.checked })} className="rounded" />
                  דף תמחור
                </label>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={banner.showOnSignup} onChange={e => updateBanner(banner.id, { showOnSignup: e.target.checked })} className="rounded" />
                  דף הרשמה
                </label>
                <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={banner.showOnLanding} onChange={e => updateBanner(banner.id, { showOnLanding: e.target.checked })} className="rounded" />
                  דף נחיתה ראשי
                </label>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
