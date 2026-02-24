'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Target, Check, Users, TrendingUp, Crown, Sparkles, Zap, FileText, BarChart3, HeartPulse, CircleCheckBig, ArrowUp, Phone, SquareActivity, DollarSign, Clock, PhoneCall, Cpu, ShoppingBag, Play } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PricingCard } from '@/components/landing/PricingCard';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { DemoVideoModal } from '@/components/landing/DemoVideoModal';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function SystemOSLandingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

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
                onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105 text-sm sm:text-base"
              >
                התחל ניסיון חינם <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
              </button>
              <button
                onClick={() => router.push('/login')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-full font-bold transition-all text-sm sm:text-base"
              >
                כניסה
              </button>
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-white via-indigo-50/50 to-purple-50/50 border-2 border-indigo-200 text-slate-900 rounded-full font-bold transition-all text-sm sm:text-base flex items-center justify-center gap-2 hover:border-indigo-300 hover:scale-105"
              >
                <Play size={18} className="text-indigo-600" />
                צפייה במערכת
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
              לידים נופלים בין הכיסאות? זה לא חייב לקרות.
            </h3>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-rose-700 mb-4 sm:mb-6 leading-tight px-2">
              כשיש לך מערכת שמתעדכנת על כל ליד - אף אחד לא נשכח.
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
              <span className="text-rose-700 font-bold">{getModuleLabelHe('system')}</span> - לא עוד אקסל מסובך. כל מנהל מכירות רואה בדיוק איפה כל ליד עומד, מה השלב הבא, ומה צריך לעשות עכשיו.
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
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">Pipeline מכירות שלם - מליד ועד סגירה</h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-4 leading-relaxed">
                  <strong className="text-slate-900">{getModuleLabelHe('system')}</strong> מתמקדת בניהול לידים ומכירות. כל מנהל מכירות רואה את ה-Pipeline שלו בצורה ויזואלית - איפה כל ליד עומד, מה צריך לעשות, וכמה כסף על השולחן.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">Pipeline ויזואלי</div>
                      <div className="text-xs sm:text-sm text-slate-600">ראה בדיוק איפה כל עסקה עומדת, AI מנתח סיכויי סגירה</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">מרכז תקשורת + מרכזיית ענן</div>
                      <div className="text-xs sm:text-sm text-slate-600">חייג מהמערכת דרך Voicenter/Twilio, Inbox אחוד, תיעוד שיחות</div>
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
              סגירת עסקאות.<br/>
              <span className="text-rose-700">שליטה בלידים.</span><br/>
              <span className="text-slate-600">AI שעובד בשבילך.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getModuleLabelHe('system')} עוזרת לך לסגור יותר עסקאות, לנהל לידים בצורה חכמה, ולא לאבד אף הזדמנות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">סגירת עסקאות</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">AI מנתח סיכויי סגירה</strong> לכל ליד ומראה לך בדיוק איפה להתמקד, מה השלב הבא, ומה לעשות עכשיו.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <HeartPulse size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">שליטה בלידים</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">אין יותר לידים שנופלים</strong> בין הכיסאות. כל ליד מתועד במערכת, עם תזכורות אוטומטיות ל-Follow Up.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-rose-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">לכל סוג צוות מכירות</h3>
              <p className="text-sm text-slate-600">
                מפרילנסר עצמאי ועד צוות מכירות עם 20+ אנשים - <strong className="text-slate-900">הכל מתחיל ב-₪149/חודש.</strong>
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
                title: 'מרכז תקשורת',
                desc: 'חייג ללידים דרך מרכזיית ענן (Voicenter / Twilio), Inbox אחוד לכל הערוצים, תיעוד שיחות ומעקב',
                icon: PhoneCall
              },
              {
                title: 'משימות Follow Up',
                desc: 'התקשר, שלח מייל, עקוב אחר ליד - משימות פשוטות לביצוע מיידי',
                icon: Phone
              },
              {
                title: 'הצעות מחיר',
                desc: 'צור והנפק הצעות מחיר מקצועיות ללקוחות, מעקב אחר סטטוס ואישורים',
                icon: FileText
              },
              {
                title: 'ניהול מוצרים',
                desc: 'קטלוג מוצרים ושירותים, מחירונים, וניהול מלאי',
                icon: ShoppingBag
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
                title: 'AI Analytics',
                desc: 'ניתוח מתקדם של ביצועי מכירות, חיזוי טרנדים, והמלצות אוטומטיות',
                icon: Cpu
              },
              {
                title: 'דוחות מתקדמים',
                desc: 'דוחות על ביצועי מכירות, לידים, וקמפיינים',
                icon: BarChart3
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
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto"
            >
              <PricingCard
                title={getModuleLabelHe('system')}
                subtitle="מודול בודד (משתמש אחד)"
                price={billingCycle === 'monthly' ? 149 : Math.round(149 * 0.8)}
                features={[
                  'משתמש אחד (ללא ניהול צוות)',
                  'ניהול לידים + Pipeline מכירות',
                  'מרכז תקשורת + חייגן מרכזיית ענן',
                  'משימות Follow Up',
                  'תמיכה בעברית'
                ]}
                recommended={true}
                onSelect={() => router.push(`/subscribe/checkout?package=solo&module=system&billing=${billingCycle}&product=${encodeURIComponent(getModuleLabelHe('system'))}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="חבילת מכירות"
                subtitle="System + Nexus · משתמש אחד"
                price={billingCycle === 'monthly' ? 249 : Math.round(249 * 0.8)}
                features={[
                  getModuleLabelHe('system'),
                  getModuleLabelHe('nexus'),
                  'ניהול לידים + ניהול צוות + מרכז תקשורת',
                  'סנכרון בין המודולים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?package=the_closer&billing=${billingCycle}&product=${encodeURIComponent('חבילת מכירות')}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="הכל כלול"
                subtitle="כולל 5 משתמשים · +₪39 לכל מושב נוסף"
                price={billingCycle === 'monthly' ? 499 : Math.round(499 * 0.8)}
                features={[
                  getModuleLabelHe('nexus'),
                  getModuleLabelHe('system'),
                  getModuleLabelHe('social'),
                  getModuleLabelHe('client'),
                  'כל המודולים + סנכרון מלא'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?package=the_empire&billing=${billingCycle}&seats=5&product=${encodeURIComponent('הכל כלול')}`)}
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
              onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')}
              className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105"
            >
              התחל ניסיון חינם <ArrowRight size={20} className="rotate-180" />
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

      {/* Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <SalesFaq variant="system" />

      <Footer />
      
      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </div>
  );
}

