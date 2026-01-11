'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Target, Check, Users, TrendingUp, Crown, BrainCircuit, Zap, FileText, BarChart3, HeartPulse, CheckCircle2, ArrowUp, Phone, Activity, DollarSign, Clock } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { PricingCard } from '@/components/landing/PricingCard';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function SystemOSLandingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans overflow-x-hidden" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-red-500/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] sm:text-xs font-bold mb-4 sm:mb-6">
              <Target size={12} className="sm:w-[14px] sm:h-[14px]" /> System
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 leading-tight px-2">
              מערכת ניהול לידים<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-400 to-pink-400">
                ומכירות חכמה
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-300 mb-3 sm:mb-4 max-w-2xl mx-auto leading-relaxed px-2">
              <strong className="text-white">System עוזרת למנהלי המכירות שלך לנהל לידים, לעקוב אחר מכירות, ולסגור עסקאות.</strong>
            </p>
            <p className="text-sm sm:text-base md:text-lg text-slate-400 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              כל עובד מקבל את הכלים שהוא צריך כדי לנהל את הלידים שלו. <span className="text-red-300 font-medium">פשוט, ישיר, עובד.</span>
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-2">
              <button
                onClick={() => router.push('/sign-up')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 hover:scale-105 text-sm sm:text-base"
              >
                התחל ניסיון חינם <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
              </button>
              <button
                onClick={() => router.push('/system')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl font-bold transition-all backdrop-blur-md text-sm sm:text-base"
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
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-bold transition-all backdrop-blur-md text-sm sm:text-base"
              >
                ראה מחירים
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Ease of Use Message */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-[#020617] to-slate-900/30 relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-red-900/30 to-slate-900/60 border border-red-500/30 rounded-2xl p-6 sm:p-8 text-center"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight px-2">
              כלי שלא נוח לך לעבוד איתו - הוא יקשה עליך.
            </h3>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-red-300 mb-4 sm:mb-6 leading-tight px-2">
              כלי שאתה לומד איתו בשנייה ומדבר בשפה הפשוטה שלך - הוא חלק ממך.
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto px-2">
              <span className="text-red-300 font-bold">System</span> - לא עוד כלי מסובך. כלי שאתה מבין מיד. כלי שעובד בשבילך, לא נגדך.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-900/30 relative">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-red-900/30 to-slate-800/50 border border-red-500/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                <Target size={24} className="sm:w-8 sm:h-8 text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight">משימות אישיות - כל עובד רואה רק את שלו</h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-300 mb-4 leading-relaxed">
                  <strong className="text-white">System</strong> מתמקדת בביצוע (Execution). כל עובד רואה רק את הלידים והמשימות שלו, משימות Follow Up פשוטות לביצוע מיידי.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Check size={18} className="sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold mb-1 text-sm sm:text-base">ניהול לידים</div>
                      <div className="text-xs sm:text-sm text-slate-400">עקוב אחר לידים, סגור עסקאות, נהל מכירות</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                    <Check size={18} className="sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold mb-1 text-sm sm:text-base">משימות Follow Up</div>
                      <div className="text-xs sm:text-sm text-slate-400">התקשר, שלח מייל, עקוב אחר ליד</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">
              חיסכון בזמן.<br/>
              <span className="text-red-400">שקט נפשי.</span><br/>
              <span className="text-slate-300">לכל סוג עסק.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              System חוסכת לך 10-15 שעות שבועיות על ניהול לידים ומכירות. מפרילנסרים ועד חברות גדולות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">חיסכון בזמן</h3>
              <p className="text-sm text-slate-400">
                <strong className="text-white">10-15 שעות שבועיות</strong> שאתה חוסך על ניהול לידים, מעקב אחר מכירות, וחיפוש מידע מפוזר.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <HeartPulse size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">שקט נפשי</h3>
              <p className="text-sm text-slate-400">
                <strong className="text-white">אין יותר כאב ראש</strong> מלידים אבודים, הזדמנויות שנפספסות, או מידע מפוזר.
              </p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">לכל סוג עסק</h3>
              <p className="text-sm text-slate-400">
                מפרילנסר עצמאי ועד חברה עם 100+ לידים - <strong className="text-white">כל אחד יכול להרשות לעצמו.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center mb-8 sm:mb-12 leading-tight">
            מה כלול ב-System?
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
                icon: BrainCircuit
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-red-500/50 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-[#020617] relative z-10 overflow-hidden border-y border-slate-800/50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-500/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/30 border border-slate-700/50 text-red-300 text-xs font-bold mb-6 backdrop-blur-md">
              <DollarSign size={14} className="text-red-400" />
              <span>תמחור שקוף</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
              בחר את התוכנית<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-400 to-pink-400">שמתאימה לך</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-4">
              ללא התחייבות. ביטול בכל עת. כל התוכניות כוללות ניסיון חינם של 14 יום.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500'}`}>
                חודשי
              </span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                  billingCycle === 'yearly' ? 'bg-red-600' : 'bg-slate-700'
                }`}
              >
                <motion.div
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: billingCycle === 'yearly' ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500'}`}>
                שנתי
                <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
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
                title="סטארטר"
                subtitle="לניהול לידים ומכירות - עד 5 משתמשים"
                price={billingCycle === 'monthly' ? 299 : 239}
                features={[
                  'עד 5 משתמשים',
                  'ניהול לידים בסיסי',
                  'משימות Follow Up',
                  'ניהול מכירות בסיסי',
                  'דוחות בסיסיים',
                  'תמיכה באימייל',
                  '2GB אחסון קבצים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=starter&system=system&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="פרו"
                subtitle="לניהול לידים ומכירות - עד 20 משתמשים"
                price={billingCycle === 'monthly' ? 599 : 479}
                features={[
                  'עד 20 משתמשים',
                  'כל הפיצ׳רים של סטארטר',
                  'בינה מלאכותית (AI)',
                  'קמפיינים שיווקיים',
                  'דוחות מתקדמים',
                  'תמיכה עדיפות',
                  '50GB אחסון קבצים',
                  'אינטגרציות מלאות'
                ]}
                recommended={true}
                onSelect={() => router.push(`/subscribe/checkout?plan=pro&system=system&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="עסקי"
                subtitle="לניהול לידים ומכירות - ללא הגבלה"
                price={billingCycle === 'monthly' ? 1299 : 1039}
                features={[
                  'משתמשים ללא הגבלה',
                  'כל הפיצ׳רים של פרו',
                  'Multi-tenant',
                  'ניהול תפקידים והרשאות מתקדם',
                  'API מלא',
                  'אימות SSO',
                  'גיבויים יומיים',
                  'תמיכה 24/7',
                  'אחסון ללא הגבלה',
                  'ניהול מותאם אישית'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=enterprise&system=system&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
            </motion.div>
          </AnimatePresence>

          <div className="mt-16 text-center">
            <p className="text-slate-400 text-sm mb-4">
              כל התוכניות כוללות: <span className="text-white font-bold">14 יום ניסיון חינם</span> • <span className="text-white font-bold">ביטול בכל עת</span> • <span className="text-white font-bold">תמיכה בעברית</span>
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-slate-900/50 to-[#020617]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
            מוכן לנהל את הלידים שלך?
          </h2>
          <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
            System היא מערכת ניהול לידים ומכירות חכמה.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/sign-up')}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30 hover:scale-105"
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
              className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white border border-slate-700 rounded-xl font-bold transition-all backdrop-blur-md"
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

