'use client';

import { Bot, Handshake, Mic, Tablet } from 'lucide-react';

export default function KillerFeaturesBox({ id }: { id?: string }) {
  const items = [
    {
      icon: Mic,
      title: 'תדבר איתי',
      desc: "לא בא לך להקליד? לחץ על המיקרופון ואמור 'טיוטת חשבונית למשה'. זה מוכן.",
    },
    {
      icon: Bot,
      title: 'צוות AI אישי',
      desc: 'נתקעת? הבוט שלנו לא סתם שולח לינק. הוא מסביר לך בעברית מה לעשות, 24/7.',
    },
    {
      icon: Tablet,
      title: 'הטאבלט שסוגר פינה',
      desc: 'יש לך עובדים בלי סמארטפון? שים טאבלט פשוט בכניסה והוא הופך לשעון נוכחות חכם ברגע.',
    },
    {
      icon: Handshake,
      title: 'אל תזרוק כסף',
      desc: 'יש לך ליד שלא מתאים לך? העבר אותו בלחיצת כפתור לקבלן משנה ושמור על המוניטין.',
    },
  ];

  return (
    <section id={id} className="py-16 sm:py-20 bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center">
          <div className="text-xs font-black text-slate-500">Beyond Software</div>
          <h2 className="mt-3 text-3xl sm:text-4xl font-black text-slate-900">מעבר לתוכנה רגילה</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto leading-relaxed">
            המתחרים מוכרים פיצ׳רים. כאן אתה מקבל טכנולוגיה שסוגרת בעיות אמיתיות בשטח.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-900">
                <it.icon size={20} />
              </div>
              <div className="mt-4 font-black text-slate-900">{it.title}</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">{it.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
