import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FloatingAIInsightProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  priority?: 'normal' | 'urgent';
}

export function FloatingAIInsight({
  message,
  isVisible,
  onClose,
  priority = 'normal',
}: FloatingAIInsightProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 100, opacity: 0, scale: 0.9 }}
          className="fixed bottom-24 left-4 right-4 z-50 md:hidden"
        >
          <div className={`relative overflow-hidden rounded-2xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-500 ${
            priority === 'urgent'
              ? 'border-rose-200 bg-rose-50/90 shadow-rose-500/20'
              : 'border-sky-200 bg-white/90 shadow-sky-500/20'
          }`}>
            {/* Optical Bloom Effect */}
            <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl opacity-50 ${
              priority === 'urgent' ? 'bg-rose-400' : 'bg-sky-400'
            }`} />
            
            {/* Grain Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <div className="relative flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-lg ${
                priority === 'urgent'
                  ? 'bg-rose-500 text-white shadow-rose-500/40'
                  : 'bg-sky-500 text-white shadow-sky-500/40'
              }`}>
                <Sparkles size={20} strokeWidth={2.5} className="animate-pulse" />
              </div>
              
              <div className="flex-1 pt-0.5">
                <div className={`text-[10px] font-black uppercase tracking-wider mb-1 ${
                  priority === 'urgent' ? 'text-rose-600' : 'text-sky-600'
                }`}>
                  זיהוי AI חכם
                </div>
                <p className="text-sm font-bold leading-tight text-slate-800">
                  {message}
                </p>
              </div>

              <button
                onClick={onClose}
                className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
