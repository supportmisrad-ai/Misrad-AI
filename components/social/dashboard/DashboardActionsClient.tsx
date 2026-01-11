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
      className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-lg hover:shadow-xl transition-all text-right group"
    >
      <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Sparkles className="text-blue-600" size={32} />
      </div>
      <h3 className="text-xl font-black text-slate-900 mb-2">פוסט חדש</h3>
      <p className="text-sm font-bold text-slate-400">צור פוסט עם AI</p>
    </button>
  );
}
