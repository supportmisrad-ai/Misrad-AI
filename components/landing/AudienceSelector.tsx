import Link from 'next/link';
import { Wrench, Target, Share2, CreditCard, User, Building2, ArrowLeft } from 'lucide-react';

const audiences = [
  {
    icon: Target,
    label: 'מכירות / לידים',
    desc: 'ניהול פייפליין, מעקב לידים, AI שמדרג ומתעדף — מי חם ולמי לחזור היום.',
    tag: 'חבילת מכירות',
    href: '/the-closer',
    gradient: 'from-rose-500 to-red-600',
    bg: 'from-rose-50 to-white',
    border: 'border-rose-100 hover:border-rose-300',
    tagBg: 'bg-rose-50 border-rose-200 text-rose-700',
    example: 'סוכני ביטוח, נדל״ן, מוקדי מכירות',
  },
  {
    icon: Wrench,
    label: 'תפעול ושטח',
    desc: 'קריאות שירות, שיבוץ טכנאים, מלאי — ניהול שלם מהמשרד עד השטח.',
    tag: 'חבילת תפעול',
    href: '/the-operator',
    gradient: 'from-sky-500 to-cyan-600',
    bg: 'from-sky-50 to-white',
    border: 'border-sky-100 hover:border-sky-300',
    tagBg: 'bg-sky-50 border-sky-200 text-sky-700',
    example: 'קבלנים, מיזוג, אחזקה, ניהול נכסים',
  },
  {
    icon: Share2,
    label: 'שיווק / סוכנות',
    desc: 'תוכן AI, ניהול לקוחות, לוח שידורים — מהפוסט ועד הלקוח המשלם.',
    tag: 'חבילת שיווק',
    href: '/the-authority',
    gradient: 'from-purple-500 to-pink-600',
    bg: 'from-purple-50 to-white',
    border: 'border-purple-100 hover:border-purple-300',
    tagBg: 'bg-purple-50 border-purple-200 text-purple-700',
    example: 'סוכנויות דיגיטל, משפיענים, מנהלי תוכן',
  },
  {
    icon: CreditCard,
    label: 'חשבוניות / כספים',
    desc: 'הנפקה, גבייה, מעקב תשלומים — שליטה פיננסית פשוטה ומהירה.',
    tag: 'Finance · כספים',
    href: '/finance-landing',
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'from-emerald-50 to-white',
    border: 'border-emerald-100 hover:border-emerald-300',
    tagBg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    example: 'כל עסק שמנפיק חשבוניות ומנהל הוצאות',
  },
  {
    icon: User,
    label: 'עצמאי / מתחיל',
    desc: 'נקסוס בלבד, ניהול משימות וצוות — מתחילים קטן ומתרחבים לפי הצורך.',
    tag: 'נקסוס בלבד',
    href: '/solo',
    gradient: 'from-indigo-500 to-blue-600',
    bg: 'from-indigo-50 to-white',
    border: 'border-indigo-100 hover:border-indigo-300',
    tagBg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    example: 'פרילאנסרים, יועצים, עסק חד-אישי',
  },
  {
    icon: Building2,
    label: 'ארגון / הכל ביחד',
    desc: 'כל 6 המודולים, AI חוצה-מחלקות, דשבורד ניהולי — מערכת הפעלה לארגון.',
    tag: 'הכל כלול',
    href: '/the-empire',
    gradient: 'from-amber-500 to-orange-500',
    bg: 'from-amber-50 to-white',
    border: 'border-amber-100 hover:border-amber-300',
    tagBg: 'bg-amber-50 border-amber-200 text-amber-700',
    example: 'מנכ״לים, ארגונים עם 3+ עובדים, חברות',
  },
];

export function AudienceSelector() {
  return (
    <section className="py-16 sm:py-24 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-rose-100/20 rounded-full blur-3xl" style={{ transform: 'translateZ(0)' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-black mb-4">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            מה מתאר אותך הכי טוב?
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
            בחרו את המסלול שלכם
          </h2>
          <p className="mt-3 text-sm sm:text-base md:text-lg text-slate-500 max-w-xl mx-auto">
            כל קהל יעד מקבל פתרון ייעודי — לא תוכנה גנרית.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {audiences.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className={`group relative rounded-2xl sm:rounded-3xl bg-gradient-to-br ${a.bg} border ${a.border} p-5 sm:p-6 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1.5 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-300 rounded-2xl sm:rounded-3xl`} />

                <div className="relative">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${a.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                      <Icon size={20} className="sm:w-5 sm:h-5" />
                    </div>
                    <span className={`text-[10px] sm:text-xs font-black px-2 py-1 rounded-full border ${a.tagBg}`}>
                      {a.tag}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                    {a.label}
                  </h3>
                  <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {a.desc}
                  </p>
                  <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-slate-400 font-medium">
                    {a.example}
                  </p>

                  <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-xs sm:text-sm font-black text-slate-700 group-hover:text-slate-900 transition-colors">
                    <span>לפתרון המלא</span>
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 sm:mt-12 text-center">
          <p className="text-sm text-slate-500">
            לא בטוחים? ראו את{' '}
            <Link href="/pricing" className="font-black text-indigo-600 hover:underline underline-offset-2">
              כל החבילות והמחירים
            </Link>
            {' '}או{' '}
            <Link href="/the-empire" className="font-black text-slate-700 hover:underline underline-offset-2">
              קחו את הכל
            </Link>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
