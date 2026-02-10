'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Save } from 'lucide-react';
import { getSubscriptionPaymentConfigs, upsertSubscriptionPaymentConfig } from '@/app/actions/subscription-payment-configs';
import { useData } from '@/context/DataContext';
import { Button } from '@/components/ui/button';

type PackageKey = 'solo' | 'the_closer' | 'the_authority' | 'the_operator' | 'the_empire';

type ConfigState = {
  title: string;
  qrImageUrl: string;
  instructionsText: string;
  paymentMethod: 'manual' | 'automatic';
  externalPaymentUrl: string;
};

const PACKAGE_LABELS: Record<PackageKey, { title: string; subtitle: string }> = {
  solo: { title: 'מודול בודד', subtitle: 'תשלום עבור מודול בודד (149 ₪)' },
  the_closer: { title: 'חבילת מכירות', subtitle: 'System + Nexus (249 ₪)' },
  the_authority: { title: 'חבילת שיווק ומיתוג', subtitle: 'Social + Client + Nexus (349 ₪)' },
  the_operator: { title: 'חבילת תפעול ושטח', subtitle: 'Operations + Nexus (349 ₪) + Finance בונוס' },
  the_empire: { title: 'הכל כלול', subtitle: 'כל המודולים + Finance בונוס (499 ₪)' },
};

export function LandingPaymentLinksPanel({ hideHeader }: { hideHeader?: boolean }) {
  const { addToast } = useData();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<PackageKey, ConfigState>>({
    solo: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_closer: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_authority: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_operator: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
    the_empire: { title: '', qrImageUrl: '', instructionsText: '', paymentMethod: 'manual', externalPaymentUrl: '' },
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await getSubscriptionPaymentConfigs();
        if (res.success && res.data) {
          setConfigs((prev) => {
            const next = { ...prev };
            for (const row of res.data || []) {
              const key = String((row as any).package_type) as PackageKey;
              if (!(key in next)) continue;
              next[key] = {
                title: String((row as any).title || ''),
                qrImageUrl: String((row as any).qr_image_url || ''),
                instructionsText: String((row as any).instructions_text || ''),
                paymentMethod:
                  String((row as any).payment_method || 'manual') === 'automatic' ? 'automatic' : 'manual',
                externalPaymentUrl: String((row as any).external_payment_url || ''),
              };
            }
            return next;
          });
        }
      } catch {
        addToast('שגיאה בטעינת הגדרות תשלום', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [addToast]);

  const update = (pkg: PackageKey, patch: Partial<ConfigState>) => {
    setConfigs((prev) => ({
      ...prev,
      [pkg]: {
        ...prev[pkg],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const packages: PackageKey[] = ['solo', 'the_closer', 'the_authority', 'the_operator', 'the_empire'];
      for (const pkg of packages) {
        const cfg = configs[pkg];
        const result = await upsertSubscriptionPaymentConfig({
          packageType: pkg as any,
          title: cfg.title,
          qrImageUrl: cfg.qrImageUrl,
          instructionsText: cfg.instructionsText,
          paymentMethod: cfg.paymentMethod,
          externalPaymentUrl: cfg.externalPaymentUrl,
        });
        if (!result.success) {
          throw new Error(result.error || 'שגיאה בשמירת הגדרות תשלום');
        }
      }
      addToast('הגדרות תשלום נשמרו', 'success');
    } catch (e: any) {
      addToast(e?.message || 'שגיאה בשמירת הגדרות תשלום', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {!hideHeader ? (
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-amber-700 to-indigo-700 bg-clip-text text-transparent">
            תשלום / סליקה לדפי הנחיתה
          </h1>
          <p className="text-slate-600 text-lg">
            כאן אתה שולט על מה שיופיע בעמוד התשלום (`/subscribe/checkout`) שמגיע מדפי הנחיתה: QR, הוראות, וקישור חיצוני לסליקה
            (כולל אפשרות ל־iframe).
          </p>
        </div>
      ) : null}

      <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-6 text-slate-900 shadow-2xl">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-50 rounded-2xl border border-slate-200 text-slate-700">
              <CreditCard size={20} className="text-slate-700" />
            </div>
            <div>
              <div className="text-lg font-black">הגדרות תשלום לפי מערכת</div>
              <div className="text-xs text-slate-500">נדרש Super Admin</div>
            </div>
          </div>

          <Button
            disabled={isSaving || isLoading}
            onClick={handleSave}
            className="px-5 py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm flex items-center gap-2"
            type="button"
          >
            <Save size={16} /> {isSaving ? 'שומר...' : 'שמור'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {(['solo', 'the_closer', 'the_authority', 'the_operator', 'the_empire'] as const).map((pkg) => {
            const meta = PACKAGE_LABELS[pkg];
            const cfg = configs[pkg];

            return (
              <div key={pkg} className="bg-white/60 border border-slate-200/70 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-sm font-black text-slate-900">{meta.title}</div>
                    <div className="text-xs text-slate-600">{meta.subtitle}</div>
                    <div className="text-[10px] text-slate-500 mt-1">package_type: {pkg}</div>
                  </div>

                  <div className="min-w-[220px]">
                    <div className="text-[10px] font-black text-slate-600 mb-2">Payment Method</div>
                    <select
                      value={cfg.paymentMethod}
                      onChange={(e) => update(pkg, { paymentMethod: e.target.value === 'automatic' ? 'automatic' : 'manual' })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60"
                      disabled={isLoading || isSaving}
                    >
                      <option value="manual">manual (QR + הוכחה)</option>
                      <option value="automatic">automatic (קישור סליקה חיצוני)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-black text-slate-600 mb-2">כותרת</div>
                    <input
                      value={cfg.title}
                      onChange={(e) => update(pkg, { title: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60"
                      placeholder="כותרת שתופיע בעמוד התשלום"
                      disabled={isLoading || isSaving}
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-600 mb-2">External Payment URL</div>
                    <input
                      value={cfg.externalPaymentUrl}
                      onChange={(e) => update(pkg, { externalPaymentUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60"
                      placeholder="https://... (למשל Grow / גמא / ישראכרט)"
                      disabled={isLoading || isSaving}
                    />
                    {cfg.externalPaymentUrl ? (
                      <div className="mt-2">
                        <a
                          href={cfg.externalPaymentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-700 font-bold hover:underline"
                        >
                          פתח קישור לבדיקה
                        </a>
                      </div>
                    ) : null}
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-600 mb-2">QR Image URL</div>
                    <input
                      value={cfg.qrImageUrl}
                      onChange={(e) => update(pkg, { qrImageUrl: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60"
                      placeholder="https://..."
                      disabled={isLoading || isSaving}
                    />
                  </div>

                  <div>
                    <div className="text-[10px] font-black text-slate-600 mb-2">טקסט הנחיות</div>
                    <textarea
                      value={cfg.instructionsText}
                      onChange={(e) => update(pkg, { instructionsText: e.target.value })}
                      className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-200/60 resize-y"
                      placeholder="הוראות שיופיעו בעמוד התשלום"
                      disabled={isLoading || isSaving}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isLoading ? <div className="mt-6 text-xs text-slate-500">טוען...</div> : null}
      </div>
    </motion.div>
  );
}
