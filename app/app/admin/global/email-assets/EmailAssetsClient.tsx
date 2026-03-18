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
  
    // Check if keys are different
    const dbKeys = Object.keys(dbOverrides).sort();
    const editKeys = Object.keys(cleanedEdit).sort();
  
    if (dbKeys.length !== editKeys.length) return true;
  
    // Check each key's value
    for (const key of editKeys) {
      if (!dbOverrides.hasOwnProperty(key)) return true; // New key added
      if (dbOverrides[key] !== cleanedEdit[key]) return true; // Value changed
    }
  
    // Check if any key was removed
    for (const key of dbKeys) {
      if (!cleanedEdit.hasOwnProperty(key)) return true; // Key removed
    }
  
    return false;
  }, [editState, dbOverrides]);

  const overrideCount = Object.keys(dbOverrides).length;

  return (
    <div className="flex flex-col lg:flex-row gap-6 pb-24" dir="rtl">
      {/* Sidebar */}
      <div className="w-full lg:w-64 shrink-0 space-y-2">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm sticky top-24">
          <div className="text-xs font-black text-slate-400 uppercase tracking-wider px-2 mb-3">קטגוריות</div>
          <div className="space-y-1">
            {categoryOrder.map((cat) => {
              const count = categories[cat]?.length || 0;
              if (count === 0) return null;
              
              const isActive = false; // We can add active state if we want scroll spy later
              return (
                <button
                  key={cat}
                  onClick={() => document.getElementById(`cat-${cat}`)?.scrollIntoView({ behavior: 'smooth' })}
                  className="w-full text-right px-3 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex justify-between items-center group"
                >
                  <span>{cat}</span>
                  <span className="bg-slate-100 text-slate-500 text-[10px] px-1.5 py-0.5 rounded-md group-hover:bg-slate-200 transition-colors">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100">
             <Button onClick={save} disabled={loading || saving || !hasChanges} className="w-full font-bold">
                {saving ? <Loader2 size={16} className="animate-spin ml-2" /> : <Save size={16} className="ml-2" />}
                {saving ? 'שומר...' : 'שמור שינויים'}
             </Button>
             {!hasChanges && (
               <p className="text-[10px] text-center text-slate-400 mt-2">אין שינויים לשמירה</p>
             )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                 <Image size={24} />
              </div>
              <div>
                 <h1 className="text-xl font-black text-slate-900">ניהול נכסי אימייל</h1>
                 <p className="text-sm text-slate-500">הגדרת תמונות, לוגואים ובאנרים לכל המיילים במערכת.</p>
              </div>
           </div>
        </div>

        {categoryOrder.map((cat) => {
          const keys = categories[cat];
          if (!keys || keys.length === 0) return null;

          const isCollapsed = collapsedCategories[cat];
          const catOverrides = keys.filter((k) => editState[k]?.trim()).length;

          return (
            <div
              id={`cat-${cat}`}
              key={cat}
              className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24"
            >
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="text-base font-black text-slate-900">{cat}</div>
                  {catOverrides > 0 && (
                    <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                      {catOverrides} מותאמים
                    </div>
                  )}
                </div>
                {isCollapsed ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronUp size={18} className="text-slate-400" />}
              </button>

              {!isCollapsed && (
                <div className="px-5 pb-5 space-y-4 border-t border-slate-50 pt-5">
                  {keys.map((key) => {
                    const meta = EMAIL_ASSET_LABELS[key];
                    const currentValue = editState[key] || '';
                    const defaultValue = (defaults as Record<string, string>)[key] || '';
                    const hasOverride = Boolean(currentValue.trim());
                    const isImg = isImageKey(key);
                    const isUploading = uploadingKey === key;

                    return (
                      <div key={key} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/30">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{meta?.label || key}</div>
                              <div className="text-xs text-slate-500 mt-0.5 font-mono">{key}</div>
                              {meta?.hint && <div className="text-xs text-slate-400 mt-1">{meta.hint}</div>}
                            </div>
                            <div className="flex items-center gap-1">
                              {isImg && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUploadClick(key)}
                                  disabled={loading || saving || isUploading}
                                  className="h-8 w-8 bg-white"
                                  title="העלאת קובץ"
                                >
                                  {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                </Button>
                              )}
                              {hasOverride && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleClear(key)}
                                  disabled={isUploading}
                                  className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  title="מחק ערך"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              )}
                              {(currentValue.trim() || defaultValue) && isImg && (
                                <a
                                  href={currentValue.trim() || defaultValue}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                  title="פתח קישור"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <Input
                              value={currentValue}
                              onChange={(e) => handleChange(key, e.target.value)}
                              placeholder={defaultValue || 'ערך ברירת מחדל...'}
                              disabled={loading || saving || isUploading}
                              className={`h-9 text-xs font-mono ${hasOverride ? 'bg-white border-indigo-200 focus:border-indigo-500' : 'bg-slate-50 border-transparent'}`}
                              dir="ltr"
                            />
                            {!hasOverride && defaultValue && (
                              <div className="text-[10px] text-slate-400 px-1" dir="ltr">
                                Default: {defaultValue}
                              </div>
                            )}
                          </div>
                        </div>

                        {isImg && (currentValue.trim() || defaultValue) && (
                          <div className="w-32 shrink-0">
                            <div className="aspect-video rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden">
                              <img
                                src={currentValue.trim() || defaultValue}
                                alt={meta?.label || key}
                                className="max-w-full max-h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
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
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
