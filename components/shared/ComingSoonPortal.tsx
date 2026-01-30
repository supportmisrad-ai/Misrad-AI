'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Rocket, X } from 'lucide-react';

type ComingSoonDetail = {
  message?: string;
};

const DEFAULT_MESSAGE = "🚀 פיצ'ר זה נמצא בפיתוח מתקדם ויהיה זמין בקרוב. תודה על הסבלנות!";
const EVENT_NAME = 'misrad-coming-soon';

export function openComingSoon(detail?: ComingSoonDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: detail || {} }));
}

export default function ComingSoonPortal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ComingSoonDetail>).detail;
      setMessage(String(detail?.message || DEFAULT_MESSAGE));
      setIsOpen(true);
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);
    return () => window.removeEventListener(EVENT_NAME, handler as EventListener);
  }, []);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
            onClick={close}
          />

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="פיצ'ר בפיתוח"
            onClick={close}
          >
            <div
              className="w-full max-w-md bg-white rounded-[28px] border border-slate-200 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-2xl bg-[color:color-mix(in_srgb,var(--os-accent)_12%,white)] border border-[color:color-mix(in_srgb,var(--os-accent)_22%,white)] text-[color:var(--os-accent)] flex items-center justify-center">
                    <Rocket size={18} />
                  </div>
                  <div className="font-black text-slate-900">בקרוב</div>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center"
                  aria-label="סגור"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                <div className="text-sm font-bold text-slate-700 leading-relaxed">{message}</div>
              </div>

              <div className="p-5 pt-0">
                <button
                  type="button"
                  onClick={close}
                  className="w-full h-12 rounded-2xl bg-slate-900 text-white font-black hover:bg-slate-800 transition-colors"
                >
                  הבנתי
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
