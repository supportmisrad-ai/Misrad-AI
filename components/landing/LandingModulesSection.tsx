import Link from 'next/link';
import { ClipboardCheck, ArrowLeft, Sparkles, Target, LayoutDashboard, Share2, HeartPulse, CreditCard, CircleCheckBig } from 'lucide-react';

export function LandingModulesSection() {
  return (
    <section id="solution" className="py-12 sm:py-20 md:py-28 bg-white relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-8 sm:mb-14">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
            6 כלים שסוגרים לך פינות
          </h2>
          <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-slate-600">
            בחרו את היכולת שאתם צריכים היום, הוסיפו כשהעסק יגדל
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[
            {
              name: 'Operations',
              nameHe: 'עבודת שטח',
              title: 'קריאות שירות וצוותים בשטח',
              features: [
                'דיווח מהשטח בלחיצה',
                'פקודות קוליות בעברית',
                'מיקום טכנאים בזמן אמת',
                'צילום תקלה ותיעוד ביצוע',
                'חתימת לקוח דיגיטלית',
                'חשבונית אוטומטית בסיום',
              ],
              icon: ClipboardCheck,
              gradient: 'from-sky-500 to-cyan-600',
              href: '/operations'
            },
            {
              name: 'System',
              nameHe: 'מכונות מכירה (CRM)',
              title: 'רדיפה אחרי לידים וחיזוי סגירות',
              features: [
                'רדיפה אוטומטית אחרי לידים',
                'חיזוי סיכויי סגירה ב-AI',
                'תיעוד שיחות בלי להקליד',
                'טופס לידים מהיר בוואטסאפ',
                'Pipeline ויזואלי של הכסף',
                'דוחות מכירה תכלס',
              ],
              icon: Target,
              gradient: 'from-rose-500 to-red-600',
              href: '/system'
            },
            {
              name: 'Nexus',
              nameHe: 'סידור עבודה וצוות',
              title: 'הסוף ל"גננות" בניהול העסק',
              features: [
                'מי עושה מה ומתי',
                'סדר ביומן ובמשימות',
                'מעקב עומס צוות ב-AI',
                'שעון נוכחות ודוחות שעות',
                'ניהול פרויקטים נקי',
                'חיבור לכל חלקי העסק',
              ],
              icon: LayoutDashboard,
              gradient: 'from-indigo-500 to-purple-600',
              href: '/nexus'
            },
            {
              name: 'Social',
              nameHe: 'פרסום ושיווק AI',
              title: 'פוסטים שעולים לבד בזמן שאתה עובד',
              features: [
                'מכונת תוכן - פוסטים בשניות',
                'תזמון אוטומטי לכל הרשתות',
                'לוח שנה עברי וחגים מובנה',
                'הגנת שבת וחג הרמטית',
                'Hashtags חכמים ומותאמים',
                'שעות פרסום בשיא הרייטינג',
              ],
              icon: Share2,
              gradient: 'from-purple-500 to-pink-600',
              href: '/the-authority'
            },
            {
              name: 'Client',
              nameHe: 'תיקי לקוחות',
              title: 'שקט נפשי מ"מה הסטטוס?"',
              features: [
                'פורטל לקוח בשירות עצמי',
                'הלקוח רואה הכל בלי לשאול',
                'תיאום פגישות Zoom אוטומטי',
                'מעקב אישי לכל לקוח',
                'סיכום פגישות ב-AI',
                'ניהול קבוצות ומחזורים',
              ],
              icon: HeartPulse,
              gradient: 'from-amber-500 to-orange-500',
              href: '/client'
            },
            {
              name: 'Finance',
              nameHe: 'גבייה וכסף',
              title: 'שהכסף ירדוף אחריך, לא להפך',
              features: [
                'חשבוניות בקליק מהנייד',
                'תזכורות גבייה בוואטסאפ',
                'ניתוח רווחיות פרויקטים',
                'ניהול הוצאות ותזרים',
                'סנכרון למורנינג (חשבונית ירוקה)',
                'במתנה בכל חבילה',
              ],
              icon: CreditCard,
              gradient: 'from-teal-500 to-emerald-600',
              href: '/finance-landing'
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
                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon size={18} className="sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {module.name}
                      </div>
                      <div className="text-xs sm:text-sm font-bold text-slate-600">
                        {module.nameHe}
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base md:text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-3 sm:mb-4">
                    {module.title}
                  </h3>
                  
                  {/* Features List */}
                  <ul className="space-y-1.5 sm:space-y-2">
                    {module.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-1.5 sm:gap-2">
                        <CircleCheckBig size={14} className="sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-slate-600 text-[11px] sm:text-xs md:text-sm leading-snug">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Arrow */}
                  <div className="mt-4 sm:mt-5 flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
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
