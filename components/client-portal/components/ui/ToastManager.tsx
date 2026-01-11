import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, X, Zap } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export const ToastManager: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handleToast = (e: CustomEvent) => {
      const newToast = {
        id: Math.random().toString(36).substr(2, 9),
        message: (e as any).detail.message,
        type: (e as any).detail.type || 'info',
      };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    };

    window.addEventListener('nexus-toast', handleToast as unknown as EventListener);
    return () => window.removeEventListener('nexus-toast', handleToast as unknown as EventListener);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 items-center pointer-events-none w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto bg-[#0F172A] text-white pl-4 pr-3 py-3.5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-slide-up border border-white/10 w-full backdrop-blur-xl"
        >
          <div
            className={`p-1.5 rounded-full ${
              toast.type === 'success'
                ? 'bg-nexus-accent/20 text-nexus-accent'
                : toast.type === 'error'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : toast.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <Zap size={16} fill="currentColor" />
            )}
          </div>
          <span className="text-sm font-medium flex-1 tracking-wide leading-tight">{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} className="text-white/30 hover:text-white transition-colors p-1">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
