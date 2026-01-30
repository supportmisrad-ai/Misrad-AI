'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  getModuleIcons,
  getSystemEmailSettings,
  updateFeatureFlags,
  updateModuleIcons,
  updateSystemEmailSettings,
} from '@/app/actions/admin-cockpit';
import { modulesRegistry } from '@/lib/os/modules/registry';
import type { OSModuleKey } from '@/lib/os/modules/types';
import { DynamicIcon } from '@/components/shared/DynamicIcon';
import { Button } from '@/components/ui/button';

interface FlagsTabProps {
  featureFlags: any;
  setFeatureFlags: (flags: any) => void;
  onRefresh: () => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function FlagsTab({ featureFlags, setFeatureFlags, onRefresh, addToast }: FlagsTabProps) {
  const [moduleIcons, setModuleIcons] = React.useState<Partial<Record<OSModuleKey, string>>>({});
  const [isLoadingIcons, setIsLoadingIcons] = React.useState(false);
  const [isSavingIcons, setIsSavingIcons] = React.useState(false);

  const [systemSupportEmail, setSystemSupportEmail] = React.useState('');
  const [systemMigrationEmail, setSystemMigrationEmail] = React.useState('');
  const [isLoadingSystemEmails, setIsLoadingSystemEmails] = React.useState(false);
  const [isSavingSystemEmails, setIsSavingSystemEmails] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingIcons(true);
      try {
        const res = await getModuleIcons();
        if (cancelled) return;
        if (res.success && res.data && typeof res.data === 'object') {
          setModuleIcons(res.data as any);
        }
      } finally {
        if (!cancelled) setIsLoadingIcons(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoadingSystemEmails(true);
      try {
        const res = await getSystemEmailSettings();
        if (cancelled) return;
        if (res.success && res.data) {
          setSystemSupportEmail(String(res.data.supportEmail || ''));
          setSystemMigrationEmail(String(res.data.migrationEmail || ''));
        }
      } finally {
        if (!cancelled) setIsLoadingSystemEmails(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const moduleRows = React.useMemo(() => {
    const keys = Object.keys(modulesRegistry) as OSModuleKey[];
    return keys.map((key) => {
      const def = modulesRegistry[key];
      const value = String(moduleIcons?.[key] || '');
      const effective = value || def.iconName;
      return {
        key,
        label: def.label,
        labelHe: def.labelHe,
        defaultIconName: def.iconName,
        iconName: value,
        effectiveIconName: effective,
      };
    });
  }, [moduleIcons]);

  return (
    <motion.div key="flags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8 w-full">
      <div className="bg-white/90 backdrop-blur-sm border border-indigo-100 rounded-3xl overflow-hidden w-full shadow-md">
        <div className="p-10 border-b border-indigo-100 flex justify-between items-center bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">הגדרות מערכת</h3>
            <p className="text-sm text-slate-600">שליטה במערכת בלי לגעת בקוד</p>
          </div>
        </div>
        <div className="p-10 flex flex-col gap-8">
          <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-xl border border-emerald-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">אפשר תשלום ידני (Bit/העברה)</h4>
              <p className="text-sm text-slate-600">כאשר פעיל, הלקוח רואה הוראות תשלום ידני ב-Checkout</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.enable_payment_manual !== false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ enable_payment_manual: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'תשלום ידני הופעל' : 'תשלום ידני בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 bg-amber-50 rounded-xl border border-amber-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">אפשר תשלום באשראי (Yaad Pay)</h4>
              <p className="text-sm text-slate-600">כאשר פעיל, הלקוח יראה אופציה לאשראי ב-Checkout (כרגע Placeholder)</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.enable_payment_credit_card || false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ enable_payment_credit_card: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'אשראי הופעל (Placeholder)' : 'אשראי בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <h4 className="font-black text-slate-900 mb-1">משרד מלא כולל פיננס</h4>
              <p className="text-sm text-slate-600">כאשר פעיל, "משרד מלא" ידרוש גם מודול פיננס כדי להפעיל צוות</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.fullOfficeRequiresFinance || false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ fullOfficeRequiresFinance: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'משרד מלא עודכן לכולל פיננס' : 'משרד מלא עודכן ללא פיננס', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">מצב תחזוקה (Maintenance Mode)</h4>
              <p className="text-sm text-slate-600">כפתור שמוריד את האתר ומציג הודעת "משדרגים" לכולם</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.maintenanceMode || false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ maintenanceMode: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'מצב תחזוקה הופעל' : 'מצב תחזוקה בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-6 bg-purple-50 rounded-xl border border-purple-100">
            <div>
              <h4 className="font-black text-slate-900 mb-1">הפעל AI (Toggle AI)</h4>
              <p className="text-sm text-slate-600">אם נגמר התקציב ב-Gemini או שיש באג, אתה מכבה את ה-AI לכולם</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={featureFlags?.aiEnabled !== false}
                onChange={async (e) => {
                  const result = await updateFeatureFlags({ aiEnabled: e.target.checked });
                  if (result.success) {
                    addToast(e.target.checked ? 'AI הופעל' : 'AI בוטל', 'success');
                    onRefresh();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
            <h4 className="font-black text-slate-900 mb-4">הודעה מתפרצת (Banner)</h4>
            <p className="text-sm text-slate-600 mb-4">שדה טקסט שבו אתה כותב הודעה שמופיעה לכל המשתמשים בראש המסך</p>
            <textarea
              value={featureFlags?.bannerMessage || ''}
              onChange={(e) => {
                setFeatureFlags((prev: any) => ({ ...prev, bannerMessage: e.target.value }));
              }}
              onBlur={async (e) => {
                const result = await updateFeatureFlags({ bannerMessage: e.target.value || null });
                if (result.success) {
                  addToast('הודעה עודכנה', 'success');
                }
              }}
              placeholder="לדוגמה: שימו לב! פיצ'ר חדש עלה..."
              className="w-full p-4 bg-white border border-blue-200 rounded-xl text-slate-900 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 resize-none"
              rows={3}
            />
            <Button
              onClick={async () => {
                const result = await updateFeatureFlags({ bannerMessage: null });
                if (result.success) {
                  addToast('הודעה נמחקה', 'success');
                  onRefresh();
                }
              }}
              variant="destructive"
              size="sm"
              className="mt-4"
            >
              מחק הודעה
            </Button>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-black text-slate-900 mb-1">אייקונים של מודולים</h4>
                <p className="text-sm text-slate-600">שם אייקון מ-lucide-react (לדוגמה: Target, Sparkles). ריק = ברירת מחדל מה-Registry.</p>
              </div>
              <Button
                disabled={isSavingIcons || isLoadingIcons}
                onClick={async () => {
                  setIsSavingIcons(true);
                  try {
                    const result = await updateModuleIcons({ moduleIcons });
                    if (result.success) {
                      addToast('אייקונים עודכנו', 'success');
                      try {
                        window.dispatchEvent(new CustomEvent('os:module-icons-updated'));
                        const bc = 'BroadcastChannel' in window ? new BroadcastChannel('os-module-icons') : null;
                        bc?.postMessage({ type: 'updated' });
                        bc?.close();
                      } catch {
                        // ignore
                      }
                      onRefresh();
                    } else {
                      addToast('שגיאה בעדכון אייקונים', 'error');
                    }
                  } finally {
                    setIsSavingIcons(false);
                  }
                }}
                type="button"
                size="sm"
              >
                שמור אייקונים
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moduleRows.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      {(() => {
                        const iconName = String(row.effectiveIconName || '').trim();
                        if (!iconName) return null;
                        const isAssetIcon =
                          iconName.startsWith('/') ||
                          iconName.startsWith('http://') ||
                          iconName.startsWith('https://');
                        if (isAssetIcon) {
                          return (
                            <img
                              src={iconName}
                              alt=""
                              width={20}
                              height={20}
                              className="w-5 h-5 object-contain"
                              draggable={false}
                            />
                          );
                        }
                        return <DynamicIcon name={iconName} size={20} className="text-slate-900" />;
                      })()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{row.labelHe}</div>
                      <div className="text-[11px] text-slate-500 font-bold truncate">{row.key} · default: {row.defaultIconName}</div>
                    </div>
                  </div>

                  <input
                    value={row.iconName}
                    onChange={(e) => {
                      const v = String(e.target.value || '').trim();
                      setModuleIcons((prev) => ({ ...prev, [row.key]: v }));
                    }}
                    placeholder={row.defaultIconName}
                    className="w-44 max-w-[45%] px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-black text-slate-900 mb-1">אימיילים מערכתיים</h4>
                <p className="text-sm text-slate-600">ניהול כתובות מייל לשימושים מערכתיים (Support / Migration)</p>
              </div>
              <Button
                disabled={isSavingSystemEmails || isLoadingSystemEmails}
                onClick={async () => {
                  setIsSavingSystemEmails(true);
                  try {
                    const result = await updateSystemEmailSettings({
                      supportEmail: systemSupportEmail.trim() || null,
                      migrationEmail: systemMigrationEmail.trim() || null,
                    });
                    if (result.success) {
                      addToast('אימיילים מערכתיים עודכנו', 'success');
                      onRefresh();
                    } else {
                      addToast(result.error || 'שגיאה בעדכון אימיילים', 'error');
                    }
                  } finally {
                    setIsSavingSystemEmails(false);
                  }
                }}
                type="button"
                size="sm"
              >
                שמור אימיילים
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 font-black mb-2">Support Email</div>
                <input
                  value={systemSupportEmail}
                  onChange={(e) => setSystemSupportEmail(e.target.value)}
                  placeholder="support@yourdomain.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
                <div className="mt-2 text-[11px] text-slate-500 font-bold">
                  משמש ללינקי mailto במיילים ובהודעות.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 font-black mb-2">Migration Email</div>
                <input
                  value={systemMigrationEmail}
                  onChange={(e) => setSystemMigrationEmail(e.target.value)}
                  placeholder="migration@yourdomain.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-slate-300"
                />
                <div className="mt-2 text-[11px] text-slate-500 font-bold">
                  מוצג במייל הברוכים הבאים (MISRAD) להזמנת מיגרציה.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

