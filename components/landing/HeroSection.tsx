'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface HeroSectionProps {
  isAuthenticated: boolean;
  onWatchDemo: () => void;
}

export default function HeroSection({ isAuthenticated, onWatchDemo }: HeroSectionProps) {
  const router = useRouter();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020617] border-b border-slate-800">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-32 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50 text-indigo-300 text-xs font-bold mb-6 backdrop-blur-md">
            <Sparkles size={14} className="text-indigo-400" />
            <span>הדור הבא של ניהול עסקים</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white mb-4 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Misrad
            </span>
            <br />
            מערכת אחת
            <br />
            לכל העסק שלך
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-500 mb-6">
            מבית MISRAD
          </p>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            <span className="hidden sm:inline">
              Misrad נבנתה כדי לעבוד בשבילך. בחר תחום וראה איך זה עובד בזמן אמת.
            </span>
            <span className="sm:hidden">
              מערכת אחת לכל העסק שלך
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => isAuthenticated ? window.location.href = '/app' : router.push('/sign-up')}
              className="w-full sm:w-auto px-8 py-4 bg-white text-black rounded-xl font-bold text-lg hover:bg-slate-200 transition-all shadow-lg shadow-white/10 hover:shadow-white/20 flex items-center justify-center gap-2"
            >
              {isAuthenticated ? 'חזרה ללוח הבקרה' : 'התחל ניסיון חינם'} <ArrowRight size={20} className="rotate-180" />
            </button>
            <button
              onClick={onWatchDemo}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/50 text-white border border-slate-700 rounded-xl font-bold text-lg hover:bg-slate-800 transition-all backdrop-blur-md flex items-center justify-center gap-2 hover:border-slate-600"
            >
              <Play size={20} fill="currentColor" /> צפה בדמו
            </button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
