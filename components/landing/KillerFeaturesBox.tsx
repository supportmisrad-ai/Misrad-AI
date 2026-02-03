'use client';

import { Bot, Handshake, Mic, Tablet, Star } from 'lucide-react';

export default function KillerFeaturesBox({ id }: { id?: string }) {
  const items = [
    {
      icon: Mic,
      title: 'תדבר איתי',
      desc: "לא בא לך להקליד? לחץ על המיקרופון ואמור 'טיוטת חשבונית למשה'. זה מוכן.",
      color: 'bg-rose-600',
      bg: 'bg-rose-50',
    },
    {
      icon: Bot,
      title: 'צוות AI אישי',
      desc: 'נתקעת? הבוט שלנו לא סתם שולח לינק. הוא מסביר לך בעברית מה לעשות, 24/6.',
      color: 'bg-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      icon: Tablet,
      title: 'הטאבלט שסוגר פינה',
      desc: 'יש לך עובדים בלי סמארטפון? שים טאבלט פשוט בכניסה והוא הופך לשעון נוכחות חכם ברגע.',
      color: 'bg-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Star,
      title: 'מקור הברכה',
      desc: 'מערכת שמכבדת את שומרי השבת. נחה בשבת כדי לאגור כוחות לשבוע העבודה המבורך.',
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: Handshake,
      title: 'אל תזרוק כסף',
      desc: 'יש לך ליד שלא מתאים לך? העבר אותו בלחיצת כפתור לקבלן משנה ושמור על המוניטין.',
      color: 'bg-amber-600',
      bg: 'bg-amber-50',
    },
  ];

  return (
    <section id={id} className="py-20 sm:py-28 bg-gradient-to-b from-white via-slate-50/30 to-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-rose-100/30 rounded-full blur-[80px]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            Beyond Software
          </div>
          <h2 className="mt-6 text-3xl sm:text-4xl md:text-5xl font-black text-slate-900">
            מעבר לתוכנה רגילה
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            המתחרים מוכרים פיצ׳רים. <span className="font-semibold text-slate-700">כאן אתה מקבל טכנולוגיה שסוגרת בעיות אמיתיות בשטח.</span>
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((it) => (
            <div 
              key={it.title} 
              className={`group rounded-3xl border border-slate-200/80 bg-white p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
            >
              <div className={`w-14 h-14 rounded-2xl ${it.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300`}>
                <it.icon size={24} />
              </div>
              <div className="mt-5 font-black text-slate-900 text-lg">{it.title}</div>
              <div className="mt-2 text-sm text-slate-600 leading-relaxed">{it.desc}</div>
              <div className={`mt-4 h-1 w-12 rounded-full ${it.color} opacity-40 group-hover:w-full group-hover:opacity-70 transition-all duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
