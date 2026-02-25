import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getContentByKey } from '@/app/actions/site-content';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default async function SecurityPage() {
  const result = await getContentByKey('legal', 'documents', 'security_markdown');
  const markdown = typeof result.data === 'string' ? result.data : null;

  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-slate-200/35 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-indigo-200/20 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>אבטחה</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">מדיניות אבטחת מידע</h1>
            <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              {markdown ? (
                <MarkdownRenderer content={markdown} />
              ) : (
                <div className="prose prose-slate max-w-none text-right" dir="rtl">
                  <h2 className="text-2xl font-black text-slate-900 mb-4">המחויבות שלנו לאבטחת המידע שלך</h2>
                  <p className="text-slate-700 leading-relaxed mb-6">
                    ב-MISRAD AI אנחנו מתייחסים לאבטחת המידע של הלקוחות שלנו ברצינות המרבית. המערכת נבנתה מהיסוד עם שכבות הגנה מתקדמות כדי להבטיח שהנתונים שלך בטוחים, פרטיים ונגישים רק למי שמורשה.
                  </p>

                  <h3 className="text-xl font-black text-slate-900 mt-8 mb-3">הצפנה ואחסון</h3>
                  <ul className="space-y-2 text-slate-700 list-disc pr-6 mb-6">
                    <li>כל הנתונים מוצפנים בסטנדרט בנקאי <strong>AES-256</strong> — הן בהעברה (TLS 1.3) והן באחסון.</li>
                    <li>הנתונים מאוחסנים על שרתי ענן מאובטחים עם גיבוי אוטומטי יומי.</li>
                    <li>גישה לשרתים מוגבלת ומנוטרת 24/7.</li>
                  </ul>

                  <h3 className="text-xl font-black text-slate-900 mt-8 mb-3">עמידה בתקנים</h3>
                  <ul className="space-y-2 text-slate-700 list-disc pr-6 mb-6">
                    <li>עמידה בדרישות <strong>חוק הגנת הפרטיות הישראלי</strong> ותקנות אבטחת מידע.</li>
                    <li>תאימות לתקני <strong>GDPR</strong> האירופיים.</li>
                    <li>הפרדת נתונים מלאה בין ארגונים (Multi-tenant isolation).</li>
                  </ul>

                  <h3 className="text-xl font-black text-slate-900 mt-8 mb-3">שליטה על הנתונים</h3>
                  <ul className="space-y-2 text-slate-700 list-disc pr-6 mb-6">
                    <li>הנתונים שייכים לך — תמיד. ייצוא מלא ל-CSV או Excel בכל רגע.</li>
                    <li>אנחנו <strong>לא משתמשים בנתונים שלך לאימון מודלים</strong> — לעולם.</li>
                    <li>מחיקת נתונים מלאה לפי בקשה, בהתאם לזכות המחיקה.</li>
                  </ul>

                  <h3 className="text-xl font-black text-slate-900 mt-8 mb-3">אימות וגישה</h3>
                  <ul className="space-y-2 text-slate-700 list-disc pr-6 mb-6">
                    <li>אימות מאובטח דרך <strong>Clerk</strong> עם תמיכה ב-OAuth (Google) ו-MFA.</li>
                    <li>ניהול הרשאות מבוסס תפקידים (RBAC) — כל משתמש רואה רק מה שמותר לו.</li>
                    <li>לוג פעולות לביקורת ומעקב.</li>
                  </ul>

                  <h3 className="text-xl font-black text-slate-900 mt-8 mb-3">יצירת קשר בנושא אבטחה</h3>
                  <p className="text-slate-700 leading-relaxed mb-4">
                    לשאלות, דיווחים על חולשות אבטחה, או בקשות הנוגעות לפרטיות — ניתן לפנות אלינו:
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold shadow-lg shadow-slate-900/10"
                    >
                      צור קשר
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
