import Link from 'next/link';
import { ClipboardCheck, ArrowLeft, Sparkles, Target, Rocket, Share2, Users, TrendingUp } from 'lucide-react';

export function LandingModulesSection() {
  return (
    <section id="solution" className="py-12 sm:py-20 md:py-28 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black mb-3 sm:mb-4">
            <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
            קורת גג אחת
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
            6 מודולים. מערכת אחת.
          </h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-slate-600">
            בחרו רק את מה שאתם צריכים, או קבלו את הכל
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {[
            {
              name: 'Operations - מודול אופרציה',
              title: 'שטח, מלאי וספקים',
              desc: 'שיבוץ טכנאי חכם ב-AI, סיכום קריאות אוטומטי, צ׳אט שטח עם הקלטות קוליות, גלריית תמונות, ניהול מלאי ורכבים, מעקב SLA',
              icon: ClipboardCheck,
              gradient: 'from-emerald-500 to-teal-600',
              href: '/operations'
            },
            {
              name: 'System - מודול סיסטם',
              title: 'ניהול מכירות ולידים',
              desc: 'ניהול לידים, מרכזיית ענן, ניתוח מכירות ב-AI, ניהול קורס מכירות, סיוע AI להתנגדויות ב-LIVE, ליווי עסקאות, אוטומציות, דוחות',
              icon: Target,
              gradient: 'from-blue-500 to-indigo-600',
              href: '/system'
            },
            {
              name: 'Nexus - מודול נקסוס',
              title: 'ניהול משימות, לקוחות וצוות',
              desc: 'ניהול משימות, צוות, ניתוח התקדמות עסקי, דו"ח רווחיות עובדים ב-AI, שעון נוכחות, מעקב אחר התקדמות',
              icon: Rocket,
              gradient: 'from-purple-500 to-pink-600',
              href: '/nexus'
            },
            {
              name: 'Social - מודול סושיאל',
              title: 'שיווק, תוכן וקמפיינים',
              desc: 'ניהול תוכן לרשתות, בניית אסטרטגיות שיווק, פוסטים, לוח שידורים, AI, מעקב קמפיינים',
              icon: Share2,
              gradient: 'from-rose-500 to-orange-500',
              href: '/social'
            },
            {
              name: 'Client - מודול קליינט',
              title: 'ניהול ומעקב VIP ללקוחות',
              desc: 'ניהול לקוחות, פגישות, תוכניות, ניהול קבוצות ומחזורים, מעקב אחר תהליך לקוח (פגישות/אימונים), פורטל ייעודי ללקוח למעקב וביצוע משימות, משוב, ניתוח הקלטות ופענוח פגישות ב-AI',
              icon: Users,
              gradient: 'from-amber-500 to-yellow-500',
              href: '/client'
            },
            {
              name: 'Finance - מודול פיננס ',
              title: 'אינטגרציה עם החשבוניות',
              desc: 'חשבוניות, הוצאות, דוחות, אינטגרציותאינטגרציה לחשבונית ירוקה (מורנינג) ועוד, ניהול כספים ותקציבים, אינטגרציה עם שאר המודולים להצעות מחיר וחשבוניות אוטומטיות, ',
              icon: TrendingUp,
              gradient: 'from-cyan-500 to-blue-500',
              href: '/finance'
            },
          ].map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.name}
                href={module.href}
                className="group relative bg-white rounded-xl sm:rounded-2xl md:rounded-3xl border border-slate-200 p-4 sm:p-6 md:p-8 hover:shadow-2xl hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className="relative">
                  {/* Icon */}
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-6`}>
                    <Icon size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                  </div>

                  {/* Content */}
                  <div className="mb-3 sm:mb-4">
                    <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                      {module.name}
                    </div>
                    <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                      {module.title}
                    </h3>
                  </div>
                  
                  <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs md:text-sm">
                    {module.desc}
                  </p>

                  {/* Arrow */}
                  <div className="mt-3 sm:mt-4 md:mt-6 flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>למידע נוסף</span>
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="mt-14 text-center">
          <p className="text-slate-600 mb-6">רוצים לראות איך זה עובד ביחד?</p>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-black shadow-[0_18px_45px_-18px_rgba(15,23,42,0.65)] ring-1 ring-white/10 hover:bg-slate-800 hover:shadow-[0_24px_60px_-20px_rgba(15,23,42,0.75)] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/15"
          >
            ראו חבילות ומחירים
            <ArrowLeft size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
