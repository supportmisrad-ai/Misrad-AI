import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { Target, Palette, Zap, ArrowLeft, Sparkles } from 'lucide-react';
import GlobalPromotionBanner from '@/components/promotions/GlobalPromotionBanner';
import ContextualBannerDisplay from '@/components/promotions/ContextualBannerDisplay';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function AboutPage() {
  const values = [
    { icon: Target, title: 'פשוט. חד. ממוקד.', label: 'גישה', desc: 'בלי רעש, בלי עודף פיצ׳רים, רק מה שגורם לדברים לזוז.', gradient: 'from-slate-900 to-slate-800' },
    { icon: Palette, title: 'עיצוב פרימיום', label: 'חוויה', desc: 'מערכת שנראית כמו מוצר יוקרה, ונשארת קריאה ונוחה לשימוש אינטנסיבי.', gradient: 'from-slate-800 to-slate-700' },
    { icon: Zap, title: 'ביצועים אגרסיביים', label: 'מהירות', desc: 'תגובתיות מיידית, UI זורם, ותוצאות שמגיעות בלי לחכות.', gradient: 'from-slate-900 to-slate-700' },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      
      <ContextualBannerDisplay onLandingPage />
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
            <h1 className="mt-6 sm:mt-8 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight text-slate-900">
              MISRAD AI
              <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 drop-shadow-sm">
                מערכת שנבנתה לעבודה אמיתית
              </span>
            </h1>
              <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl leading-relaxed">
              אנחנו בונים את Misrad AI כדי לתת לעסקים בישראל מערכת אחת שמרכזת הכל: ניהול, תהליכים, צוות, לקוחות ותובנות — בלי רעש ובלי מערכות מפוזרות.
              <br />
              <span className="mt-4 block font-bold text-slate-900">ישיר. פשוט. חזק.</span>
            </p>

            <div className="mt-10 sm:mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
              {values.map((v) => (
                <div key={v.label} className="group rounded-3xl bg-white border-2 border-slate-100 p-8 hover:border-slate-900 transition-all duration-500 shadow-sm hover:shadow-2xl">
                  <div className={`w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <v.icon size={24} />
                  </div>
                  <div className="mt-6 text-xs font-black text-slate-400 uppercase tracking-widest">{v.label}</div>
                  <div className="mt-2 text-xl font-black text-slate-900">{v.title}</div>
                  <div className="mt-3 text-base text-slate-500 leading-relaxed font-medium">{v.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-12 flex flex-col sm:flex-row gap-4">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 hover:bg-slate-800 active:scale-[0.98] transition-all"
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
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 text-center shadow-sm hover:border-slate-200 transition-colors">
                <div className="text-4xl font-black text-slate-900">6</div>
                <div className="text-xs font-black text-slate-500 mt-2 uppercase tracking-widest">מודולים מובנים</div>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 text-center shadow-sm hover:border-slate-200 transition-colors">
                <div className="text-4xl font-black text-slate-900">100%</div>
                <div className="text-xs font-black text-slate-500 mt-2 uppercase tracking-widest">עברית מלאה</div>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 text-center shadow-sm hover:border-slate-200 transition-colors">
                <div className="text-4xl font-black text-slate-900">AI</div>
                <div className="text-xs font-black text-slate-500 mt-2 uppercase tracking-widest">מובנה בכל מודול</div>
              </div>
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-8 text-center shadow-sm hover:border-slate-200 transition-colors">
                <div className="text-4xl font-black text-slate-900">₪149</div>
                <div className="text-xs font-black text-slate-500 mt-2 uppercase tracking-widest">מחיר התחלתי</div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
