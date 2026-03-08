import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Target, Palette, Zap, ArrowLeft, Sparkles } from 'lucide-react';
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function AboutPage() {
  const values = [
    { icon: Target, title: 'פשוט. חד. ממוקד.', label: 'גישה', desc: 'בלי רעש, בלי עודף פיצ׳רים, רק מה שגורם לדברים לזוז.', gradient: 'from-indigo-500 to-purple-600' },
    { icon: Palette, title: 'Luxury Light', label: 'עיצוב', desc: 'מערכת שנראית כמו מוצר פרימיום, ונשארת קריאה ונוחה כל היום.', gradient: 'from-rose-500 to-pink-600' },
    { icon: Zap, title: 'מהירות ויציבות', label: 'ביצועים', desc: 'תהליכים קצרים, UI זורם, ותוצאות שמגיעות מהר.', gradient: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      
      <GlobalPromotionBanner onSignupPage />
      
      <main className="pt-20">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-indigo-200/30 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-purple-200/25 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/50 text-indigo-700 text-xs font-black shadow-sm">
              <Sparkles size={14} />
              <span>אודות</span>
            </div>
            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
              MISRAD AI
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600">
                מערכת שנבנתה לעבודה אמיתית
              </span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
              אנחנו בונים את Misrad AI כדי לתת לעסקים בישראל מערכת אחת שמרכזת הכל: ניהול, תהליכים, צוות, לקוחות ותובנות — בלי רעש ובלי מערכות מפוזרות.
            </p>

            <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {values.map((v) => (
                <div key={v.label} className="group rounded-2xl sm:rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${v.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <v.icon size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="mt-4 sm:mt-5 text-xs font-black text-slate-500">{v.label}</div>
                  <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black text-slate-900">{v.title}</div>
                  <div className="mt-2 sm:mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">{v.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all"
              >
                ראה מחירים
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black hover:bg-slate-50 hover:shadow-lg transition-all"
              >
                צור קשר
              </Link>
            </div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6">הסיפור שלנו</h2>
            <div className="space-y-4 text-slate-700 leading-relaxed">
              <p>
                <strong className="text-slate-900">MISRAD AI</strong> נולד מתוך תסכול אמיתי. בעלי עסקים בישראל משלמים ל-4-5 תוכנות שונות כדי לנהל את העסק — CRM, ניהול משימות, שיווק, חשבוניות, ותפעול. המידע מפוזר, לא מסתנכרן, ועולה הון.
              </p>
              <p>
                החלטנו לבנות מערכת אחת שמרכזת הכל. <strong className="text-slate-900">6 מודולים שמדברים אחד עם השני</strong> — מהליד הראשון ועד החשבונית האחרונה. עם AI שעוזר לקבל החלטות, לא רק להציג נתונים.
              </p>
              <p>
                המערכת בנויה בישראל, בעברית מלאה, עם תמיכה בלוח שנה עברי, מצב שבת, ושליטה קולית בעברית. <strong className="text-slate-900">זה לא תרגום של מוצר אמריקאי</strong> — זה מוצר שנבנה מהיסוד עבור השוק הישראלי.
              </p>
            </div>
          </div>
        </section>

        {/* Numbers Section */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-8 text-center">במספרים</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-indigo-700">6</div>
                <div className="text-sm text-slate-600 mt-1">מודולים מובנים</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-indigo-700">100%</div>
                <div className="text-sm text-slate-600 mt-1">עברית מלאה</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-indigo-700">AI</div>
                <div className="text-sm text-slate-600 mt-1">מובנה בכל מודול</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                <div className="text-3xl font-black text-indigo-700">₪149</div>
                <div className="text-sm text-slate-600 mt-1">מתחיל מ-</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
