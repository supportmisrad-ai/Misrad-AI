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
          לא. <strong className="text-slate-900">מצב שבת הוא חובה ואוטומטי לכולם</strong> — המערכת לא פעילה בשבת, וחוזרת לעבוד לבד אחרי צאת הכוכבים.
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
