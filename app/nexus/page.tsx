import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import DemoVideoTrigger from '@/components/landing/DemoVideoTrigger';
import { Target, Users, Briefcase, BarChart3, Lightbulb, Archive } from 'lucide-react';

const TestimonialsSection = dynamic(() => import('@/components/landing/TestimonialsSection'));
const SalesFaq = dynamic(() => import('@/components/landing/SalesFaq').then(m => ({ default: m.SalesFaq })));

// Removed force-dynamic: Next.js auto-detects dynamic from auth calls

export default function NexusMarketingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900" dir="rtl">
      <Navbar />
      <main className="pt-20">
        <section className="relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-[520px] h-[520px] bg-indigo-200/40 rounded-full blur-[130px] pointer-events-none" />
          <div className="absolute -bottom-32 -left-24 w-[620px] h-[620px] bg-purple-200/25 rounded-full blur-[160px] pointer-events-none" />
          <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20 relative">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold shadow-sm">
              <span>{getModuleLabelHe('nexus')}</span>
              <span className="text-[10px] text-indigo-400 font-bold">Nexus</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
              {getModuleLabelHe('nexus')}
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600">
                חדר המנהלים שלך
              </span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 max-w-2xl leading-relaxed">
              Nexus הוא מרכז השליטה של Misrad AI: תמונת מצב אחת לצוות, משימות, הרשאות ותהליכים — כדי שתוכל לנהל את העסק מהר ובביטחון.
            </p>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Users size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">ניהול צוות</div>
                <div className="mt-2 text-lg font-black">מי עושה מה ומתי</div>
                <div className="mt-2 text-sm text-slate-600">תמונה רחבה של עומסים, משימות ותיעדוף.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Target size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-indigo-500">צינור מכירות</div>
                <div className="mt-2 text-lg font-black">מעקב מכירות מתקדם</div>
                <div className="mt-2 text-sm text-slate-600">8 שלבים מוגדרים, דשבורד מכירות, יעדים וביצועים.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Lightbulb size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-indigo-500">תובנות AI</div>
                <div className="mt-2 text-lg font-black">תובנות עסקיות</div>
                <div className="mt-2 text-sm text-slate-600">ניתוח נתונים, זיהוי מגמות, והמלצות אסטרטגיות.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Archive size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">ניהול נכסים</div>
                <div className="mt-2 text-lg font-black">נכסים ומסמכים</div>
                <div className="mt-2 text-sm text-slate-600">ניהול נכסים, מסמכים וקבצים של הארגון במקום אחד.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <BarChart3 size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">דוחות</div>
                <div className="mt-2 text-lg font-black">דוחות כספיים</div>
                <div className="mt-2 text-sm text-slate-600">דוחות מתקדמים משולבים עם מודול Finance.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 p-6 hover:border-slate-300 transition-all">
                <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4">
                  <Briefcase size={24} className="text-slate-700" />
                </div>
                <div className="text-xs font-black text-slate-500">סנכרון</div>
                <div className="mt-2 text-lg font-black">חיבור לכל המודולים</div>
                <div className="mt-2 text-sm text-slate-600">נגיעה אחת שמחברת System, Client, Social, Finance ו-Operations.</div>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/login?mode=sign-up&redirect=/workspaces/onboarding"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-xl shadow-indigo-500/20 hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                התחל חינם
              </Link>
              <DemoVideoTrigger />
            </div>
          </div>
        </section>

        {/* Pricing CTA Section */}
        <section className="py-16 sm:py-20 bg-slate-50 border-y border-slate-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              כמה זה עולה?
            </h2>
            <p className="text-lg text-slate-600 mb-6 max-w-2xl mx-auto">
              Nexus כלול בכל החבילות מלבד מודול בודד. מתחיל מ-₪249/חודש בחבילת מכירות.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center min-w-[160px]">
                <div className="text-xs font-bold text-slate-500 mb-1">מודול בודד</div>
                <div className="text-2xl font-black text-slate-900">₪149<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
              </div>
              <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 text-center min-w-[160px] shadow-lg">
                <div className="text-xs font-bold text-indigo-600 mb-1">חבילת מכירות</div>
                <div className="text-2xl font-black text-indigo-700">₪249<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
                <div className="text-[10px] text-slate-500 mt-1">מכירות + ניהול</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center min-w-[160px]">
                <div className="text-xs font-bold text-slate-500 mb-1">הכל כלול</div>
                <div className="text-2xl font-black text-slate-900">₪499<span className="text-sm text-slate-500 font-bold">/חודש</span></div>
                <div className="text-[10px] text-slate-500 mt-1">6 מודולים + 5 משתמשים</div>
              </div>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-slate-900 text-white font-bold shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
            >
              ראה את כל החבילות
            </Link>
          </div>
        </section>

        {/* ROI Section */}
        <section className="py-16 sm:py-20 bg-white">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4">
              החזר השקעה
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Nexus חוסך למנהלים 5-10 שעות בשבוע של מעקב ידני אחרי צוות, משימות ומכירות.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl font-black text-slate-900">5-10</div>
                <div className="text-sm text-slate-600 mt-1">שעות חיסכון/שבוע</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl font-black text-indigo-700">₪2,000-6,000</div>
                <div className="text-sm text-slate-600 mt-1">ערך חודשי מוערך</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="text-3xl font-black text-emerald-700">1,300%+</div>
                <div className="text-sm text-slate-600 mt-1">החזר השקעה</div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <TestimonialsSection />

        {/* FAQ Section */}
        <SalesFaq variant="default" />
      </main>
      <Footer />
    </div>
  );
}
