import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export function HomepageCTA() {
  return (
    <section className="py-16 sm:py-20 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs font-black mb-6">
          <Sparkles size={12} className="text-amber-400" />
          7 ימי ניסיון חינם · ללא כרטיס אשראי
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
          מוכנים להפסיק לנהל
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
            על פתקים?
          </span>
        </h2>

        <p className="mt-4 sm:mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          7 דקות כדי להתחיל. 7 ימים לגלות שאתם לא חוזרים אחורה.
        </p>

        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login?mode=sign-up&redirect=/workspaces/onboarding"
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-white text-slate-900 font-black shadow-[0_18px_45px_-18px_rgba(255,255,255,0.35)] hover:shadow-[0_24px_60px_-20px_rgba(255,255,255,0.45)] hover:scale-[1.03] active:scale-[0.99] transition-all w-full sm:w-auto"
          >
            התחילו בחינם עכשיו
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full border border-white/25 text-white font-black hover:bg-white/10 transition-all w-full sm:w-auto"
          >
            ראו מחירים
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {[
            'ללא כרטיס אשראי',
            'ביטול בכל עת',
            'תמיכה בעברית',
            'הנתונים שלכם',
          ].map((t) => (
            <span key={t} className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <span className="w-1 h-1 bg-emerald-500 rounded-full" />
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
