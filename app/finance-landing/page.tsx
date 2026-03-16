import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, BarChart3, CreditCard, FileText, ShieldCheck, Sparkles, TrendingUp, Gift, CircleCheckBig, MessageCircle } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import DemoVideoTrigger from '@/components/landing/DemoVideoTrigger';
import { getModuleLabelHe } from '@/lib/os/modules/registry';

const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'));
const SalesFaq = dynamic(() => import('@/components/landing/SalesFaq').then(m => ({ default: m.SalesFaq })));

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

const features = [
  { icon: FileText, title: 'חשבוניות מהירות', desc: 'יצירה פשוטה, שליחה בקליק, ומעקב אוטומטי.', color: 'bg-emerald-600' },
  { icon: MessageCircle, title: 'שליחה בוואטסאפ', desc: 'שלח חשבוניות ללקוחות ישירות דרך WhatsApp.', color: 'bg-green-600' },
  { icon: CreditCard, title: 'שליטה בתשלומים', desc: 'מה שולם, מה פתוח, ומה צריך לגבות.', color: 'bg-indigo-600' },
  { icon: BarChart3, title: 'דוחות ברורים', desc: 'תמונה אמיתית של הכנסות והוצאות לאורך זמן.', color: 'bg-amber-600' },
];

const benefits = [
  { icon: TrendingUp, title: 'תמונה עסקית', desc: 'רווחיות, הכנסות/הוצאות, ומה קורה החודש — במבט אחד.', color: 'bg-cyan-600' },
  { icon: ShieldCheck, title: 'סדר ועמידה בתהליכים', desc: 'הפחתת טעויות, אחידות חשבונאית, ותיעוד לכל פעולה.', color: 'bg-emerald-600' },
  { icon: Sparkles, title: 'מתחבר למודולים', desc: 'Finance עובד מצוין עם Operations (שטח) ו-Nexus (צוות).', color: 'bg-purple-600' },
];

export default function FinanceMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-28">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 sm:py-28">
          <div className="absolute -top-24 -right-24 w-[540px] h-[540px] bg-emerald-200/35 rounded-full blur-[140px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[640px] h-[640px] bg-teal-200/20 rounded-full blur-[170px] pointer-events-none" />

          <div className="max-w-6xl mx-auto px-6 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
              <Sparkles size={14} />
              <span>{getModuleLabelHe('finance')}</span>
              <span className="text-[10px] text-emerald-500 font-bold">· Finance</span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                <Gift size={10} className="inline ml-1" />
                מגיע במתנה עם כל חבילה
              </span>
            </div>

            <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('finance')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600">
                שהכסף ירדוף אחריך, לא להפך
              </span>
            </h1>

            <p className="mt-6 text-xl text-slate-600 max-w-2xl leading-relaxed">
              סוגרים את הפינה של הגבייה: תזכורות אוטומטיות בוואטסאפ, מעקב תשלומים ורווחיות תכלס. 
              בלי "לצאת פראייר" — כל שקל שנכנס מתועד ומקושר לפרויקט.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-bold">
              ⚠️ חובה אינטגרציה עם מערכת חשבוניות קיימת (מורנינג, חשבונית ירוקה, iCount ודומיהם)
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
              >
                התחילו לגבות עכשיו
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
              <DemoVideoTrigger className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 font-black hover:border-indigo-300 hover:scale-105 transition-all" />
            </div>

            <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((f) => (
                <div key={f.title} className="group rounded-3xl bg-white border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                    <f.icon size={24} />
                  </div>
                  <div className="mt-6 text-xl font-black text-slate-900">{f.title}</div>
                  <div className="mt-3 text-slate-600 leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 sm:py-28 bg-gradient-to-b from-slate-50 to-white relative">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight">
                  כסף בבנק.
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    בלי להיות "האיש הרע".
                  </span>
                </h2>
                <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                  המטרה היא לא "ניהול חשבונות" — אלא גבייה תכלס. 
                  ה-AI שולח תזכורות במקומך, מזהה חובות מסוכנים ואומר לך איזה פרויקט באמת מכניס כסף.
                </p>

                <div className="mt-8 space-y-4">
                  {benefits.map((b) => (
                    <div key={b.title} className="group rounded-3xl bg-white border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-2xl ${b.color} flex items-center justify-center text-white flex-shrink-0 group-hover:scale-105 transition-transform`}>
                          <b.icon size={20} />
                        </div>
                        <div>
                          <div className="text-lg font-black text-slate-900">{b.title}</div>
                          <div className="text-slate-600 mt-2 leading-relaxed">{b.desc}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process Card */}
              <div className="relative lg:sticky lg:top-28">
                                <div className="relative rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-teal-50">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                      <BarChart3 size={14} className="text-emerald-600" />
                      דוגמה לתהליך פיננסי
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">גבייה אוטומטית שסוגרת פינות</div>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      {[
                        { title: 'הנפקת חשבונית', note: 'קליק אחד מהנייד', color: 'bg-emerald-600' },
                        { title: 'רדיפה אוטומטית', note: 'תזכורת וואטסאפ ללקוח', color: 'bg-indigo-600' },
                        { title: 'כסף בבנק', note: 'סטטוס שולם ירוק', color: 'bg-slate-600' },
                        { title: 'ניתוח רווחיות', note: 'היה שווה לעבוד?', color: 'bg-amber-600' },
                      ].map((s, i) => (
                        <div key={s.title} className="group flex items-start gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 hover:shadow-lg transition-all">
                          <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white flex-shrink-0`}>
                            <CircleCheckBig size={18} />
                          </div>
                          <div>
                            <div className="font-black text-slate-900">{s.title}</div>
                            <div className="text-sm text-slate-600 mt-1">{s.note}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Link
                        href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                        className="group w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-full bg-slate-900 text-white font-black shadow-lg hover:bg-slate-800 transition-colors"
                      >
                        התחל עכשיו
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                      </Link>
                    </div>
                    <div className="mt-4 text-center text-xs text-slate-500">
                      בלי התחייבות · בלי כרטיס אשראי · פשוט מתחילים לעבוד
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <TestimonialsSection />

        <SalesFaq variant="default" />
      </main>
      <Footer />
    </div>
  );
}
