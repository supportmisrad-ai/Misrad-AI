import Link from 'next/link';
import { ArrowLeft, Gift } from 'lucide-react';

export function LandingPricingCTA() {
  return (
    <section id="pricing" className="py-14 sm:py-18 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[100px]" />
      </div>
      <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12 relative">
        <div className="relative rounded-[2rem] overflow-hidden border-2 border-slate-200 bg-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-20" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-20" />
          <div className="relative p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 text-slate-700 text-xs font-bold mb-4">
                <Gift size={14} className="text-emerald-600" />
                ניסיון חינם מלא
              </div>
              <div className="text-3xl sm:text-4xl font-black text-slate-900">מוכנים להתחיל?</div>
              <div className="mt-3 text-slate-600 text-lg font-medium">ניסיון חינם 7 ימים - ללא כרטיס אשראי</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
              >
                התחילו עכשיו
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
