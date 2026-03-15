'use client';

import React, { useState } from 'react';
import { X, LayoutGrid, MapPin, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormCustomSelect } from '@/components/FormCustomSelect';
import { FormPendingButton } from '@/components/operations/FormPendingButton';
import { createOperationsProject } from '@/app/actions/operations';
import { useRouter } from 'next/navigation';

interface ProjectCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
  clientOptions: { value: string; label: string }[];
}

export function ProjectCreateModal({
  isOpen,
  onClose,
  orgSlug,
  clientOptions,
}: ProjectCreateModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setError(null);
    const title = String(formData.get('title') || '').trim();
    const canonicalClientId = String(formData.get('canonicalClientId') || '');
    const installationAddress = String(formData.get('installationAddress') || '').trim();

    if (!title) {
      setError('יש להזין שם פרויקט');
      return;
    }

    try {
      const res = await createOperationsProject({
        orgSlug,
        title,
        canonicalClientId: (canonicalClientId || undefined) as string | undefined,
        installationAddress: (installationAddress || undefined) as string | undefined,
      });

      if (res.success) {
        onClose();
        router.refresh();
      } else {
        setError(res.error || 'שגיאה ביצירת פרויקט');
      }
    } catch (err) {
      setError('שגיאה בתקשורת עם השרת');
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                  <LayoutGrid size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-none">פרויקט חדש</h3>
                  <p className="text-xs text-slate-500 mt-1.5 font-bold">הגדרת פרטי פרויקט חדש במערכת</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all active:scale-90"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Content */}
            <form action={handleSubmit} className="p-8 space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-black"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-5">
                {/* Project Title */}
                <div>
                  <label htmlFor="title" className="flex items-center gap-2 text-[13px] font-black text-slate-700 mb-2 mr-1">
                    שם הפרויקט
                  </label>
                  <div className="relative group">
                    <input
                      id="title"
                      name="title"
                      required
                      className="w-full h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-base font-black text-slate-800 shadow-inner outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder:text-slate-300"
                      placeholder="לדוגמה: התקנת מערכת בבית הלקוח"
                    />
                  </div>
                </div>

                {/* Client Selection */}
                <div>
                  <label htmlFor="canonicalClientId" className="flex items-center gap-2 text-[13px] font-black text-slate-700 mb-2 mr-1">
                    <UserIcon size={14} strokeWidth={3} className="text-slate-400" />
                    לקוח <span className="text-slate-400 font-bold text-xs">(אופציונלי)</span>
                  </label>
                  <div className="relative">
                    <FormCustomSelect
                      name="canonicalClientId"
                      id="canonicalClientId"
                      defaultValue=""
                      placeholder={clientOptions.length ? 'בחירת לקוח משויך...' : 'אין לקוחות זמינים'}
                      options={clientOptions}
                      className="!h-14 !rounded-2xl !border-2 !border-slate-100 !bg-slate-50 focus-within:!border-sky-500 focus-within:!ring-4 focus-within:!ring-sky-100"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="installationAddress" className="flex items-center gap-2 text-[13px] font-black text-slate-700 mb-2 mr-1">
                    <MapPin size={14} strokeWidth={3} className="text-slate-400" />
                    כתובת הפרויקט
                  </label>
                  <input
                    id="installationAddress"
                    name="installationAddress"
                    className="w-full h-14 rounded-2xl border-2 border-slate-100 bg-slate-50 px-5 text-base font-black text-slate-800 shadow-inner outline-none focus:border-sky-500 focus:bg-white focus:ring-4 focus:ring-sky-100 transition-all placeholder:text-slate-300"
                    placeholder="לדוגמה: דיזנגוף 99, תל אביב"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <FormPendingButton
                  pendingText="מבצע יצירה..."
                  className="flex-1 h-14 rounded-2xl bg-sky-500 text-white text-base font-black shadow-lg shadow-sky-500/25 hover:bg-sky-600 active:scale-95 transition-all"
                >
                  צור פרויקט חדש
                </FormPendingButton>
                <button
                  type="button"
                  onClick={onClose}
                  className="sm:w-32 h-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-600 text-base font-black hover:bg-slate-50 hover:border-slate-200 transition-all active:scale-95"
                >
                  ביטול
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
