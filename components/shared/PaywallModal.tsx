'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Check } from 'lucide-react';
import { BILLING_PACKAGES, type PackageType } from '@/lib/billing/pricing';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export type PaywallReason = 'seats' | 'finance' | 'generic';

export default function PaywallModal(props: {
  isOpen: boolean;
  onCloseAction: () => void;
  title: string;
  message: string;
  reason?: PaywallReason;
  recommendedPackageType?: PackageType;
}) {
  useBackButtonClose(props.isOpen, props.onCloseAction);
  const router = useRouter();

  const packages = useMemo(() => {
    const all = Object.entries(BILLING_PACKAGES) as Array<[PackageType, (typeof BILLING_PACKAGES)[PackageType]]>;
    return all;
  }, []);

  const handleSelect = (packageType: PackageType) => {
    const qs = new URLSearchParams({
      billing: 'monthly',
      package: packageType,
    });
    router.push(`/subscribe/checkout?${qs.toString()}`);
    props.onCloseAction();
  };

  if (!props.isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
          onClick={props.onCloseAction}
        />

        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="relative z-10 w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <div>
                <div className="text-lg font-black text-slate-900">{props.title}</div>
                <div className="text-sm font-bold text-slate-500 mt-1">{props.message}</div>
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black">
                  מבצע השקה: 50% הנחה למשלמים מנוי שנתי מראש! (לזמן מוגבל)
                </div>
              </div>
            </div>
            <button
              onClick={props.onCloseAction}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map(([key, pkg]) => {
                const recommended = props.recommendedPackageType === key;
                return (
                  <div
                    key={key}
                    className={`rounded-3xl border p-5 flex flex-col gap-4 ${
                      recommended
                        ? 'border-indigo-500 bg-indigo-50/50 shadow-[0_12px_40px_-30px_rgba(79,70,229,0.6)]'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-black text-slate-900">{pkg.labelHe}</div>
                        <div className="text-2xl font-black text-slate-900 mt-2">₪{pkg.monthlyPrice}</div>
                        <div className="text-xs font-bold text-slate-500">לחודש</div>
                      </div>
                      {recommended ? (
                        <div className="text-[10px] font-black px-3 py-1 rounded-full bg-indigo-600 text-white">
                          מומלץ
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      {pkg.modules.length ? (
                        pkg.modules.map((m) => (
                          <div key={m} className="flex items-center gap-2 text-sm text-slate-700">
                            <Check size={16} className="text-emerald-600" />
                            <span className="font-bold">{m}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-600 font-bold">מודול בודד (בחירה ב-Checkout)</div>
                      )}
                    </div>

                    <button
                      onClick={() => handleSelect(key)}
                      className={`w-full rounded-2xl py-3 font-black ${
                        recommended
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      שדרג עכשיו
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 text-xs text-slate-500 font-bold">
              הניסיון נשאר פעיל. השדרוג פותח את המגבלה מיד.
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
