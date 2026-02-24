'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

type SalesFaqVariant = 'default' | 'system' | 'client';

const variantStyles: Record<
  SalesFaqVariant,
  {
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    titleGradient: string;
    cardBorder: string;
    cardBg: string;
    summaryHoverBg: string;
  }
> = {
  default: {
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
    titleGradient: 'from-indigo-600 to-purple-600',
    cardBorder: 'border-slate-200',
    cardBg: 'bg-white',
    summaryHoverBg: 'hover:bg-slate-50',
  },
  system: {
    badgeBg: 'bg-indigo-50',
    badgeBorder: 'border-indigo-200',
    badgeText: 'text-indigo-700',
    titleGradient: 'from-indigo-600 via-purple-600 to-indigo-600',
    cardBorder: 'border-slate-200',
    cardBg: 'bg-white',
    summaryHoverBg: 'hover:bg-slate-50',
  },
  client: {
    badgeBg: 'bg-white',
    badgeBorder: 'border-[#C5A572]/30',
    badgeText: 'text-[#C5A572]',
    titleGradient: 'from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]',
    cardBorder: 'border-slate-200',
    cardBg: 'bg-white',
    summaryHoverBg: 'hover:bg-slate-50',
  },
};

export function SalesFaq({ variant = 'default' }: { variant?: SalesFaqVariant }) {
  const styles = variantStyles[variant];

  const items: Array<{ q: string; a: React.ReactNode }> = [
    {
      q: 'כמה זמן לוקח להתחיל לעבוד?',
      a: 'מקסימום 10 דקות. נרשמים, מוסיפים את הצוות, ומתחילים לפתוח קריאות. זה באמת פשוט.',
    },
    {
      q: 'צריך הדרכה?',
      a: 'לרוב לא. המערכת בנויה להיות אינטואיטיבית. יש תמיכה בעברית בכל שעה אם צריך.',
    },
    {
      q: 'אפשר לייבא נתונים קיימים?',
      a: 'כן. תשלחו לנו את האקסלים ואנחנו נעזור לייבא אותם. זה חלק מהשירות.',
    },
    {
      q: 'מה קורה אחרי רכישה?',
      a: 'מיד אחרי התשלום תקבל גישה למערכת שבחרת. אפשר להוסיף משתמשים לפי החבילה ולהתחיל לעבוד.',
    },
    {
      q: 'אפשר להתחיל ממודול אחד ואז להתרחב?',
      a: 'כן. אפשר להתחיל ממודול בודד, לעבור לחבילה, או למשרד מלא — לפי מה שמתאים לעסק.',
    },
    {
      q: 'אפשר לשדרג או לשנות חבילה?',
      a: 'כן. שדרוג אפשר לבצע בכל עת. לשינוי/התאמת חבילה — אנחנו עוזרים דרך התמיכה כדי לוודא שהכול נשאר מסודר.',
    },
    {
      q: 'איך מתבצע התשלום?',
      a: 'במסך התשלום תראה בדיוק מה בחרת ומה המחיר, ותקבל הנחיות להשלמת התשלום. לאחר מכן ההפעלה מתבצעת אוטומטית.',
    },
    {
      q: 'המערכת עובדת בשבת?',
      a: (
        <span>
          כברירת מחדל — <strong className="text-slate-900">המערכת פועלת גם בשבת</strong>. ניתן להפעיל מצב שבת ידנית בהגדרות הארגון, ואז המערכת תהיה מושבתת בשבת ותחזור לפעול אוטומטית אחרי צאת הכוכבים.{' '}
          <strong className="text-slate-900">למעט בתי רפואה ומוסדות רפואיים</strong> — עבורם ניתן לבקש הפעלה מלאה ללא הגבלת שבת.
        </span>
      ),
    },
    {
      q: 'איזה מודלי AI מפעילים את המערכת?',
      a: (
        <span>
          המערכת מבוססת על <strong className="text-slate-900">GPT-4o של OpenAI</strong> ו-<strong className="text-slate-900">Claude של Anthropic</strong> — המודלים המתקדמים ביותר בעולם.
          כל פעולת AI מופנית למודל הכי מתאים למשימה, והמערכת מתעדכנת אוטומטית כשיוצאים מודלים חדשים.
        </span>
      ),
    },
    {
      q: 'איפה הנתונים שלי נשמרים? מה עם אבטחה?',
      a: (
        <span>
          הנתונים מאוחסנים על שרתי ענן מאובטחים עם <strong className="text-slate-900">הצפנה בסטנדרט בנקאי (AES-256)</strong>, גיבוי אוטומטי יומי וניטור 24/7.
          אנחנו עומדים בדרישות <strong className="text-slate-900">חוק הגנת הפרטיות הישראלי</strong> ובתקני <strong className="text-slate-900">GDPR</strong>.
          אנחנו לא משתמשים בנתונים שלך לאימון מודלים — לעולם.
        </span>
      ),
    },
    {
      q: 'מה קורה אם ארצה לעזוב? הנתונים שלי שבויים?',
      a: (
        <span>
          <strong className="text-slate-900">ממש לא.</strong> כל הנתונים שלך — לקוחות, עסקאות, משימות, מסמכים — ניתנים לייצוא מלא ל-CSV או Excel בכל רגע, ישירות מהמערכת.
          בלי עמלות יציאה, בלי עיכובים. הנתונים שייכים לך — אנחנו רק מספקי השירות.
        </span>
      ),
    },
    {
      q: 'איך מרכז התקשורת והחייגן עובדים?',
      a: (
        <span>
          מרכז התקשורת כולל <strong className="text-slate-900">חייגן מובנה</strong> שמתחבר למרכזיית הענן שלך —{' '}
          <strong className="text-slate-900">Voicenter או Twilio</strong>. כל ארגון מביא את החשבון שלו (BYOC), מזין את הקרדנשיאלס בהגדרות,
          ומתחיל לחייג ישירות מהמערכת. <strong className="text-slate-900">לא צריך מספר חדש</strong> — עובדים עם המספרים הקיימים שלכם.
        </span>
      ),
    },
    {
      q: 'יש API לחיבור מערכות חיצוניות?',
      a: 'כן. יש API מתועד שמאפשר חיבור לכל מערכת חיצונית — Zapier, Make, או אינטגרציה ישירה. צריך עזרה בחיבור? הצוות שלנו ילווה אותך.',
    },
    {
      q: 'למה לבחור ב-MISRAD AI ולא ב-Monday או GoHighLevel?',
      a: (
        <span>
          Monday ו-GoHighLevel הן מערכות מצוינות — לעסקים אמריקאיים.{' '}
          <strong className="text-slate-900">MISRAD AI נבנתה מאפס לשוק הישראלי</strong>: עברית מהשורש (לא תרגום), לוח שנה עברי, התאמה לרגולציה ישראלית, מצב שבת, ותמיכה אנושית בעברית.
          בנוסף, אתה מקבל ליווי אישי — לא מספר טיקט.
        </span>
      ),
    },
    {
      q: 'אפשר לנסות לפני שמתחייבים?',
      a: (
        <span>
          <strong className="text-slate-900">כן, 7 ימי ניסיון חינם</strong> ללא כרטיס אשראי.
          תיכנס, תפתח חשבון, תנסה את כל המערכת — ואז תחליט. אנחנו מאמינים שהמוצר ידבר בעד עצמו.
        </span>
      ),
    },
  ];

  return (
    <section className="py-20 sm:py-24" dir="rtl">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-12">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-bold mb-6 backdrop-blur-md ${styles.badgeBg} ${styles.badgeBorder} ${styles.badgeText}`}
          >
            <span>שאלות נפוצות</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 mb-4">
            יש לך שאלה?
            <br />
            <span className={`text-transparent bg-clip-text bg-gradient-to-r ${styles.titleGradient}`}>הנה התשובות</span>
          </h2>

          <p className="text-slate-600 max-w-2xl mx-auto">קצר, ברור, בלי אותיות קטנות.</p>
        </div>

        <div className={`rounded-3xl border overflow-hidden ${styles.cardBg} ${styles.cardBorder}`}>
          {items.map((item, idx) => (
            <details key={idx} className={`group ${idx === 0 ? '' : `border-t ${styles.cardBorder}`}`}>
              <summary
                className={`cursor-pointer list-none px-6 py-5 text-slate-900 font-bold flex items-center justify-between gap-4 ${styles.summaryHoverBg}`}
              >
                <span className="text-sm sm:text-base">{item.q}</span>
                <span
                  className="shrink-0 w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-700 transition-all group-open:bg-slate-900 group-open:border-slate-900 group-open:text-white"
                  aria-hidden="true"
                >
                  <span className="group-open:hidden">
                    <Plus size={18} />
                  </span>
                  <span className="hidden group-open:block">
                    <Minus size={18} />
                  </span>
                </span>
              </summary>
              <div className="px-6 pb-6 mt-4 text-sm sm:text-base text-slate-700 leading-7 font-medium text-right">{item.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
