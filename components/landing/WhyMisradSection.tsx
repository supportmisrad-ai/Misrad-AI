'use client';

import React from 'react';
import { Heart, Headphones, Languages, Scale, Sparkles } from 'lucide-react';

export function WhyMisradSection() {
  const advantages = [
    {
      icon: Headphones,
      title: 'ליווי אישי — לא טיקט',
      desc: 'בחברות ענק אתה מספר. אצלנו יש לך איש קשר שמכיר את העסק שלך. תמיכה אנושית בעברית, לא צ׳אטבוט באנגלית.',
      color: 'bg-rose-600',
      gradient: 'from-rose-50 to-white',
    },
    {
      icon: Languages,
      title: 'עברית מהשורש — לא תרגום',
      desc: 'לוח שנה עברי, תאריכים עבריים, RTL מושלם, AI שמבין עברית. לא תרגום של מערכת אמריקאית — בנוי מאפס בעברית.',
      color: 'bg-indigo-600',
      gradient: 'from-indigo-50 to-white',
    },
    {
      icon: Scale,
      title: 'מותאם לרגולציה ישראלית',
      desc: 'חוק הגנת הפרטיות, חוק שעות עבודה ומנוחה, חגים ישראלים, מצב שבת — המערכת מכירה את המציאות הישראלית.',
      color: 'bg-emerald-600',
      gradient: 'from-emerald-50 to-white',
    },
    {
      icon: Heart,
      title: 'עסק ישראלי אמיתי',
      desc: 'לא סטארטאפ שמחפש אקזיט. חברה ישראלית שהמטרה שלה לתת לעסקים ישראליים כלי שלא היה קיים עד היום.',
      color: 'bg-amber-600',
      gradient: 'from-amber-50 to-white',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 right-1/3 w-[500px] h-[500px] bg-rose-100/25 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black mb-4">
            <Sparkles size={14} />
            למה דווקא אנחנו
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            &quot;למה לא Monday? למה לא GoHighLevel?&quot;
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
            שאלה לגיטימית. הנה 4 סיבות שבגללן עסקים ישראליים בוחרים דווקא ב-MISRAD AI.
          </p>
        </div>

        {/* Advantages Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {advantages.map((a, idx) => (
            <div
              key={a.title}
              className={`group relative rounded-3xl bg-gradient-to-br ${a.gradient} border border-slate-200 hover:border-slate-300 p-7 sm:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}
            >
              {/* Number badge */}
              <div className="absolute top-5 left-5 w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400">
                {idx + 1}
              </div>

              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl ${a.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <a.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900">{a.title}</h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">{a.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-12 text-center">
          <div className="inline-block rounded-2xl bg-white border border-slate-200 px-6 py-4 shadow-lg">
            <p className="text-sm text-slate-600">
              <strong className="text-slate-900">שורה תחתונה:</strong>{' '}
              Monday ו-GoHighLevel הן מערכות מצוינות — לעסקים אמריקאיים.
              <br />
              MISRAD AI נבנתה <strong className="text-indigo-600">מאפס</strong> לעסקים ישראליים. זה ההבדל.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
