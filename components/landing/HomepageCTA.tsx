import Link from 'next/link';
import { ArrowLeft, Sparkles, Zap, Shield, HeartHandshake, TrendingUp } from 'lucide-react';

export function HomepageCTA() {
  return (
    <section className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/4 w-[700px] h-[700px] bg-indigo-600/12 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(99,102,241,0.08),transparent)]" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      <div className="max-w-5xl mx-auto px-6 relative">
        <div className="text-center">

          {/* Free trial badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-black mb-8">
            <Sparkles size={12} />
            7 ימי ניסיון חינם · ללא כרטיס אשראי
          </div>

          {/* Main headline */}
          <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.0] tracking-tight">
            הפסיקו לנהל<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
              על פתקים.
            </span>
          </h2>

          <p className="mt-6 text-lg sm:text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
            7 דקות להתחיל. 7 ימים לגלות שאתם לא חוזרים אחורה.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login?mode=sign-up&redirect=/workspaces/onboarding"
              className="group relative inline-flex items-center justify-center gap-2.5 px-10 py-4 rounded-2xl bg-white text-slate-900 font-black text-base shadow-[0_20px_60px_-15px_rgba(255,255,255,0.25)] hover:shadow-[0_24px_70px_-15px_rgba(255,255,255,0.35)] hover:scale-[1.02] active:scale-[0.99] transition-all w-full sm:w-auto"
            >
              <Zap size={17} className="text-amber-500" />
              התחילו בחינם עכשיו
              <ArrowLeft size={17} className="group-hover:-translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-white/15 text-white/80 font-black text-base hover:bg-white/[0.06] hover:border-white/25 transition-all w-full sm:w-auto"
            >
              ראו מחירים
            </Link>
          </div>

          {/* Price callout */}
          <div className="mt-8 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]">
            <span className="text-sm text-white/40 font-bold">מ-</span>
            <span className="text-2xl font-black text-white">149₪</span>
            <span className="text-sm text-white/40 font-bold">לחודש · ביטול בכל עת</span>
          </div>

          {/* Trust grid */}
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {[
              { icon: Shield, text: 'ללא כרטיס אשראי', sub: 'לניסיון החינמי' },
              { icon: HeartHandshake, text: 'תמיכה בעברית', sub: 'צוות ישראלי' },
              { icon: TrendingUp, text: 'מתרחב איתכם', sub: 'הוסיפו מודולים' },
              { icon: Sparkles, text: 'AI מובנה', sub: 'בכל מודול' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <Icon size={18} className="text-indigo-400" />
                <div>
                  <div className="text-xs font-black text-white/70 text-center leading-snug">{text}</div>
                  <div className="text-[10px] text-white/30 font-medium text-center mt-0.5">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
