'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Sparkles, Zap } from 'lucide-react';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

interface DemoVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DemoVideoModal = ({ isOpen, onClose }: DemoVideoModalProps) => {
  useBackButtonClose(isOpen, onClose);
  const [demoVideoUrl, setDemoVideoUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('demo_video_url');
      return saved || null;
    }
    return null;
  });

  // Default: scroll to features section if no video
  const handleWatchDemo = () => {
    onClose();
    const element = document.getElementById('features');
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl" onClick={onClose}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-4xl w-full shadow-2xl relative"
            dir="rtl"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 sm:top-6 sm:left-6 text-slate-500 hover:text-slate-900 p-2 rounded-lg hover:bg-slate-100 transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">איך זה עובד</h3>
              <p className="text-slate-600 text-sm sm:text-base">
                {demoVideoUrl ? 'סרטון הסבר על Misrad' : 'סיור קצר במערכת'}
              </p>
            </div>

            {demoVideoUrl ? (
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 mb-6">
                <iframe
                  src={demoVideoUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="space-y-6 mb-6">
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50 border border-slate-200 flex items-center justify-center">
                  <div className="text-center p-8">
                    <Play size={64} className="text-indigo-400 mx-auto mb-4" fill="currentColor" />
                    <p className="text-slate-700 text-lg mb-6">סרטון הסבר יופיע כאן</p>
                    <p className="text-slate-500 text-sm">ניתן להוסיף סרטון דרך פאנל האדמין</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                  <h4 className="text-slate-900 font-bold mb-4 flex items-center gap-2">
                    <Sparkles size={18} className="text-indigo-400" />
                    או הצצה מהירה לפיצ׳רים
                  </h4>
                  <p className="text-slate-600 text-sm mb-4">
                    גלול למטה לסקשן "פיצ'רים" כדי לראות את המערכת בפעולה.
                  </p>
                  <button
                    onClick={handleWatchDemo}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Zap size={18} /> הצצה לפיצ׳רים
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                סגור
              </button>
              {!demoVideoUrl && (
                <button
                  onClick={handleWatchDemo}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all"
                >
                  הצצה לפיצ׳רים
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
