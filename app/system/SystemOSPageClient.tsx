'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Target, Check, Users, TrendingUp, Crown, Sparkles, Zap, FileText, BarChart3, HeartPulse, CheckCircle2, ArrowUp, Phone, Activity, DollarSign, Clock } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PricingCard } from '@/components/landing/PricingCard';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { SalesFaq } from '@/components/landing/SalesFaq';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function SystemOSLandingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-rose-500/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a08_1px,transparent_1px),linear-gradient(to_bottom,#0f172a08_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6">
              <Target size={12} className="sm:w-[14px] sm:h-[14px]" /> {getModuleLabelHe('system')}
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight px-2">
              מערכת ניהול לידים<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-700 to-rose-600">
                ומכירות חכמה
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed px-2">
              <strong className="text-slate-900">{getModuleLabelHe('system')} עוזרת למנהלי המכירות שלך לנהל לידים, לעקוב אחר מכירות, ולסגור עסקאות.</strong>
            </p>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              כל עובד מקבל את הכלים שהוא צריך כדי לנהל את הלידים שלו. <span className="text-rose-700 font-medium">פשוט, ישיר, עובד.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-2">
              <button
                onClick={() => router.push('/pricing')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105 text-sm sm:text-base"
              >
                התחל ניסיון חינם (בלי כרטיס) <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl font-bold transition-all text-sm sm:text-base"
              >
                כניסה
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('pricing');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all text-sm sm:text-base"
              >
                ראה מחירים
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Ease of Use Message */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-slate-50 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center shadow-sm"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight px-2">
              כלי שלא נוח לך לעבוד איתו - הוא יקשה עליך.
            </h3>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700 mb-4 sm:mb-6 leading-tight px-2">
              כלי שאתה לומד איתו בשנייה ומדבר בשפה הפשוטה שלך - הוא חלק ממך.
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
              <span className="text-rose-700 font-bold">{getModuleLabelHe('system')}</span> - לא עוד כלי מסובך. כלי שאתה מבין מיד. כלי שעובד בשבילך, לא נגדך.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-50 relative">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-8 sm:mb-12 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <Target size={24} className="sm:w-8 sm:h-8 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">משימות אישיות - כל עובד רואה רק את שלו</h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-4 leading-relaxed">
                  <strong className="text-slate-900">{getModuleLabelHe('system')}</strong> מתמקדת בביצוע (Execution). כל עובד רואה רק את הלידים והמשימות שלו, משימות Follow Up פשוטות לביצוע מיידי.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">ניהול לידים</div>
                      <div className="text-xs sm:text-sm text-slate-600">עקוב אחר לידים, סגור עסקאות, נהל מכירות</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">משימות Follow Up</div>
                      <div className="text-xs sm:text-sm text-slate-600">התקשר, שלח מייל, עקוב אחר ליד</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">
              חיסכון בזמן.<br/>
              <span className="text-rose-700">שקט נפשי.</span><br/>
              <span className="text-slate-600">לכל סוג עסק.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getModuleLabelHe('system')} חוסכת לך 10-15 שעות שבועיות על ניהול לידים ומכירות. מפרילנסרים ועד חברות גדולות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">חיסכון בזמן</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">10-15 שעות שבועיות</strong> שאתה חוסך על ניהול לידים, מעקב אחר מכירות, וחיפוש מידע מפוזר.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <HeartPulse size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">שקט נפשי</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">אין יותר כאב ראש</strong> מלידים אבודים, הזדמנויות שנפספסות, או מידע מפוזר.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">לכל סוג עסק</h3>
              <p className="text-sm text-slate-600">
                מפרילנסר עצמאי ועד חברה עם 100+ לידים - <strong className="text-slate-900">כל אחד יכול להרשות לעצמו.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-center mb-8 sm:mb-12 leading-tight">
            מה כלול ב{getModuleLabelHe('system')}?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'ניהול לידים',
                desc: 'עקוב אחר לידים משלב הראשוני ועד לסגירת העסקה. כל עובד רואה רק את הלידים שלו.',
                icon: Target
              },
              {
                title: 'משימות Follow Up',
                desc: 'התקשר, שלח מייל, עקוב אחר ליד - משימות פשוטות לביצוע מיידי',
                icon: Phone
              },
              {
                title: 'ניהול מכירות',
                desc: 'עקוב אחר מכירות, סגור עסקאות, נהל את המכירות שלך',
                icon: TrendingUp
              },
              {
                title: 'קמפיינים שיווקיים',
                desc: 'צור קמפיינים, עקוב אחר ביצועים, נהל את השיווק שלך',
                icon: Zap
              },
              {
                title: 'דוחות מתקדמים',
                desc: 'דוחות על ביצועי מכירות, לידים, וקמפיינים',
                icon: BarChart3
              },
              {
                title: 'בינה מלאכותית (AI)',
                desc: 'ניתוח לידים, המלצות מכירות, ותובנות עסקיות',
                icon: Sparkles
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-rose-200 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-rose-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-slate-50 relative z-10 overflow-hidden border-y border-slate-200">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-rose-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-rose-700 text-xs font-bold mb-6">
              <DollarSign size={14} className="text-rose-600" />
              <span>תמחור שקוף</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6 leading-tight">
              בחר את התוכנית<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-red-700 to-rose-600">שמתאימה לך</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-4">
              ללא התחייבות. ביטול בכל עת. כל התוכניות כוללות ניסיון חינם של 7 ימים.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-slate-900' : 'text-slate-500'}`}>
                חודשי
              </span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                  billingCycle === 'yearly' ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <motion.div
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: billingCycle === 'yearly' ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-slate-900' : 'text-slate-500'}`}>
                שנתי
                <span className="ml-2 px-2 py-0.5 bg-rose-50 text-rose-700 text-xs rounded-full border border-rose-200">
                  חסוך 20%
                </span>
              </span>
            </div>
          </div>

          {/* Pricing Cards */}
          <AnimatePresence mode="wait">
            <motion.div
              key={billingCycle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              <PricingCard
                title={getModuleLabelHe('system')}
                subtitle="מודול בודד (משתמש אחד)"
                price={billingCycle === 'monthly' ? 149 : Math.round(149 * 0.8)}
                features={[
                  'משתמש אחד (ללא ניהול צוות)',
                  'ניהול לידים',
                  'Pipeline מכירות',
                  'משימות Follow Up',
                  'תמיכה בעברית'
                ]}
                recommended={true}
                onSelect={() => router.push(`/subscribe/checkout?plan=solo&system=system&billing=${billingCycle}&amount=${billingCycle === 'monthly' ? 149 : Math.round(149 * 0.8)}&product=${encodeURIComponent(getModuleLabelHe('system'))}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="חבילת Combo (2 מודולים)"
                subtitle="בחר 2 מודולים מתוך 4"
                price={billingCycle === 'monthly' ? 249 : Math.round(249 * 0.8)}
                features={[
                  'משתמש אחד (ללא ניהול צוות)',
                  'בחר 2 מודולים מתוך 4',
                  'כניסה אחת',
                  'סנכרון בין המודולים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=starter&system=bundle_combo&billing=${billingCycle}&amount=${billingCycle === 'monthly' ? 249 : Math.round(249 * 0.8)}&product=${encodeURIComponent('חבילת Combo (2 מודולים)')}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="משרד מלא (4 מודולים)"
                subtitle="כולל 5 משתמשים · +₪39 לכל מושב נוסף"
                price={billingCycle === 'monthly' ? 349 : Math.round(349 * 0.8)}
                features={[
                  getModuleLabelHe('nexus'),
                  getModuleLabelHe('system'),
                  getModuleLabelHe('social'),
                  getModuleLabelHe('client'),
                  'סנכרון מלא בין כל המודולים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=starter&system=full_stack&billing=${billingCycle}&amount=${billingCycle === 'monthly' ? 349 : Math.round(349 * 0.8)}&seats=5&product=${encodeURIComponent('משרד מלא (4 מודולים)')}`)}
                billingCycle={billingCycle}
              />
            </motion.div>
          </AnimatePresence>

          <div className="mt-16 text-center">
            <p className="text-slate-600 text-sm mb-4">
              כל התוכניות כוללות: <span className="text-slate-900 font-bold">7 ימים ניסיון חינם</span> • <span className="text-slate-900 font-bold">ביטול בכל עת</span> • <span className="text-slate-900 font-bold">תמיכה בעברית</span>
            </p>
          </div>
        </div>
      </section>

      <SalesFaq variant="system" />

      {/* CTA Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            מוכן לנהל את הלידים שלך?
          </h2>
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            {getModuleLabelHe('system')} היא מערכת ניהול לידים ומכירות חכמה.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/pricing')}
              className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105"
            >
              התחל ניסיון חינם (בלי כרטיס) <ArrowRight size={20} className="rotate-180" />
            </button>
            <button
              onClick={() => {
                const element = document.getElementById('pricing');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="px-8 py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl font-bold transition-all"
            >
              ראה מחירים
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

