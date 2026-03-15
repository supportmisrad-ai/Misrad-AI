'use client';

import { Bot, FileSpreadsheet, Link, Mic, Tablet, Star } from 'lucide-react';

export default function KillerFeaturesBox({ id }: { id?: string }) {
  const items = [
    {
      icon: Mic,
      title: 'פקודות קוליות',
      desc: "הידיים תפוסות? פשוט תגיד מה לעשות. המערכת מבינה עברית ומבצעת מיד.",
      color: 'bg-rose-600',
      bg: 'bg-rose-50',
    },
    {
      icon: Bot,
      title: 'עובד AI צמוד',
      desc: 'ה-AI סוגר לך פינות: שולח וואטסאפ ללידים, מזכיר ללקוחות לשלם ומעלה פוסטים.',
      color: 'bg-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      icon: Tablet,
      title: 'מצב שטח (Kiosk)',
      desc: 'טאבלט בכניסה לעסק שהופך לכלי דיווח מהיר לעובדים בלי סיבוכים.',
      color: 'bg-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      icon: Star,
      title: 'הגנת שבת',
      desc: 'המערכת ננעלת הרמטית בשבת וחגים. העסק נח, וגם אתה. זה ה-V.I.P האמיתי.',
      color: 'bg-purple-600',
      bg: 'bg-purple-50',
    },
    {
      icon: Link,
      title: 'טופס לידים ציבורי',
      desc: 'לינק ייחודי לשיתוף — לידים נכנסים ישר למערכת בלי הגדרות.',
      color: 'bg-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: FileSpreadsheet,
      title: 'ייבוא חכם (Excel)',
      desc: 'מעלים קובץ לקוחות — ה-AI מזהה הכל ומכניס למערכת בלי טעויות.',
      color: 'bg-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <section id={id} className="py-20 sm:py-28 bg-gradient-to-b from-white via-slate-50/30 to-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-rose-100/30 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900">
            כלים שעובדים בשבילך
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
            בלי מטאפורות. בלי סיבוכים. יכולות שסוגרות לך פינות בעסק.
          </p>
        </div>

        <div className="mt-10 sm:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((it) => (
            <div 
              key={it.title} 
              className={`group rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 cursor-pointer`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${it.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform duration-300`}>
                <it.icon size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div className="mt-4 sm:mt-5 font-black text-slate-900 text-base sm:text-lg">{it.title}</div>
              <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">{it.desc}</div>
              <div className={`mt-4 h-1 w-12 rounded-full ${it.color} opacity-40 group-hover:w-full group-hover:opacity-70 transition-all duration-300`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
