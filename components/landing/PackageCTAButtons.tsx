'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { DemoVideoModal } from './DemoVideoModal';

interface PackageCTAButtonsProps {
  ctaPrimaryHref: string;
  ctaPrimaryLabel: string;
  ctaSecondaryHref?: string;
  ctaSecondaryLabel?: string;
}

export const PackageCTAButtons = ({ 
  ctaPrimaryHref, 
  ctaPrimaryLabel, 
  ctaSecondaryHref, 
  ctaSecondaryLabel 
}: PackageCTAButtonsProps) => {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <>
      <div className="mt-20 mb-12 flex flex-col sm:flex-row gap-6">
        <Link
          href={ctaPrimaryHref}
          className="group inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
        >
          {ctaPrimaryLabel}
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        </Link>
        
        <button
          onClick={() => setIsVideoModalOpen(true)}
          className="group relative inline-flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-black shadow-[0_0_0_0_rgba(99,102,241,0.2)] hover:shadow-[0_0_0_8px_rgba(99,102,241,0.1)] hover:border-indigo-300 hover:scale-105 active:scale-100 transition-all duration-300 overflow-hidden"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-purple-500/0 to-indigo-500/0 group-hover:from-indigo-500/5 group-hover:via-purple-500/10 group-hover:to-indigo-500/5 transition-all duration-500" />
          <Play size={18} className="relative text-indigo-600 group-hover:text-purple-600 group-hover:scale-110 transition-all duration-300" />
          <span className="relative">צפייה במערכת</span>
        </button>

        {ctaSecondaryHref && ctaSecondaryLabel && (
          <Link
            href={ctaSecondaryHref}
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 hover:shadow-lg transition-all"
          >
            {ctaSecondaryLabel}
          </Link>
        )}
      </div>

      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </>
  );
};
