'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Save, Image, Trash2, ExternalLink, ChevronDown, ChevronUp, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/context/DataContext';
import { adminGetEmailAssets, adminUpdateEmailAssets, adminUploadEmailAsset } from '@/app/actions/admin-email-assets';
import { EMAIL_ASSET_LABELS } from '@/lib/email-asset-labels';
import { getErrorMessage } from '@/lib/shared/unknown';

type AssetsState = Record<string, string>;

const IMAGE_URL_KEYS = new Set(
  Object.entries(EMAIL_ASSET_LABELS)
    .filter(([, meta]) => meta.hint && /px/i.test(meta.hint))
    .map(([key]) => key)
);

function isImageKey(key: string): boolean {
  return IMAGE_URL_KEYS.has(key);
}

export default function EmailAssetsClient() {
  const { addToast } = useData();

  const [dbOverrides, setDbOverrides] = useState<AssetsState>({});
  const [editState, setEditState] = useState<AssetsState>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadKeyRef = useRef<string | null>(null);

  const defaults = useMemo(() => ({} as Record<string, string>), []);

  const allKeys = useMemo(() => Object.keys(EMAIL_ASSET_LABELS), []);

  const categories = useMemo(() => {
    const catMap: Record<string, string[]> = {};
    for (const key of allKeys) {
      const cat = EMAIL_ASSET_LABELS[key]?.category || 'כללי';
      if (!catMap[cat]) catMap[cat] = [];
      catMap[cat].push(key);
    }
    return catMap;
  }, [allKeys]);

  const categoryOrder = [
    'מותג', 'מייסד', 'קבלת פנים', 'מוצר', 'דוחות',
    'שיווק', 'גרסאות', 'המלצות', 'סרטונים', 'חיוב', 'כללי',
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminGetEmailAssets();
      if (!res.success) {
        addToast(res.error || 'שגיאה בטעינת נתונים', 'error');
        return;
      }
      const data = res.data || {};
      setDbOverrides(data);
      setEditState(data);
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בטעינת נתונים', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const cleaned: AssetsState = {};
      for (const [k, v] of Object.entries(editState)) {
        const trimmed = v.trim();
        if (trimmed) cleaned[k] = trimmed;
      }

      const res = await adminUpdateEmailAssets(cleaned);
      if (!res.success) {
        addToast(res.error || 'שגיאה בשמירה', 'error');
        return;
      }
      setDbOverrides(res.data || {});
      setEditState(res.data || {});
      addToast('הגדרות תמונות מיילים נשמרו בהצלחה', 'success');
    } catch (e: unknown) {
      addToast(getErrorMessage(e) || 'שגיאה בשמירה', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setEditState((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = (key: string) => {
    setEditState((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const handleUploadClick = (key: string) => {
    activeUploadKeyRef.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = activeUploadKeyRef.current;
    if (!file || !key) return;

    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('key', key);

      const res = await adminUploadEmailAsset(formData);
      if (!res.success) {
        addToast(res.error || 'שגיאה בהעלאת קובץ', 'error');
        return;
      }

      if (res.data?.url) {
        handleChange(key, res.data.url);
        // Update dbOverrides as well since the action already saved it to DB
        setDbOverrides(prev => ({ ...prev, [key]: res.data!.url }));
        addToast('הקובץ הועלה ועודכן בהצלחה', 'success');
      }
    } catch (err) {
      addToast(getErrorMessage(err) || 'שגיאה בהעלאת קובץ', 'error');
    } finally {
      setUploadingKey(null);
      activeUploadKeyRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasChanges = useMemo(() => {
    const cleanedEdit: AssetsState = {};
    for (const [k, v] of Object.entries(editState)) {
      if (v.trim()) cleanedEdit[k] = v.trim();
    }
    const dbKeys = Object.keys(dbOverrides).sort();
    const editKeys = Object.keys(cleanedEdit).sort();
    if (dbKeys.length !== editKeys.length) return true;
    for (let i = 0; i < dbKeys.length; i++) {
      if (dbKeys[i] !== editKeys[i]) return true;
      if (dbOverrides[dbKeys[i]] !== cleanedEdit[editKeys[i]]) return true;
    }
    return false;
  }, [editState, dbOverrides]);

  const overrideCount = Object.keys(dbOverrides).length;

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />

      {/* Header Card */}
      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-5 md:p-6 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Image size={18} className="text-slate-700" />
              תמונות וויזואלים למיילים
            </div>
            <div className="text-xs font-bold text-slate-600 mt-1">
              {overrideCount > 0
                ? `${overrideCount} שדות מוגדרים ב-DB · שאר השדות משתמשים בברירת מחדל`
                : 'כל השדות משתמשים בברירת מחדל (env / public/email/)'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={load} disabled={loading || saving} size="sm">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              רענן
            </Button>
            <Button onClick={save} disabled={loading || saving || !hasChanges} size="sm">
              <Save size={14} />
              {saving ? 'שומר…' : 'שמירה'}
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
            יש שינויים שלא נשמרו
          </div>
        )}
      </div>

      {/* Asset Categories */}
      {categoryOrder.map((cat) => {
        const keys = categories[cat];
        if (!keys || keys.length === 0) return null;
        const isCollapsed = collapsedCategories[cat];
        const catOverrides = keys.filter((k) => editState[k]?.trim()).length;

        return (
          <div
            key={cat}
            className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl shadow-xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="text-sm font-black text-slate-900">{cat}</div>
                <div className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {keys.length} שדות
                </div>
                {catOverrides > 0 && (
                  <div className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                    {catOverrides} מוגדרים
                  </div>
                )}
              </div>
              {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>

            {!isCollapsed && (
              <div className="px-5 pb-5 space-y-4">
                {keys.map((key) => {
                  const meta = EMAIL_ASSET_LABELS[key];
                  const currentValue = editState[key] || '';
                  const defaultValue = (defaults as Record<string, string>)[key] || '';
                  const hasOverride = Boolean(currentValue.trim());
                  const isImg = isImageKey(key);
                  const isUploading = uploadingKey === key;

                  return (
                    <div key={key} className="border border-slate-100 rounded-2xl p-4 space-y-2 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-slate-800">{meta?.label || key}</div>
                          <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                            <span className="font-mono">{key}</span>
                            {meta?.hint && <span className="mr-2 text-slate-500">· {meta.hint}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {isImg && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUploadClick(key)}
                              disabled={loading || saving || isUploading}
                              className="h-7 w-7 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="העלאת קובץ"
                            >
                              {isUploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                            </Button>
                          )}
                          {hasOverride && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleClear(key)}
                              disabled={isUploading}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                              title="מחק ערך — חזור לברירת מחדל"
                            >
                              <Trash2 size={13} />
                            </Button>
                          )}
                          {(currentValue.trim() || defaultValue) && isImg && (
                            <a
                              href={currentValue.trim() || defaultValue}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="h-7 w-7 p-0 flex items-center justify-center text-slate-400 hover:text-slate-700"
                              title="פתח בכרטיסייה חדשה"
                            >
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>

                      <Input
                        value={currentValue}
                        onChange={(e) => handleChange(key, e.target.value)}
                        placeholder={defaultValue}
                        disabled={loading || saving || isUploading}
                        className={`text-xs ${hasOverride ? 'border-slate-300 bg-slate-50/30' : ''}`}
                        dir="ltr"
                      />

                      {!hasOverride && (
                        <div className="text-[10px] font-bold text-slate-400 truncate" dir="ltr">
                          ברירת מחדל: {defaultValue}
                        </div>
                      )}

                      {/* Image preview */}
                      {isImg && (currentValue.trim() || defaultValue) && (
                        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-2 relative group">
                          <img
                            src={currentValue.trim() || defaultValue}
                            alt={meta?.label || key}
                            className="max-h-24 max-w-full object-contain mx-auto rounded-lg transition-transform group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
