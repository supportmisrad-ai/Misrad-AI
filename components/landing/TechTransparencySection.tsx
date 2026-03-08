'use client';

import React from 'react';
import { Cpu, RefreshCw, Plug, Globe, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function TechTransparencySection() {
  const cards = [
    {
      icon: Cpu,
      title: 'מודלי AI מהשורה הראשונה',
      desc: 'MISRAD AI מופעלת על גבי המודלים המתקדמים בעולם — GPT-4o של OpenAI ו-Claude של Anthropic. כל פעולת AI במערכת רצה על המודל הכי מתאים למשימה.',
      color: 'bg-purple-600',
      bg: 'from-purple-50 to-white',
      borderHover: 'hover:border-purple-300',
    },
    {
      icon: RefreshCw,
      title: 'מתעדכנת אוטומטית',
      desc: 'כשמודל חדש ומתקדם יותר יוצא לשוק — המערכת מתעדכנת אוטומטית. אתה תמיד על הטכנולוגיה הכי חדשה, בלי לעשות כלום.',
      color: 'bg-indigo-600',
      bg: 'from-indigo-50 to-white',
      borderHover: 'hover:border-indigo-300',
    },
    {
      icon: Plug,
      title: 'API פתוח לחיבורים',
      desc: 'צריך לחבר מערכת חיצונית? יש API מתועד שמאפשר אינטגרציה עם כל כלי שתרצה — Zapier, Make, או חיבור ישיר.',
      color: 'bg-emerald-600',
      bg: 'from-emerald-50 to-white',
      borderHover: 'hover:border-emerald-300',
    },
    {
      icon: Globe,
      title: 'עברית מהיסוד',
      desc: 'לא תרגום של מערכת אמריקאית. נבנתה מהשורש בעברית — ממשק, AI, תמיכה, תאריכים עבריים, והתאמה לרגולציה הישראלית.',
      color: 'bg-amber-600',
      bg: 'from-amber-50 to-white',
      borderHover: 'hover:border-amber-300',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 via-white to-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-100/30 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight">
            מה מפעיל את המערכת?
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            אנחנו לא מסתתרים מאחורי מילת &quot;AI&quot;. הנה בדיוק מה שרץ מתחת למכסה.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div
              key={card.title}
              className={`group rounded-3xl bg-gradient-to-br ${card.bg} border border-slate-200 ${card.borderHover} p-7 sm:p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300`}
            >
              <div className="flex items-start gap-5">
                <div className={`w-14 h-14 rounded-2xl ${card.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                  <card.icon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-black text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">{card.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tech Stack Strip */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-right">
              <div className="text-sm font-black text-slate-900">תשתית טכנולוגית</div>
              <div className="mt-1 text-xs text-slate-500">המערכת בנויה על תשתיות ענן מובילות עם זמינות של 99.9%</div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {[
                { name: 'OpenAI GPT-4o', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                { name: 'Anthropic Claude', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                { name: 'Vercel', color: 'bg-slate-50 text-slate-700 border-slate-200' },
                { name: 'Supabase', color: 'bg-green-50 text-green-700 border-green-200' },
                { name: 'PostgreSQL', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              ].map((tech) => (
                <span key={tech.name} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${tech.color}`}>
                  {tech.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 transition-colors group"
          >
            רוצה לדעת עוד? דברו איתנו
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
