'use client';

import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';

export default function DashboardActionsClient({ hrefMachine }: { hrefMachine: string }) {
  const router = useRouter();
  const { setActiveDraft } = useApp();

  return (
    <button
      id="main-new-post-btn"
      onClick={() => {
        setActiveDraft(null);
        router.push(hrefMachine);
      }}
      className="bg-white p-4 md:p-8 rounded-[24px] md:rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
    >
      <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform">
        <Sparkles className="text-blue-600" size={28} />
      </div>
      <h3 className="text-base md:text-xl font-black text-slate-900">פוסט חדש</h3>
    </button>
  );
}
