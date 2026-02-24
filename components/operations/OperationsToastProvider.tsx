'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, OctagonAlert, X } from 'lucide-react';

type ToastType = 'success' | 'error';
type ToastItem = { id: string; message: string; type: ToastType };

interface OpsToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const OpsToastContext = createContext<OpsToastContextValue>({ toast: () => {} });

export function useOpsToast() {
  return useContext(OpsToastContext);
}

export function OperationsToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).slice(2, 10);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  return (
    <OpsToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="fixed top-[calc(env(safe-area-inset-top)+1rem)] left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none"
        style={{ direction: 'rtl' }}
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: -12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.95 }}
              transition={{ duration: 0.15, ease: [0.2, 0, 0, 1] }}
              className={`pointer-events-auto flex items-center gap-3 px-3 py-2.5 backdrop-blur-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-full rounded-2xl ${
                t.type === 'success'
                  ? 'bg-white/90 border-emerald-100/50'
                  : 'bg-white/90 border-rose-100/50'
              }`}
            >
              <div
                className={`absolute inset-0 opacity-10 pointer-events-none rounded-2xl bg-gradient-to-r ${
                  t.type === 'success' ? 'from-emerald-500 to-transparent' : 'from-rose-500 to-transparent'
                }`}
              />
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 relative z-10 ${
                  t.type === 'success'
                    ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/20'
                }`}
              >
                {t.type === 'success' ? <Check size={14} strokeWidth={3} /> : <OctagonAlert size={14} strokeWidth={3} />}
              </div>
              <p className="flex-1 min-w-0 text-[13px] font-bold text-slate-800 leading-tight relative z-10">
                {t.message}
              </p>
              <button
                onClick={() => remove(t.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 relative z-10"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </OpsToastContext.Provider>
  );
}
