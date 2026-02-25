'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';
import { DemoVideoModal } from '@/components/landing/DemoVideoModal';

interface DemoVideoTriggerProps {
  label?: string;
  className?: string;
}

export default function DemoVideoTrigger({ 
  label = 'צפייה במערכת',
  className = 'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-bold hover:border-indigo-300 hover:scale-105 transition-all',
}: DemoVideoTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={className}
      >
        <Play size={18} className="text-indigo-600" />
        {label}
      </button>
      <DemoVideoModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
