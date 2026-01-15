import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-blue-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>פרטיות</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">מדיניות פרטיות</h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              דף זה הוא placeholder זמני. לפני השקה נכניס כאן מדיניות מלאה ומדויקת.
            </p>

            <div className="mt-10 space-y-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">מה אנחנו אוספים</div>
                <div className="mt-2 text-sm text-slate-600">פרטי משתמש, נתוני שימוש במוצר, ונתונים תפעוליים לצורך אספקת השירות.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">איך אנחנו משתמשים בנתונים</div>
                <div className="mt-2 text-sm text-slate-600">אימות, תמיכה, שיפור חוויית שימוש, ואבטחה.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6">
                <div className="font-black text-slate-900">יצירת קשר</div>
                <div className="mt-2 text-sm text-slate-600">לשאלות בנושא פרטיות אפשר לפנות דרך דף יצירת קשר.</div>
                <div className="mt-4">
                  <Link href="/contact" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/10">
                    צור קשר
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-10 text-sm text-slate-500">
              מסמך זה אינו משפטי ואינו מחייב, והוא יוחלף במסמך רשמי.
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
