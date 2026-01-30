import Image from 'next/image';
import { getSystemIconUrl } from '@/lib/metadata';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-xl p-10 text-center">
        <div className="flex justify-center mb-6">
          <Image src={getSystemIconUrl('misrad')} alt="MISRAD" width={64} height={64} priority />
        </div>

        <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-3">אנחנו משדרגים את המערכת</h1>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed">
          אנחנו משדרגים את המערכת כדי לתת לכם שירות טוב יותר. נחזור בקרוב.
        </p>

        <div className="mt-8 text-xs text-slate-400">MISRAD</div>
      </div>
    </div>
  );
}
