import Link from 'next/link';
import { ClipboardCheck, ArrowLeft, Sparkles, Target, LayoutDashboard, Share2, HeartPulse, CreditCard, CircleCheckBig } from 'lucide-react';

const MODULES = [
  {
    name: 'Operations',
    nameHe: 'תפעול ושטח',
    title: 'קריאות שירות, טכנאים ומלאי',
    features: ['שיבוץ טכנאי חכם ב-AI', 'סיכום קריאות אוטומטי', 'צ׳אט שטח עם הקלטות', 'מעקב SLA ודחיפות', 'ניהול מלאי ורכבים'],
    icon: ClipboardCheck,
    gradient: 'from-sky-500 to-cyan-600',
    borderGlow: 'hover:border-sky-200',
    topBar: 'from-sky-400 to-cyan-500',
    href: '/operations',
  },
  {
    name: 'System',
    nameHe: 'מכירות ולידים',
    title: 'Pipeline מכירות מליד עד סגירה',
    features: ['ניהול לידים עם Pipeline ויזואלי', 'ייבוא חכם מאקסל — AI ממפה', 'ניתוח סיכויי סגירה ב-AI', 'חייגן מרכזיית ענן', 'דוחות מכירות ויעדים'],
    icon: Target,
    gradient: 'from-rose-500 to-red-600',
    borderGlow: 'hover:border-rose-200',
    topBar: 'from-rose-400 to-red-500',
    href: '/system',
  },
  {
    name: 'Nexus',
    nameHe: 'צוות ומשימות',
    title: 'חדר המנהלים של העסק',
    features: ['ניהול משימות ולוח שנה', 'שעון נוכחות + דוחות שעות', 'ניתוח רווחיות עובדים ב-AI', 'ניהול הרשאות ותפקידים', 'חיבור לכל המודולים'],
    icon: LayoutDashboard,
    gradient: 'from-indigo-500 to-purple-600',
    borderGlow: 'hover:border-indigo-200',
    topBar: 'from-indigo-400 to-purple-500',
    href: '/nexus',
  },
  {
    name: 'Social',
    nameHe: 'שיווק ותוכן',
    title: 'יצירת תוכן וניהול קמפיינים',
    features: ['מכונת תוכן AI — פוסטים בקליק', 'לוח שידורים לכל הפלטפורמות', 'ניהול קמפיינים ומעקב', 'ניתוח ביצועי פרסום ב-AI', 'ניהול לקוחות סוכנות'],
    icon: Share2,
    gradient: 'from-purple-500 to-pink-600',
    borderGlow: 'hover:border-purple-200',
    topBar: 'from-purple-400 to-pink-500',
    href: '/the-authority',
  },
  {
    name: 'Client',
    nameHe: 'מערך לקוחות',
    title: 'ניהול VIP ומעקב אישי',
    features: ['פורטל לקוח — הלקוח רואה הכל', 'ניהול פגישות + Zoom / Meet', 'CRM עם מעקב אישי', 'משוב ודירוג אוטומטי', 'ניתוח פגישות ב-AI'],
    icon: HeartPulse,
    gradient: 'from-amber-500 to-orange-500',
    borderGlow: 'hover:border-amber-200',
    topBar: 'from-amber-400 to-orange-400',
    href: '/client',
  },
  {
    name: 'Finance',
    nameHe: 'כספים וחשבוניות',
    title: 'חשבוניות, הוצאות ודוחות',
    features: ['הנפקת חשבוניות בקליק', 'שליחה בוואטסאפ ומייל', 'ניהול הוצאות ותשלומים', 'תזכורות גבייה אוטומטיות', 'חיבור לחשבונית ירוקה (מורנינג)'],
    icon: CreditCard,
    gradient: 'from-teal-500 to-emerald-600',
    borderGlow: 'hover:border-teal-200',
    topBar: 'from-teal-400 to-emerald-500',
    href: '/finance-landing',
  },
];

export function LandingModulesSection() {
  return (
    <section id="solution" className="py-16 sm:py-24 bg-slate-50 relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-14">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[11px] font-black mb-4">
              <Sparkles size={11} />
              קורת גג אחת
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1]">
              6 מודולים.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">מערכת אחת.</span>
            </h2>
          </div>
          <p className="text-base sm:text-lg text-slate-500 max-w-xs sm:max-w-sm leading-relaxed">
            בחרו רק את מה שצריך, או קחו את הכל — ותוסיפו מודולים בכל עת.
          </p>
        </div>

        {/* Module cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Link
                key={module.name}
                href={module.href}
                className={`group relative bg-white rounded-2xl border border-slate-150 ${module.borderGlow} p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden`}
              >
                {/* Gradient top bar — always visible, subtle; brightens on hover */}
                <div className={`absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r ${module.topBar} opacity-40 group-hover:opacity-100 transition-opacity duration-300`} />
                {/* Faint gradient wash on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${module.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300`} />

                <div className="relative">
                  {/* Icon + module name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{module.name}</div>
                      <div className="text-sm font-black text-slate-700">{module.nameHe}</div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-black text-slate-900 leading-snug mb-4">
                    {module.title}
                  </h3>

                  {/* Features */}
                  <ul className="space-y-2">
                    {module.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CircleCheckBig size={13} className="text-emerald-500 flex-shrink-0" />
                        <span className="text-slate-500 text-xs leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-black text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-1 group-hover:translate-x-0">
                    <span>למידע נוסף</span>
                    <ArrowLeft size={13} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl bg-white border border-slate-200">
          <div>
            <p className="font-black text-slate-900 text-lg">רוצים את כל 6 המודולים?</p>
            <p className="text-sm text-slate-500 mt-0.5">The Empire — 499₪/חודש. הכל כלול, ללא הפתעות.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/the-empire"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 transition-colors shadow-lg"
            >
              הכל כלול
              <ArrowLeft size={15} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 text-slate-700 font-black text-sm hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              השוואת חבילות
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
