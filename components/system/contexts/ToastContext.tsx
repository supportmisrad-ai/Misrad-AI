'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { X, CircleCheck, TriangleAlert, Info, OctagonAlert } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-full max-w-md px-4 pointer-events-none">
        {toasts.map((toast) => (
            <div 
                key={toast.id}
                className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-2xl border animate-slide-down backdrop-blur-md ${
                    toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800' :
                    toast.type === 'error' ? 'bg-red-50/90 border-red-200 text-red-800' :
                    toast.type === 'warning' ? 'bg-amber-50/90 border-amber-200 text-amber-800' :
                    'bg-slate-50/90 border-slate-200 text-slate-800'
                }`}
            >
                <div className="flex items-center gap-3">
                    {toast.type === 'success' && <CircleCheck size={20} />}
                    {toast.type === 'error' && <OctagonAlert size={20} />}
                    {toast.type === 'warning' && <TriangleAlert size={20} />}
                    {toast.type === 'info' && <Info size={20} />}
                    <span className="font-bold text-sm">{toast.message}</span>
                </div>
                <button 
                    onClick={() => removeToast(toast.id)}
                    className="p-1 hover:bg-black/5 rounded-full transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    return {
      addToast: () => undefined,
      removeToast: () => undefined,
    };
  }
  return context;
};

