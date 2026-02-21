import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function AccessibilityPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-slate-200/40 rounded-full blur-[140px] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
              <span>נגישות</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-black leading-tight">הצהרת נגישות</h1>
            
            <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8">
              <div className="prose prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-slate-900 mb-4">מבוא ומחויבות</h2>
                <p className="text-slate-700 leading-relaxed mb-6">
                  אנו ב-MISRAD AI רואים חשיבות עליונה בהנגשת אתר האינטרנט שלנו לאנשים עם מוגבלויות, מתוך תפיסת עולם לפיה יש לאפשר לכלל האוכלוסייה, לרבות אנשים עם מוגבלויות, לגלוש וליהנות מהשירותים הניתנים באתר.
                  אנו משקיעים משאבים רבים בביצוע התאמות הנגישות הנדרשות, כדי להפוך את האתר לידידותי ונוח יותר לשימוש עבור אוכלוסיות בעלות צרכים מיוחדים.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">רמת הנגישות באתר</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  אתר זה הונגש בהתאם להוראות תקן ישראלי ת"י 5568 ("קווים מנחים לנגישות תכנים באינטרנט") ברמת AA (דאבל A), המבוסס על הנחיות WCAG 2.0 הבינלאומיות.
                </p>

                <h3 className="text-xl font-bold text-slate-900 mb-3">פעולות עיקריות שבוצעו במסגרת ההנגשה:</h3>
                <ul className="list-disc list-inside space-y-2 text-slate-700 mb-6">
                  <li><strong>תפריט נגישות:</strong> באתר מוטמע תפריט נגישות המאפשר לבצע התאמות כגון:
                    <ul className="list-disc list-inside mr-4 mt-2 space-y-1">
                      <li>הגדלת והקטנת גופנים</li>
                      <li>שינוי ניגודיות (גבוהה)</li>
                      <li>הדגשת קישורים</li>
                      <li>שינוי לפונט קריא</li>
                    </ul>
                  </li>
                  <li><strong>ניווט מקלדת:</strong> האתר מותאם באופן מלא לניווט באמצעות מקלדת בלבד (שימוש במקשי Tab, Shift + Tab והמקשים Enter ו-Space).</li>
                  <li><strong>קוראי מסך:</strong> האתר נבדק ותומך בטכנולוגיות מסייעות כגון קוראי מסך (דוגמת NVDA ו-JAWS).</li>
                  <li><strong>מבנה סמנטי:</strong> שימוש נכון בכותרות היררכיות (H1, H2 וכו'), רשימות, פסקאות וקישורים.</li>
                  <li><strong>טקסט חלופי:</strong> הוטמע טקסט אלטרנטיבי (Alt Text) עבור כל התמונות המשמעותיות באתר.</li>
                  <li><strong>רספונסיביות:</strong> האתר מותאם באופן מלא לתצוגה במכשירים ניידים (טלפונים חכמים וטאבלטים).</li>
                </ul>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">הסדרי נגישות פיזיים</h2>
                <p className="text-slate-700 leading-relaxed mb-6">
                  יצוין כי לעסק אין משרדים פיזיים המקבלים קהל. השירותים שלנו ניתנים באופן דיגיטלי (באתר, בדוא"ל ובטלפון) ו/או בפגישות בבית הלקוח. 
                  במקרה של צורך בפגישה פיזית, אנו נדאג להגיע למקום המונגש לצרכיו של הלקוח.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">חריגות (מה לא נגיש)</h2>
                <p className="text-slate-700 leading-relaxed mb-6">
                  אנו עושים כל מאמץ לשמור על נגישות מלאה של האתר. יחד עם זאת, ייתכן שיתגלו חלקים או עמודים שטרם הונגשו באופן מלא, או שטרם נמצא עבורם הפתרון הטכנולוגי המתאים.
                  ייתכן שסרטוני וידאו שהוטמעו באתר מאתרים חיצוניים כמו YouTube אינם מכילים כתוביות מלאות.
                  אנו ממשיכים במאמצים לשפר את נגישות האתר כחלק ממחויבותנו לאפשר שימוש בו עבור כלל האוכלוסייה, כולל אנשים עם מוגבלויות.
                </p>

                <h2 className="text-2xl font-bold text-slate-900 mb-4">פרטי רכז הנגישות</h2>
                <p className="text-slate-700 leading-relaxed mb-4">
                  אם נתקלת בבעיה, תקלה, או ליקוי כלשהו בנושא הנגישות באתר, או אם הינך זקוק לסיוע בקבלת מידע בפורמט נגיש, נשמח אם תפנה ישירות לרכז הנגישות של החברה:
                </p>
                
                <div className="bg-slate-50 rounded-xl p-6 space-y-3">
                  <div><strong>שם מלא:</strong> צוות MISRAD AI</div>
                  <div><strong>תפקיד:</strong> רכז נגישות</div>
                  <div><strong>דוא"ל:</strong> <a href="mailto:support@misrad-ai.com" className="text-indigo-600 hover:text-indigo-700">support@misrad-ai.com</a></div>
                  <div><strong>טלפון (כולל וואטסאפ):</strong> <a href="tel:054-1234567" className="text-indigo-600 hover:text-indigo-700" dir="ltr">054-1234567</a></div>
                </div>
                
                <p className="text-slate-700 leading-relaxed mt-6">
                  אנו מתחייבים לבדוק כל פנייה ולטפל בה בהקדם האפשרי, ולא יאוחר מ-60 ימים, על מנת לפתור את הבעיה ולספק מענה הולם.
                </p>
                
                <p className="text-slate-600 text-sm mt-8">
                  <strong>תאריך עדכון אחרון של ההצהרה:</strong> 3 בפברואר 2026
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
