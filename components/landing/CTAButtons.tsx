'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { DemoVideoModal } from './DemoVideoModal';

export const CTAButtons = () => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <>
      <div className="mt-10 mb-12 flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-8">
        <Link
          href="/login?mode=sign-up&redirect=/workspaces/onboarding"
          className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-700 text-white font-black shadow-[0_18px_45px_-18px_rgba(15,23,42,0.65)] ring-1 ring-slate-900/10 hover:shadow-[0_24px_60px_-20px_rgba(15,23,42,0.75)] hover:scale-[1.03] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/15"
        >
          התחילו לעבוד - 7 ימים חינם
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        <button
          onClick={() => setIsVideoModalOpen(true)}
          className="group relative inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-black shadow-[0_0_0_0_rgba(99,102,241,0.2)] hover:shadow-[0_0_0_8px_rgba(99,102,241,0.1)] hover:border-indigo-300 hover:scale-105 active:scale-100 transition-all duration-300 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/20 overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/10 group-hover:to-indigo-500/5 transition-all duration-500" />
          <Play size={18} className="relative text-indigo-600 group-hover:text-purple-600 group-hover:scale-110 transition-all duration-300" />
          <span className="relative">תראו איך זה עובד</span>
        </button>
      </div>

      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </>
  );
};
