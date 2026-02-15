'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Save, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useData } from '@/context/DataContext';
import { getContentByKey } from '@/app/actions/site-content';
import { bulkUpdateSiteContent } from '@/app/actions/admin-site-content';
import { getEmbedUrl, getVideoProvider } from '@/lib/video-embed';

type PackageKey = 'the_operator' | 'the_closer' | 'the_authority' | 'the_empire' | 'solo';

type PackageRow = {
  key: PackageKey;
  label: string;
  landingPath: string;
  contentKey: string;
};

export function LandingPackageVideosPanel({ hideHeader }: { hideHeader?: boolean }) {
  const { addToast } = useData();

  const rows: PackageRow[] = useMemo(
    () => [
      {
        key: 'the_operator',
        label: 'חבילת תפעול ושטח',
        landingPath: '/the-operator',
        contentKey: 'the_operator_video_url',
      },
      {
        key: 'the_closer',
        label: 'חבילת מכירות',
        landingPath: '/the-closer',
        contentKey: 'the_closer_video_url',
      },
      {
        key: 'the_authority',
        label: 'חבילת שיווק ומיתוג',
        landingPath: '/the-authority',
        contentKey: 'the_authority_video_url',
      },
      {
        key: 'the_empire',
        label: 'הכל כלול',
        landingPath: '/the-empire',
        contentKey: 'the_empire_video_url',
      },
      {
        key: 'solo',
        label: 'מודול בודד',
        landingPath: '/solo',
        contentKey: 'solo_video_url',
      },
    ],
    []
  );

  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<PackageKey, string>>({
    the_operator: '',
    the_closer: '',
    the_authority: '',
    the_empire: '',
    solo: '',
  });
  const [saving, setSaving] = useState<Record<PackageKey, boolean>>({
    the_operator: false,
    the_closer: false,
    the_authority: false,
    the_empire: false,
    solo: false,
  });

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const results = await Promise.all(
          rows.map(async (r) => {
            const res = await getContentByKey('landing', 'package_landings', r.contentKey);
            return { key: r.key, value: res.success ? (res.data as unknown) : null };
          })
        );

        setValues((prev) => {
          const next = { ...prev };
          for (const row of results) {
            next[row.key] = row.value ? String(row.value) : '';
          }
          return next;
        });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [rows]);

  const handleSave = async (row: PackageRow) => {
    setSaving((s) => ({ ...s, [row.key]: true }));
    try {
      const raw = String(values[row.key] || '').trim();
      const normalized = getEmbedUrl(raw);
      const payload = normalized.length > 0 ? normalized : null;

      // update local value so the UI reflects what we actually saved
      setValues((v) => ({ ...v, [row.key]: payload ? String(payload) : '' }));
      const res = await bulkUpdateSiteContent([
        {
          page: 'landing',
          section: 'package_landings',
          key: row.contentKey,
          content: payload,
        },
      ]);
      if (!res.success) {
        addToast(res.error || 'שגיאה בשמירה', 'error');
        return;
      }
      addToast('נשמר', 'success');
    } catch (e: unknown) {
      addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בשמירה', 'error');
    } finally {
      setSaving((s) => ({ ...s, [row.key]: false }));
    }
  };

  return (
    <div dir="rtl">
      {!hideHeader ? (
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Video size={18} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">וידאו לדפי נחיתה · חבילות</h1>
              <p className="text-slate-600 mt-1">הדבק קישור Embed (למשל YouTube embed) שיופיע בדף החבילה.</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {rows.map((row) => {
          const disabled = isLoading || saving[row.key];
          return (
            <div key={row.key} className="rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-lg font-black text-slate-900 truncate">{row.label}</div>
                    <div className="text-xs text-slate-500 mt-1 truncate">{row.landingPath}</div>
                  </div>
                  <Link
                    href={row.landingPath}
                    target="_blank"
                    className="inline-flex items-center gap-2 text-sm font-black text-indigo-700 hover:text-indigo-600"
                  >
                    פתח דף <ExternalLink size={16} />
                  </Link>
                </div>
              </div>

              <div className="p-6 space-y-3">
                <label className="block text-xs font-black text-slate-600">קישור סרטון (Embed URL)</label>
                <div className="space-y-2">
                  <input
                    value={values[row.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [row.key]: e.target.value }))}
                    onBlur={() =>
                      setValues((v) => {
                        const next = { ...v };
                        const raw = String(next[row.key] || '').trim();
                        if (!raw) return next;
                        next[row.key] = getEmbedUrl(raw);
                        return next;
                      })
                    }
                    placeholder="https://www.youtube.com/embed/..."
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm outline-none focus:border-indigo-400"
                    disabled={isLoading}
                  />

                  <div className="text-xs text-slate-500">
                    {(() => {
                      const normalized = getEmbedUrl(values[row.key]);
                      const provider = getVideoProvider(normalized);
                      if (!values[row.key]) return 'ממתין ללינק';
                      if (provider === 'youtube') return 'זוהה: YouTube';
                      if (provider === 'loom') return 'זוהה: Loom';
                      if (provider === 'vimeo') return 'זוהה: Vimeo';
                      return 'לא זוהה ספק (בדוק שהלינק תקין)';
                    })()}
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => handleSave(row)} disabled={disabled} className="font-black">
                    <Save size={16} className="ml-2" />
                    שמור
                  </Button>
                </div>

                {values[row.key] ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
                    <div className="relative w-full aspect-video">
                      <iframe
                        src={getEmbedUrl(values[row.key])}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title={`${row.label} · וידאו`}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
