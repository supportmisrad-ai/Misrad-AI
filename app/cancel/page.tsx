import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-red-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>ביטול עסקה</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">ביטול עסקה</h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-2xl">
              בהתאם לחוק הגנת הצרכן, תשמ&quot;א-1981 (סעיף 14ג), ניתן לבטל עסקת מכר מרחוק בתנאים המפורטים להלן.
            </p>

            <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">זכות הביטול</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  בהתאם לחוק הגנת הצרכן, רשאי צרכן לבטל עסקת מכר מרחוק <strong>תוך 14 ימים</strong> ממועד ביצוע העסקה או ממועד קבלת מסמך פרטי העסקה — לפי המאוחר מביניהם.
                </p>
                <p className="text-slate-700 leading-relaxed mb-6">
                  במקרה של ביטול, רשאי העוסק לגבות דמי ביטול בשיעור שלא יעלה על <strong>5% ממחיר העסקה או 100 ₪ — הנמוך מביניהם</strong>.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">כיצד לבטל</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  ניתן לשלוח הודעת ביטול באחת מהדרכים הבאות:
                </p>
                <ul className="list-disc list-inside space-y-3 text-slate-700 mb-6">
                  <li>
                    <strong>בדוא&quot;ל:</strong>{' '}
                    <a href="mailto:support@misrad-ai.com" className="text-indigo-600 hover:text-indigo-700 font-bold">
                      support@misrad-ai.com
                    </a>
                  </li>
                  <li>
                    <strong>בטלפון / וואטסאפ:</strong>{' '}
                    <a href="https://wa.me/972512239520" className="text-indigo-600 hover:text-indigo-700 font-bold" dir="ltr">
                      051-2239520
                    </a>
                  </li>
                  <li>
                    <strong>דרך המערכת:</strong> באזור ניהול החשבון, תחת &quot;הגדרות מנוי&quot;.
                  </li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">פרטים שיש לכלול בהודעת הביטול</h2>
                <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
                  <li>שם מלא</li>
                  <li>מספר תעודת זהות</li>
                  <li>שם הארגון / מספר הזמנה</li>
                  <li>פירוט הסיבה לביטול (אופציונלי)</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">מועד כניסת הביטול לתוקף</h2>
                <p className="text-slate-700 leading-relaxed mb-6">
                  הביטול ייכנס לתוקף בסוף תקופת החיוב הנוכחית (אלא אם צוין אחרת). לאחר הביטול, הגישה למערכת תישמר עד תום התקופה ששולמה עבורה, ולא יתבצע חיוב נוסף.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">החזר כספי</h2>
                <p className="text-slate-700 leading-relaxed mb-6">
                  במקרה שהביטול בוצע בתוך 14 ימים מיום העסקה, יינתן החזר בניכוי דמי ביטול כחוק. החזר יבוצע תוך 14 ימי עסקים מקבלת הודעת הביטול, לאמצעי התשלום בו שולם.
                </p>
                <p className="text-slate-700 leading-relaxed mb-6">
                  למידע מלא על מדיניות ההחזרים:{' '}
                  <Link href="/refund-policy" className="text-indigo-600 hover:text-indigo-700 font-bold underline underline-offset-2">
                    מדיניות החזרים וזיכויים
                  </Link>
                </p>

                <div className="bg-slate-50 rounded-xl p-6 space-y-3 mt-8">
                  <div className="font-black text-slate-900 text-lg">פרטי יצירת קשר</div>
                  <div><strong>שם העסק:</strong> MISRAD AI</div>
                  <div><strong>ע.מ:</strong> 314885518</div>
                  <div><strong>כתובת:</strong> הפסנתר 9, ראשון לציון, ישראל</div>
                  <div><strong>דוא&quot;ל:</strong>{' '}
                    <a href="mailto:support@misrad-ai.com" className="text-indigo-600 hover:text-indigo-700">support@misrad-ai.com</a>
                  </div>
                  <div><strong>טלפון:</strong>{' '}
                    <a href="https://wa.me/972512239520" className="text-indigo-600 hover:text-indigo-700" dir="ltr">051-2239520</a>
                  </div>
                  <div><strong>אתר:</strong>{' '}
                    <a href="https://misrad-ai.com" className="text-indigo-600 hover:text-indigo-700">misrad-ai.com</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
