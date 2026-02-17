'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CircleCheckBig, TriangleAlert, Info } from 'lucide-react';
import { useSocialUI } from '@/contexts/SocialUIContext';

export default function ToastContainer() {
  const { toasts, setToasts } = useSocialUI();

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-10 left-0 right-0 z-[500] pointer-events-none flex flex-col items-center gap-4" suppressHydrationWarning>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div 
            key={toast.id} 
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="pointer-events-auto min-w-[360px] max-w-lg bg-white border border-slate-100 rounded-[32px] shadow-2xl p-6 flex items-center gap-6 relative overflow-hidden"
          >
            <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-white ${toast.type === 'success' ? 'bg-green-50 text-green-500' : toast.type === 'error' ? 'bg-red-50 text-red-500' : 'bg-blue-600'}`}>
              {toast.type === 'success' ? <CircleCheckBig size={24} /> : toast.type === 'error' ? <TriangleAlert size={24} /> : <Info size={24} />}
            </div>
            <p className="flex-1 font-black text-lg text-slate-900">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="p-2 hover:bg-slate-50 rounded-xl">
              <X size={20}/>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

