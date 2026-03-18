'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { RefreshCw, Save, Image, Trash2, ExternalLink, ChevronDown, ChevronUp, Upload, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useData } from '@/context/DataContext';
import { adminGetEmailAssets, adminUpdateEmailAssets, adminSetEmailAssetUrl } from '@/app/actions/admin-email-assets';
import { EMAIL_ASSET_LABELS } from '@/lib/email-asset-labels';
import { getErrorMessage } from '@/lib/shared/unknown';
import {
  compressForEmailAsset,
  compressionResultToFile,
  formatFileSize,
  validateImageFile,
  createPreviewUrl,
  revokePreviewUrl,
  type CompressionProgress,
} from '@/lib/client/image-compressor';

type AssetsState = Record<string, string>;

type UploadPhase = 'idle' | 'validating' | 'compressing' | 'uploading' | 'success' | 'error';

interface UploadState {
  phase: UploadPhase;
  progress: number;
  message: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: number;
}

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
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  
  // Upload state per key for progress tracking
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>({});
  
  // Preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);

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

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) revokePreviewUrl(previewUrl);
    };
  }, [previewUrl]);

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

  const setUploadState = (key: string, state: UploadState) => {
    setUploadStates((prev) => ({ ...prev, [key]: state }));
  };

  const handleUploadClick = (key: string) => {
    activeUploadKeyRef.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const key = activeUploadKeyRef.current;
    if (!file || !key) return;

    // Cleanup previous preview
    if (previewUrl) {
      revokePreviewUrl(previewUrl);
      setPreviewUrl(null);
    }

    // Step 1: Validation
    setUploadState(key, {
      phase: 'validating',
      progress: 10,
      message: 'בודק קובץ...',
    });

    const validationError = validateImageFile(file);
    if (validationError) {
      setUploadState(key, {
        phase: 'error',
        progress: 0,
        message: validationError,
      });
      addToast(validationError, 'error');
      // Reset after delay
      setTimeout(() => setUploadState(key, { phase: 'idle', progress: 0, message: '' }), 3000);
      if (fileInputRef.current) fileInputRef.current.value = '';
      activeUploadKeyRef.current = null;
      return;
    }

    try {
      // Create preview immediately
      const preview = createPreviewUrl(file);
      setPreviewUrl(preview);
      setPreviewKey(key);

      // Step 2: Compression
      setUploadState(key, {
        phase: 'compressing',
        progress: 20,
        message: `מכוון תמונה... (${formatFileSize(file.size)})`,
        originalSize: file.size,
      });

      const onCompressionProgress = (progress: CompressionProgress) => {
        const baseProgress = 20 + (progress.progress * 0.4); // 20-60%
        setUploadStates((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            phase: 'compressing',
            progress: Math.round(baseProgress),
            message: progress.message,
          }
        }));
      };

      const compressionResult = await compressForEmailAsset(file, onCompressionProgress);
      const compressedFile = compressionResultToFile(compressionResult, `${key}-optimized.jpg`);

      setUploadState(key, {
        phase: 'compressing',
        progress: 60,
        message: `דחיסה: ${formatFileSize(file.size)} → ${formatFileSize(compressionResult.compressedSize)}`,
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      // Small delay to show compression result
      await new Promise(resolve => setTimeout(resolve, 300));

      // Step 3: Get signed URL and upload directly to Supabase
      setUploadState(key, {
        phase: 'uploading',
        progress: 60,
        message: 'מתחבר לאחסון...',
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      // Request signed upload URL from API
      setUploadState(key, {
        phase: 'uploading',
        progress: 65,
        message: 'מבקש הרשאת העלאה...',
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      console.log('[EmailAssets] Requesting upload URL for key:', key, 'fileType:', compressedFile.type, 'size:', compressedFile.size);
      
      const signedUrlRes = await fetch('/api/admin/email-assets/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key,
          fileType: compressedFile.type,
          fileSize: compressedFile.size,
        }),
      });

      console.log('[EmailAssets] Upload URL response status:', signedUrlRes.status);
      
      if (!signedUrlRes.ok) {
        const errorText = await signedUrlRes.text();
        console.error('[EmailAssets] Upload URL request failed:', signedUrlRes.status, errorText);
        throw new Error(`שגיאת שרת ${signedUrlRes.status}: ${errorText || 'לא ניתן ליצור קישור העלאה'}`);
      }

      const signedUrlData = await signedUrlRes.json();
      console.log('[EmailAssets] Upload URL data:', signedUrlData);

      if (!signedUrlData.success) {
        throw new Error(signedUrlData.error || 'שגיאה ביצירת קישור העלאה');
      }

      const { signedUrl, path, publicUrl } = signedUrlData.data;
      
      if (!signedUrl || !publicUrl) {
        console.error('[EmailAssets] Missing signedUrl or publicUrl in response:', signedUrlData.data);
        throw new Error('תשובה לא תקינה מהשרת - חסרים נתוני העלאה');
      }

      // Upload directly to Supabase (bypasses Vercel body size limit)
      setUploadState(key, {
        phase: 'uploading',
        progress: 75,
        message: 'מעלה לאחסון...',
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: compressedFile,
        headers: { 
          'Content-Type': compressedFile.type,
        },
      });

      console.log('[EmailAssets] Supabase upload response status:', uploadRes.status);
      
      if (!uploadRes.ok) {
        const uploadError = await uploadRes.text();
        console.error('[EmailAssets] Direct upload error details:', uploadRes.status, uploadError);
        
        // Better error messages based on status codes
        let errorMessage = `שגיאת העלאה: ${uploadRes.status}`;
        if (uploadRes.status === 401 || uploadRes.status === 403) {
          errorMessage = 'הקישור להעלאה פג תוקף או אין הרשאה. נסה שוב.';
        } else if (uploadRes.status === 413) {
          errorMessage = 'הקובץ גדול מדי גם אחרי דחיסה. נסה תמונה קטנה יותר.';
        } else if (uploadRes.status >= 500) {
          errorMessage = 'שגיאת שרת אחסון. נסה שוב בעוד מספר דקות.';
        }
        
        throw new Error(errorMessage);
      }
      
      console.log('[EmailAssets] Upload to Supabase successful');

      // Update DB with the new URL
      setUploadState(key, {
        phase: 'uploading',
        progress: 90,
        message: 'משמר בבסיס נתונים...',
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      const dbRes = await adminSetEmailAssetUrl(key, publicUrl);

      if (!dbRes.success) {
        throw new Error(dbRes.error || 'שגיאה בשמירה');
      }

      // Step 4: Success
      setUploadState(key, {
        phase: 'success',
        progress: 100,
        message: `הושלם! חסכת ${formatFileSize(file.size - compressionResult.compressedSize)}`,
        originalSize: file.size,
        compressedSize: compressionResult.compressedSize,
        compressionRatio: compressionResult.compressionRatio,
      });

      handleChange(key, publicUrl);
      setDbOverrides((prev) => ({ ...prev, [key]: publicUrl }));
      
      const savedBytes = file.size - compressionResult.compressedSize;
      addToast(
        `התמונה הועלתה בהצלחה! חסכת ${formatFileSize(savedBytes)} (${Math.round((1 - compressionResult.compressionRatio) * 100)}% דחיסה)`,
        'success'
      );

      // Reset state after delay
      setTimeout(() => {
        setUploadState(key, { phase: 'idle', progress: 0, message: '' });
        setPreviewUrl((prev) => {
          if (prev) revokePreviewUrl(prev);
          return null;
        });
        setPreviewKey(null);
      }, 3000);

    } catch (err) {
      const errorMsg = getErrorMessage(err) || 'שגיאה בהעלאת הקובץ';
      
      // Check for 413 specifically
      const isTooLarge = errorMsg.includes('413') || 
                         errorMsg.includes('Content Too Large') ||
                         errorMsg.includes('large');
      
      const userMessage = isTooLarge
        ? 'הקובץ עדיין גדול מדי גם אחרי דחיסה. נסה תמונה קטנה יותר.'
        : errorMsg;

      setUploadState(key, {
        phase: 'error',
        progress: 0,
        message: userMessage,
      });
      
      addToast(userMessage, 'error');

      // Reset after delay
      setTimeout(() => {
        setUploadState(key, { phase: 'idle', progress: 0, message: '' });
      }, 4000);
    } finally {
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

    for (const key of editKeys) {
      if (!dbOverrides.hasOwnProperty(key)) return true;
      if (dbOverrides[key] !== cleanedEdit[key]) return true;
    }

    for (const key of dbKeys) {
      if (!cleanedEdit.hasOwnProperty(key)) return true;
    }

    return false;
  }, [editState, dbOverrides]);

  const overrideCount = Object.keys(dbOverrides).length;

  // Render upload status badge
  const renderUploadStatus = (key: string) => {
    const state = uploadStates[key];
    if (!state || state.phase === 'idle') return null;

    const iconMap: Record<UploadPhase, React.ReactNode> = {
      idle: null,
      validating: <Loader2 size={12} className="animate-spin" />,
      compressing: <Loader2 size={12} className="animate-spin" />,
      uploading: <Loader2 size={12} className="animate-spin" />,
      success: <Check size={12} className="text-emerald-600" />,
      error: <AlertCircle size={12} className="text-rose-600" />,
    };

    const colorMap: Record<UploadPhase, string> = {
      idle: '',
      validating: 'bg-amber-50 text-amber-700 border-amber-200',
      compressing: 'bg-blue-50 text-blue-700 border-blue-200',
      uploading: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      error: 'bg-rose-50 text-rose-700 border-rose-200',
    };

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold ${colorMap[state.phase]}`}>
        {iconMap[state.phase]}
        <span>{state.message}</span>
        {state.progress > 0 && state.phase !== 'success' && state.phase !== 'error' && (
          <span className="opacity-60">({state.progress}%)</span>
        )}
      </div>
    );
  };

  // Calculate savings across all uploads
  const totalSavings = useMemo(() => {
    let saved = 0;
    for (const state of Object.values(uploadStates)) {
      if (state.originalSize && state.compressedSize) {
        saved += state.originalSize - state.compressedSize;
      }
    }
    return saved;
  }, [uploadStates]);

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

          <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
            <Button onClick={save} disabled={loading || saving || !hasChanges} className="w-full font-bold">
              {saving ? <Loader2 size={16} className="animate-spin ml-2" /> : <Save size={16} className="ml-2" />}
              {saving ? 'שומר...' : 'שמור שינויים'}
            </Button>
            {!hasChanges && (
              <p className="text-[10px] text-center text-slate-400">אין שינויים לשמירה</p>
            )}
            
            {/* Compression Stats */}
            {totalSavings > 0 && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2 text-center">
                <div className="text-[10px] text-emerald-600 font-bold">
                  חסכת {formatFileSize(totalSavings)} ברוחב פס!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Header with Info */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
              <Image size={24} />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-black text-slate-900">ניהול נכסי אימייל</h1>
              <p className="text-sm text-slate-500 mt-1">
                הגדרת תמונות, לוגואים ובאנרים לכל המיילים במערכת.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-md">
                  ✨ דחיסה אוטומטית - אפשר להעלות תמונות גדולות
                </span>
                <span className="inline-flex items-center px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                  🖼️ מקסימום 800px - מותאם למיילים
                </span>
                <span className="inline-flex items-center px-2 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-md">
                  📦 מקסימום גודל סופי: 1.5MB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Preview Modal */}
        {previewUrl && previewKey && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-indigo-900">תצוגה מקדימה - {EMAIL_ASSET_LABELS[previewKey]?.label || previewKey}</div>
              <button
                onClick={() => {
                  if (previewUrl) revokePreviewUrl(previewUrl);
                  setPreviewUrl(null);
                  setPreviewKey(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex gap-4">
              <div className="w-48 h-32 rounded-lg overflow-hidden border border-indigo-200 bg-white flex items-center justify-center">
                <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 space-y-2">
                {uploadStates[previewKey]?.originalSize && (
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">לפני:</span> {formatFileSize(uploadStates[previewKey].originalSize!)}
                  </div>
                )}
                {uploadStates[previewKey]?.compressedSize && (
                  <div className="text-sm text-slate-600">
                    <span className="font-bold">אחרי:</span> {formatFileSize(uploadStates[previewKey].compressedSize!)}</div>
                )}
                {uploadStates[previewKey]?.compressionRatio && uploadStates[previewKey].compressionRatio! < 1 && (
                  <div className="text-sm font-bold text-emerald-600">
                    חיסכון: {Math.round((1 - uploadStates[previewKey].compressionRatio!) * 100)}%
                  </div>
                )}
                {uploadStates[previewKey]?.phase === 'compressing' && (
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadStates[previewKey].progress}%` }}
                    />
                  </div>
                )}
                {uploadStates[previewKey]?.phase === 'uploading' && (
                  <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadStates[previewKey].progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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
                    const uploadState = uploadStates[key];
                    const isProcessing = uploadState?.phase === 'compressing' || uploadState?.phase === 'uploading';

                    return (
                      <div key={key} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all bg-slate-50/30">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-slate-900">{meta?.label || key}</div>
                                {renderUploadStatus(key)}
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5 font-mono">{key}</div>
                              {meta?.hint && <div className="text-xs text-slate-400 mt-1">{meta.hint}</div>}
                            </div>
                            <div className="flex items-center gap-1">
                              {isImg && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleUploadClick(key)}
                                  disabled={loading || saving || isProcessing}
                                  className="h-8 w-8 bg-white relative"
                                  title="העלאת קובץ (עם דחיסה אוטומטית)"
                                >
                                  {isProcessing ? (
                                    <Loader2 size={14} className="animate-spin" />
                                  ) : uploadState?.phase === 'success' ? (
                                    <Check size={14} className="text-emerald-600" />
                                  ) : (
                                    <Upload size={14} />
                                  )}
                                </Button>
                              )}
                              {hasOverride && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleClear(key)}
                                  disabled={isProcessing}
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
                              disabled={loading || saving || isProcessing}
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
        accept="image/jpeg,image/png,image/webp,image/gif,image/jpg"
      />
    </div>
  );
}
