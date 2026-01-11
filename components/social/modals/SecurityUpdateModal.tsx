'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, CheckCircle2, Download, Copy, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

const STORAGE_KEY = 'seen_security_update_v2';

interface SecurityUpdateModalProps {
  onClose: () => void;
}

export default function SecurityUpdateModal({ onClose }: SecurityUpdateModalProps) {
  const { user } = useUser();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen this modal
    const hasSeen = localStorage.getItem(STORAGE_KEY);
    if (!hasSeen) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[48px] max-w-2xl w-full p-10 shadow-2xl relative overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={24} />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
              <Shield className="text-blue-600" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-black text-slate-900 mb-2">
                שדרוג אבטחה: עובדים חכם ובטוח יותר 🛡️
              </h2>
              <p className="text-slate-600 font-bold">
                שלום {user?.fullName || 'משתמש'}, ביצענו שינוי חשוב כדי להגן על הנכסים הדיגיטליים שלכם.
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="bg-blue-50 rounded-3xl p-8 mb-8 border-2 border-blue-100">
            <p className="text-lg font-black text-slate-900 mb-6">
              החל מהיום, המערכת אינה שומרת יותר סיסמאות לרשתות החברתיות.
            </p>

            <div className="space-y-4 mb-6">
              <h3 className="text-xl font-black text-slate-900 mb-4">איך מפרסמים עכשיו? פשוט יותר:</h3>
              
              <div className="flex items-start gap-4 bg-white p-5 rounded-2xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 mb-1">מאשרים את התוכן במערכת</p>
                  <p className="text-sm font-bold text-slate-600">הלקוח נכנס לפורטל, עובר על הפוסטים ומאשר</p>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white p-5 rounded-2xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 mb-1">מעתיקים את הטקסט והמדיה בלחיצת כפתור</p>
                  <p className="text-sm font-bold text-slate-600 mb-3">במסך הפוסטים - כפתורי "הורד מדיה" ו"העתק טקסט"</p>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                      <Download size={16} className="text-blue-600" />
                      <span className="text-xs font-black text-slate-700">הורד מדיה</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                      <Copy size={16} className="text-blue-600" />
                      <span className="text-xs font-black text-slate-700">העתק טקסט</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4 bg-white p-5 rounded-2xl border border-blue-100">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black shrink-0">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-900 mb-1">מפרסמים ישירות מהאפליקציה בנייד</p>
                  <p className="text-sm font-bold text-slate-600">פותחים אינסטגרם (שכבר מחובר) → מדביקים → מפרסמים</p>
                </div>
              </div>
            </div>
          </div>

          {/* Benefits */}
          <div className="bg-green-50 rounded-2xl p-6 mb-8 border border-green-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="text-green-600 shrink-0 mt-1" size={20} />
              <p className="text-sm font-black text-green-900 leading-relaxed">
                זהו צעד שנועד להבטיח לכם <strong>אפס סיכוני אבטחה</strong> ושליטה מלאה בחשבונות.
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleClose}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-lg"
          >
            הבנתי, בואו נתחיל
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

