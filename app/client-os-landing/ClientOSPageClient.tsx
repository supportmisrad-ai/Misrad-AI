'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, HeartPulse, Check, Target, Phone, Users, TrendingUp, Crown, BrainCircuit, Activity, DollarSign, Clock, Zap, Globe, CalendarDays, UserCircle, Video, Calendar } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ClientOSDemo } from '@/components/landing/demos/ClientOSDemo';
import { PricingCard } from '@/components/landing/PricingCard';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function ClientOSPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F5F5F7] font-sans overflow-x-hidden" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden bg-[#F5F5F7]">
        {/* Background with Better Contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C5A572]/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border-2 border-[#C5A572]/50 text-[#C5A572] text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 shadow-lg">
              <HeartPulse size={12} className="sm:w-[14px] sm:h-[14px]" /> Client
              <span className="ml-2 px-2 py-0.5 bg-[#3F6212]/40 text-[#84CC16] text-[10px] rounded-full border border-[#3F6212]/60">
                AI-Powered
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white mb-4 sm:mb-6 leading-tight px-2">
              הכלי האישי שלך<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]">
                לנהל לקוחות
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-[#F5F5F7] mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              מערכת לניהול לקוחות עם <strong className="text-[#C5A572]">פורטל לקוח</strong>, <strong className="text-[#C5A572]">ניהול קבוצות</strong>, ומעקב מתאמנים ופגישות. כולל סנכרון עם זום וגוגל מיט.
            </p>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-3xl mx-auto px-2">
              {[
                { text: 'פורטל לקוח', icon: Globe, desc: 'לקוחות נכנסים לראות מידע, משימות וקבצים' },
                { text: 'ניהול קבוצות', icon: Users, desc: 'ארגון לקוחות בקבוצות וצוותי עבודה' },
                { text: 'מעקב פגישות', icon: CalendarDays, desc: 'ניהול פגישות עם קישורים לזום וגוגל מיט' },
                { text: 'מעקב מתאמנים', icon: UserCircle, desc: 'מעקב התקדמות ותוכניות אימון' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:border-[#C5A572]/50 hover:bg-white/15 transition-all text-right">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#C5A572]/20 border border-[#C5A572]/40 flex items-center justify-center text-[#C5A572] shrink-0">
                      <item.icon size={16} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white mb-0.5">{item.text}</div>
                      <div className="text-xs text-[#94A3B8]">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Integration Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8 px-2">
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/30 text-xs font-medium text-white flex items-center gap-2 backdrop-blur-sm">
                <Video size={14} /> זום
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/30 text-xs font-medium text-white flex items-center gap-2 backdrop-blur-sm">
                <Video size={14} /> Google Meet
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/30 text-xs font-medium text-white flex items-center gap-2 backdrop-blur-sm">
                <Calendar size={14} /> Google Calendar
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-2">
              <button
                onClick={() => router.push('/sign-up')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#C5A572] hover:bg-[#D4AF6E] text-[#0F172A] rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5A572]/30 hover:scale-105 text-sm sm:text-base"
              >
                התחל ניסיון חינם <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
              </button>
              <button
                onClick={() => {
                  const element = document.getElementById('pricing');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 text-white border-2 border-white/30 rounded-xl font-bold transition-all backdrop-blur-md text-sm sm:text-base"
              >
                ראה מחירים
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Ease of Use Message */}
      <section className="py-12 sm:py-16 px-4 sm:px-6 bg-gradient-to-b from-[#0F172A] to-[#1E293B] relative z-10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-[#0F172A]/60 to-[#1E293B]/80 border border-[#C5A572]/30 rounded-2xl p-6 sm:p-8 text-center"
          >
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight px-2">
              כלי שלא נוח לך לעבוד איתו - הוא יקשה עליך.
            </h3>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#C5A572] mb-4 sm:mb-6 leading-tight px-2">
              כלי שאתה לומד איתו בשנייה ומדבר בשפה הפשוטה שלך - הוא חלק ממך.
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-[#F5F5F7] max-w-2xl mx-auto px-2">
              <span className="text-[#C5A572] font-bold">Client</span> - לא עוד כלי מסובך. כלי שאתה מבין מיד. כלי שעובד בשבילך, לא נגדך.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#1E293B]/30 relative">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-[#0F172A]/50 to-[#1E293B]/60 border border-[#C5A572]/30 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-8 sm:mb-12">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center shrink-0">
                <Target size={24} className="sm:w-8 sm:h-8 text-[#C5A572]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-3 sm:mb-4 leading-tight">משימות אישיות - כל עובד רואה רק את שלו</h2>
                <p className="text-sm sm:text-base md:text-lg text-[#F5F5F7] mb-4 leading-relaxed">
                  <strong className="text-white">Client</strong> מתמקדת בביצוע (Execution). כל עובד רואה רק את המשימות שלו, משימות Follow Up פשוטות לביצוע מיידי.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-[#0F172A]/50 rounded-xl border border-[#334155]">
                    <Check size={18} className="sm:w-5 sm:h-5 text-[#C5A572] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold mb-1 text-sm sm:text-base">משימות Follow Up</div>
                      <div className="text-xs sm:text-sm text-[#64748B]">התקשר, שלח מייל, עקוב אחר לקוח</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-[#0F172A]/50 rounded-xl border border-[#334155]">
                    <Check size={18} className="sm:w-5 sm:h-5 text-[#C5A572] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-bold mb-1 text-sm sm:text-base">ניתוח רווחיות אישי</div>
                      <div className="text-xs sm:text-sm text-[#64748B]">כל עובד רואה את הרווחיות של הלקוחות שלו</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-[#1E293B]/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">
              חיסכון בזמן.<br/>
              <span className="text-[#C5A572]">שקט נפשי.</span><br/>
              <span className="text-[#F5F5F7]">לכל סוג עסק.</span>
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Client חוסכת לך 10-15 שעות שבועיות על ניהול לקוחות. מפרילנסרים ועד חברות גדולות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">חיסכון בזמן</h3>
              <p className="text-sm text-[#64748B]">
                <strong className="text-white">10-15 שעות שבועיות</strong> שאתה חוסך על ניהול לקוחות, מעקב אחר פעילות, וחיפוש מידע מפוזר.
              </p>
            </div>
            <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <HeartPulse size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">שקט נפשי</h3>
              <p className="text-sm text-[#64748B]">
                <strong className="text-white">אין יותר כאב ראש</strong> מלקוחות שעוזבים, מידע אבוד, או הזדמנויות שנפספסות.
              </p>
            </div>
            <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">לכל סוג עסק</h3>
              <p className="text-sm text-[#64748B]">
                מפרילנסר עצמאי ועד חברה עם 100 לקוחות - <strong className="text-white">כל אחד יכול להרשות לעצמו.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4 sm:mb-6 leading-tight">
                כל מה שצריך לניהול לקוחות<br/>
                <span className="text-[#C5A572]">במקום אחד.</span>
              </h2>
              <p className="text-base sm:text-lg text-[#F5F5F7] mb-6 sm:mb-8 leading-relaxed">
                Client כוללת את כל הכלים לניהול לקוחות: פורטל לקוח, ניהול קבוצות, מעקב פגישות ומתאמנים, וסנכרון מלא עם זום וגוגל מיט.
              </p>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  'פורטל לקוח - לקוחות נכנסים לראות את המידע שלהם',
                  'ניהול קבוצות - ארגון לקוחות בקבוצות וצוותי עבודה',
                  'מעקב פגישות - עם קישורים ישירים לזום וגוגל מיט',
                  'מעקב מתאמנים - מעקב התקדמות ותוכניות אימון',
                  'סנכרון Google Calendar - כל הפגישות במקום אחד',
                  'ניהול משימות אישיות - כל עובד רואה רק את שלו'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-[#F5F5F7]">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#C5A572]/20 border border-[#C5A572]/40 flex items-center justify-center text-[#C5A572] shrink-0 mt-0.5">
                      <Check size={12} className="sm:w-[14px] sm:h-[14px]" strokeWidth={3} />
                    </div>
                    <span className="flex-1 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative order-1 lg:order-2">
              <div className="absolute inset-0 bg-[#C5A572]/20 blur-3xl -z-10 rounded-full"></div>
              <div className="relative z-10 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 bg-white/5 backdrop-blur-sm aspect-[4/3]">
                <ClientOSDemo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What's NOT Included - Strategic Positioning */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">מה <span className="text-slate-500">לא</span> כלול ב-Client?</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              Client מתמקדת בביצוע. היא לא מערכת ניהול ארגונית.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {[
              {
                title: 'אין שעון נוכחות',
                desc: 'Client לא עוקבת אחר נוכחות עובדים. זה לא חלק מהמטרה שלה.',
                icon: Users
              },
              {
                title: 'אין חישובי שכר',
                desc: 'אין חישוב משכורות או עמלות. Client מתמקדת בלקוחות, לא בניהול HR.',
                icon: TrendingUp
              },
              {
                title: 'אין ניהול עומסים',
                desc: 'אין ראייה רוחבית של כל המשימות. כל עובד רואה רק את שלו.',
                icon: Target
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 text-center"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} className="text-slate-500" />
                </div>
                <h3 className="text-lg font-bold text-slate-400 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Upgrade Path */}
          <div className="bg-gradient-to-r from-[#0F172A]/50 to-[#1E293B]/60 border border-[#C5A572]/30 rounded-3xl p-8 md:p-12">
            <div className="flex items-start gap-6">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Crown size={32} className="text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl sm:text-2xl font-black text-white mb-3 sm:mb-4 leading-tight">רוצה ניהול ארגוני מלא?</h3>
                <p className="text-lg text-slate-300 mb-4 leading-relaxed">
                  אם אתה רוצה לדעת <strong className="text-white">כמה הם עובדים, מי עמוס ומי פנוי, כמה לשלם להם בסוף החודש</strong>, ולנהל את המשימות הגדולות של העסק שלא קשורות ללקוח ספציפי – 
                  <span className="text-indigo-300 font-bold"> אתה חייב את ה-Nexus.</span>
                </p>
                <p className="text-base text-slate-400 mb-6 leading-relaxed">
                  <strong className="text-white">Client</strong> - כל עובד מקבל את הכלים שלו. <strong className="text-indigo-300">Nexus</strong> - זה מה שאתה צריך כדי לנהל את כל העסק.
                </p>
                <button
                  onClick={() => router.push('/login?redirect=/app')}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 text-sm sm:text-base"
                >
                  גלה את Nexus <ArrowRight size={18} className="rotate-180" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white text-center mb-8 sm:mb-12 leading-tight">
            מה כלול ב-Client?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: 'פורטל לקוח',
                desc: 'לקוחות נכנסים לראות את המידע שלהם, משימות, קבצים ומסמכים',
                icon: Globe
              },
              {
                title: 'ניהול קבוצות',
                desc: 'ארגון לקוחות בקבוצות, ניהול משותף וצוותי עבודה',
                icon: Users
              },
              {
                title: 'מעקב פגישות',
                desc: 'ניהול פגישות עם קישורים ישירים לזום וגוגל מיט, תזכורות אוטומטיות',
                icon: CalendarDays
              },
              {
                title: 'מעקב מתאמנים',
                desc: 'מעקב אחר התקדמות, משימות אישיות ותוכניות אימון מותאמות',
                icon: UserCircle
              },
              {
                title: 'סנכרון Google Calendar',
                desc: 'כל הפגישות והאירועים מסונכרנים אוטומטית עם Google Calendar',
                icon: Calendar
              },
              {
                title: 'משימות אישיות',
                desc: 'כל עובד רואה רק את המשימות שלו. אין בלגן, אין הסחות דעת.',
                icon: Target
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:border-[#C5A572]/50 hover:bg-white/15 transition-all group"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-[#C5A572]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-[#94A3B8]">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Growth & Clarity Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">
              זה לא רק חיסכון בזמן.<br/>
              <span className="text-[#C5A572]">זה צמיחה.</span>
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Client עוזרת לך להגדיל את העסק, להבין אותו לעומק, ולא לפחד להביא עוד עובדים.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {[
              {
                title: 'הגדלת העסק',
                desc: 'כשיש לך סדר בניהול לקוחות, אתה יכול להגדיל את העסק בלי לפחד. אתה רואה בדיוק מה קורה, מי עושה מה, ואיפה יש בעיות.',
                icon: TrendingUp,
                highlight: 'סדר = צמיחה'
              },
              {
                title: 'אין פחד מגיוס',
                desc: 'כשיש לך סדר, אתה לא מפחד להביא עוד מנהלי תיקים. אתה יודע בדיוק איך לנהל אותם, כמה לשלם להם, ומי עושה מה.',
                icon: Users,
                highlight: 'סדר = ביטחון'
              },
              {
                title: 'סדר ובהירות',
                desc: 'כל הלקוחות והמידע במקום אחד. אין בלגן, אין כפילויות, אין מידע אבוד. אתה יודע בדיוק מה קורה בכל רגע.',
                icon: Target,
                highlight: 'מידע = שליטה'
              },
              {
                title: 'מיקוד ודיוק',
                desc: 'אתה מתמקד במה שחשוב - שמירה על לקוחות. המערכת מנהלת את השאר. אין הסחות דעת, אין בזבוז זמן, רק עבודה יעילה.',
                icon: Zap,
                highlight: 'מיקוד = תוצאות'
              }
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6 hover:border-[#C5A572]/50 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C5A572]/10 border border-[#C5A572]/20 flex items-center justify-center mb-4">
                  <benefit.icon size={24} className="text-[#C5A572]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-[#64748B] leading-relaxed mb-3">{benefit.desc}</p>
                <div className="text-xs font-bold text-[#C5A572]">{benefit.highlight}</div>
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-[#0F172A]/50 to-[#1E293B]/60 border border-[#C5A572]/30 rounded-2xl p-6 text-center">
            <p className="text-[#F5F5F7] text-lg mb-2">
              <strong className="text-white">אל תפחד להגדיל את העסק.</strong> <strong className="text-[#C5A572]">יש לך סדר.</strong>
            </p>
            <p className="text-sm text-[#64748B]">
              רוצה להביא עוד מנהלי תיקים? אין בעיה. Client יראה לך בדיוק איך לנהל אותם. <strong className="text-white">סדר ובהירות. מיקוד ודיוק.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-900/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-3 sm:mb-4 leading-tight">
              החזר השקעה<br/>
              <span className="text-[#C5A572]">מובטח</span>
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto">
              Client חוסכת לך זמן וכסף. הנה החישוב:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">פרילנסרים</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">חיסכון זמן:</span>
                  <span className="text-white font-bold">10-15 שעות/שבוע</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">שווי שעה:</span>
                  <span className="text-white font-bold">₪100-200</span>
                </div>
                <div className="h-px bg-[#334155]"></div>
                <div className="flex justify-between">
                  <span className="text-[#F5F5F7] font-bold">ערך חודשי:</span>
                  <span className="text-[#C5A572] font-black text-xl">₪4,000-8,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">עלות Solo:</span>
                  <span className="text-[#C5A572] font-bold">₪99/חודש</span>
                </div>
              </div>
              <div className="bg-[#C5A572]/10 border border-[#C5A572]/30 rounded-xl p-3 text-center">
                <div className="text-xs text-[#64748B] mb-1">החזר השקעה</div>
                <div className="text-xl font-black text-[#C5A572]">4,000%+</div>
              </div>
            </div>

            <div className="bg-[#0F172A]/50 border border-[#334155] rounded-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-4">עסקים קטנים</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-[#64748B]">חיסכון זמן:</span>
                  <span className="text-white font-bold">15-20 שעות/שבוע</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">שווי שעה (צוות):</span>
                  <span className="text-white font-bold">₪150-300</span>
                </div>
                <div className="h-px bg-[#334155]"></div>
                <div className="flex justify-between">
                  <span className="text-[#F5F5F7] font-bold">ערך חודשי:</span>
                  <span className="text-[#C5A572] font-black text-xl">₪9,000-18,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64748B]">עלות סטארטר:</span>
                  <span className="text-[#C5A572] font-bold">₪199/חודש</span>
                </div>
              </div>
              <div className="bg-[#C5A572]/10 border border-[#C5A572]/30 rounded-xl p-3 text-center">
                <div className="text-xs text-[#64748B] mb-1">החזר השקעה</div>
                <div className="text-xl font-black text-[#C5A572]">4,500%+</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-[#0F172A]/50 to-[#1E293B]/60 border border-[#C5A572]/30 rounded-2xl p-6 text-center">
            <p className="text-[#F5F5F7] text-lg mb-2">
              <strong className="text-white">₪99/חודש</strong> לפרילנסר = חיסכון של <strong className="text-[#C5A572]">₪4,000-8,000/חודש</strong> בזמן.
            </p>
            <p className="text-sm text-slate-400">
              זה לא הוצאה. זה השקעה. <strong className="text-white">14 יום ניסיון חינם</strong> - תראה בעצמך.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-[#0F172A] relative z-10 overflow-hidden border-y border-[#334155]/50">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#C5A572]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0F172A]/30 border border-[#334155]/50 text-[#C5A572] text-xs font-bold mb-6 backdrop-blur-md">
              <DollarSign size={14} className="text-[#C5A572]" />
              <span>תמחור שקוף</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              בחר את התוכנית<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]">שמתאימה לך</span>
            </h2>
            <p className="text-lg text-[#64748B] max-w-2xl mx-auto mb-4">
              ללא התחייבות. ביטול בכל עת. כל התוכניות כוללות ניסיון חינם של 14 יום.
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-12">
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'monthly' ? 'text-white' : 'text-[#64748B]'}`}>
                חודשי
              </span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className={`relative w-14 h-8 rounded-full transition-all duration-300 ${
                  billingCycle === 'yearly' ? 'bg-[#C5A572]' : 'bg-[#334155]'
                }`}
              >
                <motion.div
                  className="absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg"
                  animate={{ x: billingCycle === 'yearly' ? 24 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={`text-sm font-bold transition-colors ${billingCycle === 'yearly' ? 'text-white' : 'text-[#64748B]'}`}>
                שנתי
                <span className="ml-2 px-2 py-0.5 bg-[#C5A572]/20 text-[#C5A572] text-xs rounded-full border border-[#C5A572]/30">
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
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto"
            >
              <PricingCard
                title="Solo"
                subtitle="ללקוחות וניהול תיקים - לפרילנסרים"
                price={billingCycle === 'monthly' ? 99 : 79}
                features={[
                  'משתמש יחיד - מושלם לפרילנסרים',
                  'משימות אישיות',
                  'ניהול לקוחות בסיסי',
                  'ניתוח רווחיות בסיסי',
                  'משימות Follow Up (התקשר, שלח מייל)',
                  'תמיכה באימייל',
                  '500MB אחסון קבצים',
                  <span key="roi" className="text-[#C5A572] font-bold">החזר השקעה: חיסכון של 10+ שעות/שבוע = ₪4,000-8,000/חודש</span>
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=solo&system=client&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="סטארטר"
                price={billingCycle === 'monthly' ? 199 : 159}
                features={[
                  'עד 3 משתמשים',
                  'משימות אישיות - כל עובד רואה רק את שלו',
                  'ניהול לקוחות בסיסי',
                  'ניתוח רווחיות בסיסי',
                  'משימות Follow Up (התקשר, שלח מייל)',
                  'תמיכה באימייל',
                  '1GB אחסון קבצים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=starter&system=client&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="פרו"
                subtitle="ללקוחות וניהול תיקים - עד 10 משתמשים"
                price={billingCycle === 'monthly' ? 399 : 319}
                features={[
                  'עד 10 משתמשים',
                  'כל הפיצ׳רים של סטארטר',
                  'זיהוי נטישה מוקדם (AI)',
                  'ניתוח P&L מתקדם',
                  'דוחות לקוחות מתקדמים',
                  'תמיכה עדיפות',
                  '25GB אחסון קבצים',
                  'אינטגרציות מלאות'
                ]}
                recommended={true}
                onSelect={() => router.push(`/subscribe/checkout?plan=pro&system=client&billing=${billingCycle}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="עסקי"
                subtitle="ללקוחות וניהול תיקים - ללא הגבלה"
                price={billingCycle === 'monthly' ? 899 : 719}
                features={[
                  'משתמשים ללא הגבלה',
                  'כל הפיצ׳רים של פרו',
                  'Liability Shield (AI)',
                  'ניתוח רגשי של שיחות',
                  'API מלא',
                  'אימות SSO',
                  'גיבויים יומיים',
                  'תמיכה 24/7',
                  'אחסון ללא הגבלה',
                  'ניהול מותאם אישית'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?plan=enterprise&system=client&billing=${billingCycle}`)}
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
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-gradient-to-b from-slate-900/50 to-[#020617]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 sm:mb-6 leading-tight">
            מוכן לשמור על הלקוחות שלך?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            Client היא הכלי האישי שלך. פשוט, מהיר, ממוקד.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <button
              onClick={() => router.push('/sign-up')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#0F172A] to-[#1E293B] hover:from-[#1E293B] hover:to-[#334155] text-[#C5A572] border-2 border-[#C5A572]/50 hover:border-[#C5A572] rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5A572]/30 hover:scale-105 text-sm sm:text-base"
            >
              התחל ניסיון חינם <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
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
      </section>

      <Footer />
    </div>
  );
}

