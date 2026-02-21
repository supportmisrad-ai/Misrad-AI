'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users } from 'lucide-react';
import { CustomSelect } from '@/components/CustomSelect';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export default function DevicePairingModal(props: {
  open: boolean;
  onClose: () => void;
  users: Array<{ id: string; name: string; role?: string | null }>;
  approvePairing: (params: { code: string; approvedForUserId: string }) => Promise<any>;
  addToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  useBackButtonClose(props.open, props.onClose);
  const [pairingCode, setPairingCode] = useState('');
  const [pairingUserId, setPairingUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    const code = pairingCode.trim().toUpperCase();
    const approvedForUserId = pairingUserId;

    if (!code) {
      props.addToast('נא להזין קוד', 'error');
      return;
    }

    if (!approvedForUserId) {
      props.addToast('נא לבחור עובד', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await props.approvePairing({ code, approvedForUserId });
      props.addToast('המכשיר צומד בהצלחה', 'success');
      props.onClose();
    } catch (e: unknown) {
      props.addToast((e instanceof Error ? e.message : String(e)) || 'שגיאה בצימוד מכשיר', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {props.open ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={props.onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 flex flex-col p-4 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base md:text-lg mb-2">צמד מכשיר</h3>
            <p className="text-xs text-gray-500 mb-4">בטאבלט פתחו /kiosk-login והזינו כאן את הקוד.</p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">קוד</label>
                <input
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  placeholder="ABC-123"
                  className="w-full p-2.5 md:p-3 border border-gray-200 rounded-xl outline-none transition-all focus:border-black dir-ltr text-left text-sm"
                />
              </div>

              <div className="relative z-20">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">עובד</label>
                <CustomSelect
                  value={pairingUserId}
                  onChange={(val) => setPairingUserId(String(val || ''))}
                  options={props.users.map((u) => ({
                    value: u.id,
                    label: `${u.name}${u.role ? ` (${u.role})` : ''}`,
                    icon: <Users size={14} className="text-gray-400" />,
                  }))}
                  placeholder="בחר עובד"
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={props.onClose}
                className="px-4 py-2.5 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold w-full sm:w-auto"
                disabled={isSubmitting}
              >
                ביטול
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2.5 bg-black text-white rounded-lg hover:bg-gray-800 text-sm font-bold w-full sm:w-auto"
                disabled={isSubmitting}
              >
                אשר צימוד
              </button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
