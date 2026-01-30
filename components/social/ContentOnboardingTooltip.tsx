'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Copy, X, Sparkles } from 'lucide-react';

let hasSeenContentTooltip = false;

interface ContentOnboardingTooltipProps {
  targetElementId?: string; // ID of the element to attach tooltip to
  onClose?: () => void;
}

export default function ContentOnboardingTooltip({ targetElementId, onClose }: ContentOnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user has seen this tooltip
    if (hasSeenContentTooltip) return;

    // Wait a bit for the page to render
    const timer = setTimeout(() => {
      // Try to find the first post card
      const firstPost = document.querySelector('[data-post-card="first"]');
      if (firstPost) {
        const rect = firstPost.getBoundingClientRect();
        setPosition({
          top: rect.top + window.scrollY + rect.height / 2 - 100,
          left: rect.right + window.scrollX + 20,
        });
        setIsVisible(true);
      }
    }, 1500); // Wait a bit longer for animations

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    hasSeenContentTooltip = true;
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={tooltipRef}
        initial={{ opacity: 0, scale: 0.8, x: -20 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, x: -20 }}
        className="fixed z-50 bg-white rounded-3xl p-6 shadow-2xl border-2 border-blue-200 max-w-sm"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          transform: 'translateY(-50%)',
        }}
        dir="rtl"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 left-3 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Sparkles className="text-blue-600" size={20} />
          </div>
          <h3 className="text-lg font-black text-slate-900">הכלים החדשים שלכם כאן 👇</h3>
        </div>

        {/* Content */}
        <p className="text-sm font-bold text-slate-700 mb-4 leading-relaxed">
          עברו עם העכבר (Hover) על הפוסט כדי לחשוף את כפתורי הפעולה המהירה:
        </p>

        {/* Features */}
        <div className="space-y-3 mb-4">
          <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Download className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-black text-slate-900 mb-1">📥 הורדה</p>
              <p className="text-xs font-bold text-slate-600">שמירת התמונה/וידאו לנייד</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-xl border border-blue-100">
            <Copy className="text-blue-600 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-black text-slate-900 mb-1">📋 העתקה</p>
              <p className="text-xs font-bold text-slate-600">העתקת הטקסט ללוח</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleClose}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm hover:bg-blue-700 transition-all"
        >
          מעולה, תודה
        </button>

        {/* Arrow pointing to post */}
        <div className="absolute right-full top-1/2 -translate-y-1/2">
          <div className="w-0 h-0 border-t-[12px] border-t-transparent border-r-[12px] border-r-blue-200 border-b-[12px] border-b-transparent"></div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

