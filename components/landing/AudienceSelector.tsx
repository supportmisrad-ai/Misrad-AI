import Link from 'next/link';
import { Wrench, Target, Share2, CreditCard, User, Building2, ArrowLeft } from 'lucide-react';

const audiences = [
  {
    num: '01',
    icon: Target,
    label: 'מכירות ולידים',
    desc: 'Pipeline מלא, AI שמדרג לידים, ומרכז תקשורת — מי חם ולמי לחזור היום.',
    tag: 'The Closer',
    href: '/the-closer',
    gradient: 'from-rose-500 to-red-600',
    glow: 'group-hover:shadow-rose-500/20',
    accent: 'text-rose-600',
    accentBg: 'bg-rose-50',
    example: 'סוכנות ביטוח · נדל״ן · מוקדי מכירות',
  },
  {
    num: '02',
    icon: Wrench,
    label: 'תפעול ושטח',
    desc: 'קריאות שירות, שיבוץ טכנאים ב-AI, מלאי — ניהול שלם מהמשרד עד השטח.',
    tag: 'The Operator',
    href: '/the-operator',
    gradient: 'from-sky-500 to-cyan-600',
    glow: 'group-hover:shadow-sky-500/20',
    accent: 'text-sky-600',
    accentBg: 'bg-sky-50',
    example: 'קבלנים · מיזוג · אחזקה · ניהול נכסים',
  },
  {
    num: '03',
    icon: Share2,
    label: 'שיווק וסוכנות',
    desc: 'מכונת תוכן AI, לוח שידורים, ניהול לקוחות — מהפוסט ועד הלקוח המשלם.',
    tag: 'The Authority',
    href: '/the-authority',
    gradient: 'from-purple-500 to-pink-600',
    glow: 'group-hover:shadow-purple-500/20',
    accent: 'text-purple-600',
    accentBg: 'bg-purple-50',
    example: 'סוכנויות דיגיטל · משפיענים · תוכן',
  },
  {
    num: '04',
    icon: CreditCard,
    label: 'כספים וחשבוניות',
    desc: 'הנפקה, גבייה, מעקב תשלומים — שליטה פיננסית בקליק. עם חיבור למורנינג.',
    tag: 'Finance',
    href: '/finance-landing',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/20',
    accent: 'text-emerald-600',
    accentBg: 'bg-emerald-50',
    example: 'כל עסק שמנפיק חשבוניות',
  },
  {
    num: '05',
    icon: User,
    label: 'עצמאי ומתחיל',
    desc: 'מודול אחד, ניהול נקי — מתחילים בקטן ומתרחבים לפי הצורך.',
    tag: 'Solo',
    href: '/solo',
    gradient: 'from-indigo-500 to-blue-600',
    glow: 'group-hover:shadow-indigo-500/20',
    accent: 'text-indigo-600',
    accentBg: 'bg-indigo-50',
    example: 'פרילאנסרים · יועצים · עסק חד-אישי',
  },
  {
    num: '06',
    icon: Building2,
    label: 'ארגון — הכל ביחד',
    desc: 'כל 6 המודולים, AI חוצה-מחלקות, דשבורד ניהולי — מערכת הפעלה שלמה.',
    tag: 'The Empire',
    href: '/the-empire',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'group-hover:shadow-amber-500/20',
    accent: 'text-amber-600',
    accentBg: 'bg-amber-50',
    example: 'ארגונים · חברות · 3+ עובדים',
  },
];

export function AudienceSelector() {
  return (
    <section className="py-16 sm:py-24 bg-white relative overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/3 w-[700px] h-[400px] bg-gradient-to-b from-slate-50 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-[11px] font-black mb-4">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              מה מתאר אותך הכי טוב?
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-[1.1]">
              בחרו את המסלול שלכם.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-lg">
              כל קהל יעד מקבל פתרון ייעודי — לא תוכנה גנרית.
            </p>
          </div>
          <Link
            href="/pricing"
            className="shrink-0 inline-flex items-center gap-1.5 text-sm font-black text-indigo-600 hover:text-indigo-700 transition-colors group"
          >
            כל החבילות והמחירים
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`group relative rounded-2xl border border-slate-100 bg-white p-5 sm:p-6 transition-all duration-300 hover:shadow-2xl ${a.glow} hover:-translate-y-1 overflow-hidden`}
              >
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-[0.035] transition-opacity duration-400 rounded-2xl`} />
                {/* Top accent line */}
                <div className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${a.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative">
                  {/* Number + icon row */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-xs font-black ${a.accent} font-mono opacity-40 group-hover:opacity-60 transition-opacity`}>{a.num}</span>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      <Icon size={18} />
                    </div>
                  </div>

                  {/* Tag */}
                  <div className={`inline-flex items-center px-2 py-0.5 rounded-md ${a.accentBg} mb-3`}>
                    <span className={`text-[10px] font-black tracking-wide ${a.accent}`}>{a.tag}</span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900 leading-snug mb-2">
                    {a.label}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {a.desc}
                  </p>
                  <p className="mt-3 text-[10px] text-slate-400 font-bold border-t border-slate-50 pt-3">
                    {a.example}
                  </p>

                  <div className={`mt-3 flex items-center gap-1 text-xs font-black ${a.accent} opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0`}>
                    <span>לפתרון המלא</span>
                    <ArrowLeft size={13} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
