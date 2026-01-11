
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toast } from '../types';
import { Check, X, AlertTriangle, Info, AlertOctagon } from 'lucide-react';

interface ToastContainerProps {
    toasts: Toast[];
    removeToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3 w-full max-w-md px-4 pointer-events-none" style={{ direction: 'rtl' }}>
            <AnimatePresence mode='popLayout'>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(10px)' }}
                        transition={{ type: "spring", stiffness: 500, damping: 30, mass: 1 }}
                        className={`pointer-events-auto flex items-center gap-4 p-2 pl-3 pr-2 backdrop-blur-2xl border shadow-[0_8px_30px_rgba(0,0,0,0.12)] w-fit min-w-[320px] max-w-[90vw] rounded-[1.25rem] overflow-hidden relative group
                            ${toast.type === 'success' ? 'bg-white/90 border-emerald-100/50' :
                              toast.type === 'error' ? 'bg-white/90 border-rose-100/50' :
                              toast.type === 'warning' ? 'bg-white/90 border-amber-100/50' :
                              'bg-white/90 border-slate-200/50'}
                        `}
                    >
                        {/* Ambient Glow Background */}
                        <div className={`absolute inset-0 opacity-10 pointer-events-none bg-gradient-to-r 
                            ${toast.type === 'success' ? 'from-emerald-500 to-transparent' :
                              toast.type === 'error' ? 'from-rose-500 to-transparent' :
                              toast.type === 'warning' ? 'from-amber-500 to-transparent' :
                              'from-blue-500 to-transparent'}
                        `} />

                        {/* Icon Indicator */}
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 relative z-10 
                            ${toast.type === 'success' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/20' :
                              toast.type === 'error' ? 'bg-gradient-to-br from-rose-400 to-rose-600 text-white shadow-lg shadow-rose-500/20' :
                              toast.type === 'warning' ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-lg shadow-amber-500/20' :
                              'bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/20'}
                        `}>
                            {toast.type === 'success' && <Check size={18} strokeWidth={3} />}
                            {toast.type === 'error' && <AlertOctagon size={18} strokeWidth={3} />}
                            {toast.type === 'warning' && <AlertTriangle size={18} strokeWidth={3} />}
                            {toast.type === 'info' && <Info size={18} strokeWidth={3} />}
                        </div>
                        
                        {/* Message */}
                        <div className="flex-1 min-w-0 text-right py-1 relative z-10">
                            <p className="text-[13px] font-bold text-slate-800 leading-tight tracking-wide">
                                {toast.message}
                            </p>
                        </div>

                        {/* Close Button */}
                        <button 
                            onClick={() => removeToast(toast.id)} 
                            className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0 relative z-10 active:scale-95"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
