'use client';

import React from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface HeroSectionProps {
  isAuthenticated: boolean;
  onWatchDemo: () => void;
}

export default function HeroSection({ isAuthenticated, onWatchDemo }: HeroSectionProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white border-b border-slate-200">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/60 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/60 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-32 relative z-10 text-center">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-indigo-700 text-xs font-bold mb-6">
            <Sparkles size={14} className="text-indigo-600" />
            <span>AI שמנהל את הארגון במקומך</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-slate-900 mb-4 leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              MISRAD AI
            </span>
            <br />
            מערכת אחת
            <br />
            לכל העסק שלך
          </h1>
          
          <p className="text-lg sm:text-xl md:text-2xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
            <span className="hidden sm:inline">
              MISRAD AI נבנתה כדי לעבוד בשבילך. בחר תחום וראה איך זה עובד בזמן אמת.
            </span>
            <span className="sm:hidden">
              מערכת אחת לכל העסק שלך
            </span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href={isAuthenticated ? '/me' : '/login?mode=sign-up&redirect=/workspaces/onboarding'}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-full font-bold text-lg hover:bg-indigo-500 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              {isAuthenticated ? 'חזרה ללוח הבקרה' : 'התחל ניסיון חינם'} <ArrowRight size={20} className="rotate-180" />
            </Link>
            <button
              onClick={onWatchDemo}
              className="w-full sm:w-auto px-8 py-4 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold text-lg hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
            >
              <Play size={20} fill="currentColor" /> איך זה עובד
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
