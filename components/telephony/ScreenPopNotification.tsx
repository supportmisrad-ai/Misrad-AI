'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, X, User, Clock, ExternalLink } from 'lucide-react';
import { useTelephonyOptional } from '@/contexts/TelephonyContext';
import Link from 'next/link';

interface ScreenPopNotificationProps {
  orgSlug: string;
}

export default function ScreenPopNotification({ orgSlug }: ScreenPopNotificationProps) {
  const telephony = useTelephonyOptional();
  const [isVisible, setIsVisible] = useState(false);

  const screenPop = telephony?.screenPop;

  useEffect(() => {
    if (screenPop) {
      setIsVisible(true);
      
      // Auto-dismiss after 30 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        telephony?.dismissScreenPop();
      }, 30000);

      // Play notification sound
      try {
        const audio = new Audio('/audio/incoming-call.mp3');
        audio.volume = 0.5;
        void audio.play().catch(() => {});
      } catch {
        // Audio not available
      }

      return () => clearTimeout(timer);
    }
  }, [screenPop, telephony]);

  const handleDismiss = () => {
    setIsVisible(false);
    telephony?.dismissScreenPop();
  };

  const formatPhoneNumber = (phone: string) => {
    // Format Israeli phone number
    if (phone.startsWith('972')) {
      return `0${phone.slice(3)}`;
    }
    if (phone.startsWith('+972')) {
      return `0${phone.slice(4)}`;
    }
    return phone;
  };

  return (
    <AnimatePresence>
      {isVisible && screenPop && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-[90vw] max-w-md"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header with pulsing indicator */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Phone size={20} className="text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                </div>
                <div>
                  <div className="text-white font-bold text-sm">שיחה נכנסת</div>
                  <div className="text-white/80 text-xs flex items-center gap-1">
                    <Clock size={10} />
                    עכשיו
                  </div>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Phone number */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <User size={24} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {screenPop.leadName ? (
                    <>
                      <div className="font-bold text-slate-900 text-lg truncate">
                        {screenPop.leadName}
                      </div>
                      <div className="text-slate-500 text-sm font-mono" dir="ltr">
                        {formatPhoneNumber(screenPop.caller)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="font-bold text-slate-900 text-lg font-mono" dir="ltr">
                        {formatPhoneNumber(screenPop.caller)}
                      </div>
                      <div className="text-slate-500 text-sm">
                        מספר לא מזוהה
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {screenPop.leadId ? (
                  <Link
                    href={`/w/${encodeURIComponent(orgSlug)}/system/sales_pipeline?lead=${screenPop.leadId}`}
                    onClick={handleDismiss}
                    className="flex-1 bg-slate-900 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <ExternalLink size={16} />
                    פתח כרטיס ליד
                  </Link>
                ) : (
                  <Link
                    href={`/w/${encodeURIComponent(orgSlug)}/system/sales_pipeline?newLead=true&phone=${encodeURIComponent(screenPop.caller)}`}
                    onClick={handleDismiss}
                    className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                  >
                    <User size={16} />
                    צור ליד חדש
                  </Link>
                )}
                <button
                  onClick={handleDismiss}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  סגור
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
