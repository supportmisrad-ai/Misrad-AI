'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CircleCheckBig } from 'lucide-react';
import { getFeatureFlags, updateFeatureFlags } from '@/app/actions/admin-cockpit';
import { OSModuleKey } from '@/lib/os/modules/types';
import { modulesRegistry } from '@/lib/os/modules/registry';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';

type FeatureFlags = {
  maintenanceMode: boolean;
  aiEnabled: boolean;
  bannerMessage: string | null;
  fullOfficeRequiresFinance: boolean;
  enable_payment_manual: boolean;
  enable_payment_credit_card: boolean;
  launch_scope_modules: Record<OSModuleKey, boolean>;
};

export default function FeatureFlagsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await getFeatureFlags();
      if (res.success && res.data) {
        setFlags(res.data);
      } else {
        setStatus({ type: 'error', message: res.error || 'שגיאה בטעינת הגדרות' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'שגיאה בטעינת הגדרות' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!flags) return;
    
    setSaving(true);
    setStatus(null);
    
    try {
      const res = await updateFeatureFlags(flags);
      if (res.success) {
        setStatus({ type: 'success', message: 'הגדרות נשמרו בהצלחה' });
        setTimeout(() => setStatus(null), 3000);
      } else {
        setStatus({ type: 'error', message: res.error || 'שגיאה בשמירת הגדרות' });
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'שגיאה בשמירת הגדרות' });
    } finally {
      setSaving(false);
    }
  };

  const toggleModule = (module: OSModuleKey) => {
    if (!flags) return;
    setFlags({
      ...flags,
      launch_scope_modules: {
        ...flags.launch_scope_modules,
        [module]: !flags.launch_scope_modules[module],
      },
    });
  };

  const enableAllModules = () => {
    if (!flags) return;
    const allEnabled: Record<OSModuleKey, boolean> = {
      nexus: true,
      system: true,
      social: true,
      finance: true,
      client: true,
      operations: true,
    };
    setFlags({
      ...flags,
      launch_scope_modules: allEnabled,
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="הגדרות מתקדמות" subtitle="ניהול מודולים ותכונות מערכת" icon={Settings} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-slate-700" size={32} />
        </div>
      </div>
    );
  }

  if (!flags) {
    return (
      <div className="space-y-6 pb-24" dir="rtl">
        <AdminPageHeader title="הגדרות מתקדמות" subtitle="ניהול מודולים ותכונות מערכת" icon={Settings} />
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="text-red-900 font-bold">שגיאה בטעינת הגדרות</div>
          <button onClick={loadFlags} className="mt-4 text-sm text-red-700 underline">
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  const moduleKeys: OSModuleKey[] = ['nexus', 'system', 'social', 'finance', 'client', 'operations'];
  const enabledCount = moduleKeys.filter((k) => flags.launch_scope_modules[k]).length;

  return (
    <div className="space-y-6 pb-24" dir="rtl">
      <AdminPageHeader title="הגדרות מתקדמות" subtitle="ניהול מודולים ותכונות מערכת" icon={Settings} />

      {status ? (
        <div
          className={`rounded-2xl p-4 border ${
            status.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            {status.type === 'success' ? <CircleCheckBig size={18} /> : null}
            {status.message}
          </div>
        </div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between sm:justify-start gap-3">
                <h3 className="text-base sm:text-lg font-black text-slate-900">מודולים זמינים במערכת</h3>
                <div className="text-left sm:hidden shrink-0">
                  <div className="text-xl font-black text-slate-900">{enabledCount}/6</div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                קבע אילו מודולים זמינים לכל הארגונים. מודולים שמכובים כאן לא יופיעו בכלל במערכת.
              </p>
              <p className="text-xs text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ <strong>חשוב:</strong> זה משפיע על כל המערכת גלובלית. ארגונים יראו רק מודולים שמופעלים כאן וגם כלולים בחבילה שלהם.
              </p>
            </div>
            <div className="text-left hidden sm:block shrink-0">
              <div className="text-2xl font-black text-slate-900">{enabledCount}/6</div>
              <div className="text-xs text-slate-500">מופעלים</div>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <Button onClick={enableAllModules} variant="outline" size="sm">
              הפעל הכל
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduleKeys.map((moduleKey) => {
              const def = modulesRegistry[moduleKey];
              const enabled = flags.launch_scope_modules[moduleKey];

              return (
                <button
                  key={moduleKey}
                  type="button"
                  onClick={() => toggleModule(moduleKey)}
                  className={`relative p-4 rounded-2xl border-2 transition-all text-right ${
                    enabled
                      ? 'border-slate-400 bg-slate-50'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div
                    className="absolute inset-0 rounded-2xl opacity-20"
                    style={{
                      background: enabled
                        ? `radial-gradient(circle at 30% 20%, ${def.theme.accent}, transparent 70%)`
                        : 'none',
                    }}
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-black text-slate-900">{def.label}</div>
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          enabled
                            ? 'bg-slate-900 border-slate-900'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {enabled ? <CircleCheckBig size={14} className="text-white" /> : null}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">{def.labelHe}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-black text-slate-900 mb-4">הגדרות נוספות</h3>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-sm font-black text-slate-900">מצב תחזוקה</div>
                <div className="text-xs text-slate-600">חסום גישה למערכת</div>
              </div>
              <input
                type="checkbox"
                checked={flags.maintenanceMode}
                onChange={(e) => setFlags({ ...flags, maintenanceMode: e.target.checked })}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-sm font-black text-slate-900">AI מופעל</div>
                <div className="text-xs text-slate-600">אפשר שימוש בבינה מלאכותית</div>
              </div>
              <input
                type="checkbox"
                checked={flags.aiEnabled}
                onChange={(e) => setFlags({ ...flags, aiEnabled: e.target.checked })}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-sm font-black text-slate-900">תשלום ידני</div>
                <div className="text-xs text-slate-600">אפשר תשלום ידני</div>
              </div>
              <input
                type="checkbox"
                checked={flags.enable_payment_manual}
                onChange={(e) => setFlags({ ...flags, enable_payment_manual: e.target.checked })}
                className="w-5 h-5"
              />
            </label>

            <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer">
              <div>
                <div className="text-sm font-black text-slate-900">תשלום בכרטיס אשראי</div>
                <div className="text-xs text-slate-600">אפשר תשלום בכרטיס</div>
              </div>
              <input
                type="checkbox"
                checked={flags.enable_payment_credit_card}
                onChange={(e) => setFlags({ ...flags, enable_payment_credit_card: e.target.checked })}
                className="w-5 h-5"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleSave} disabled={saving} className="flex-1">
          {saving ? (
            <>
              <Loader2 className="animate-spin" size={16} />
              שומר...
            </>
          ) : (
            <>
              <Save size={16} />
              שמור הגדרות
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
