'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, HeartPulse, Check, Target, Phone, Users, TrendingUp, SquareActivity, DollarSign, Clock, Zap, Globe, CalendarDays, CircleUser, Video, Calendar, Sparkles, Shield, Star, Briefcase, Play } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ClientOSDemo } from '@/components/landing/demos/ClientOSDemo';
import { PricingCard } from '@/components/landing/PricingCard';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { DemoVideoModal } from '@/components/landing/DemoVideoModal';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';

export default function ClientOSPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden" dir="rtl">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-20 px-4 sm:px-6 overflow-hidden bg-white">
        {/* Background with Better Contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#F5F5F7] via-white to-slate-50"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#C5A572]/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white border border-[#C5A572]/30 text-[#C5A572] text-[10px] sm:text-xs font-bold mb-4 sm:mb-6 shadow-sm">
              <HeartPulse size={12} className="sm:w-[14px] sm:h-[14px]" /> {getModuleLabelHe('client')}
              <span className="ml-2 px-2 py-0.5 bg-[#3F6212]/40 text-[#84CC16] text-[10px] rounded-full border border-[#3F6212]/60">
                AI-Powered
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight px-2">
              הכלי האישי שלך<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]">
                לנהל לקוחות
              </span>
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-2">
              מערכת לניהול לקוחות עם <strong className="text-[#C5A572]">פורטל לקוח</strong>, <strong className="text-[#C5A572]">ניהול קבוצות</strong>, ומעקב מתאמנים. <strong className="text-[#C5A572]">אינטגרציה מלאה עם Zoom ו-Google Meet</strong> - יצירת לינק פגישה אוטומטית.
            </p>

            {/* Core Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 max-w-3xl mx-auto px-2">
              {[
                { text: 'פורטל לקוח', icon: Globe, desc: 'לקוחות נכנסים לראות מידע, משימות וקבצים' },
                { text: 'ניהול קבוצות', icon: Users, desc: 'ארגון לקוחות בקבוצות וצוותי עבודה' },
                { text: 'ניהול פגישות', icon: CalendarDays, desc: 'תזמון פגישות, מעקב וניתוח אינטליגנטי של פגישות' },
                { text: 'ניהול משימות', icon: CircleUser, desc: 'מעקב אחר משימות, תהליכים ותיעוד עבודה' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-white border border-slate-200 hover:border-[#C5A572]/30 hover:bg-slate-50 transition-all text-right shadow-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-[#C5A572]/20 border border-[#C5A572]/40 flex items-center justify-center text-[#C5A572] shrink-0">
                      <item.icon size={16} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-slate-900 mb-0.5">{item.text}</div>
                      <div className="text-xs text-slate-600">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Integration Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8 px-2">
              <div className="px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs font-bold text-blue-700 flex items-center gap-2 shadow-sm">
                <Video size={14} /> Zoom
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-bold text-green-700 flex items-center gap-2 shadow-sm">
                <Video size={14} /> Google Meet
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-2 shadow-sm">
                <Calendar size={14} /> Google Calendar
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 flex items-center gap-2 shadow-sm">
                <Users size={14} /> Groups Management
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12 px-2">
              <button
                onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#C5A572] hover:bg-[#D4AF6E] text-[#0F172A] rounded-full font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#C5A572]/30 hover:scale-105 text-sm sm:text-base"
              >
                התחל ניסיון חינם <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
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
              כלי שלא נוח לך לעבוד איתו - הוא יקשה עליך.
            </h3>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-[#C5A572] mb-4 sm:mb-6 leading-tight px-2">
              כלי שאתה לומד איתו בשנייה ומדבר בשפה הפשוטה שלך - הוא חלק ממך.
            </h3>
            <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto px-2">
              <span className="text-[#C5A572] font-bold">{getModuleLabelHe('client')}</span> - לא עוד כלי מסובך. כלי שאתה מבין מיד. כלי שעובד בשבילך, לא נגדך.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Key Differentiator Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white relative">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mb-8 sm:mb-12 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center shrink-0">
                <Target size={24} className="sm:w-8 sm:h-8 text-[#C5A572]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">משימות אישיות - כל עובד רואה רק את שלו</h2>
                <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-4 leading-relaxed">
                  <strong className="text-slate-900">{getModuleLabelHe('client')}</strong> מתמקדת בביצוע (Execution). כל עובד רואה רק את המשימות שלו, משימות Follow Up פשוטות לביצוע מיידי.
                </p>
                <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-[#C5A572] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">משימות Follow Up</div>
                      <div className="text-xs sm:text-sm text-slate-600">התקשר, שלח מייל, עקוב אחר לקוח</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <Check size={18} className="sm:w-5 sm:h-5 text-[#C5A572] shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-900 font-bold mb-1 text-sm sm:text-base">ניתוח רווחיות אישי</div>
                      <div className="text-xs sm:text-sm text-slate-600">כל עובד רואה את הרווחיות של הלקוחות שלו</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">
              חיסכון בזמן.<br/>
              <span className="text-[#C5A572]">שקט נפשי.</span><br/>
              <span className="text-slate-600">לכל סוג עסק.</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getModuleLabelHe('client')} חוסכת לך 10-15 שעות שבועיות על ניהול לקוחות. מפרילנסרים ועד חברות גדולות.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <Clock size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">חיסכון בזמן</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">10-15 שעות שבועיות</strong> שאתה חוסך על ניהול לקוחות, מעקב אחר פעילות, וחיפוש מידע מפוזר.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <HeartPulse size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">שקט נפשי</h3>
              <p className="text-sm text-slate-600">
                <strong className="text-slate-900">אין יותר כאב ראש</strong> מלקוחות שעוזבים, מידע אבוד, או הזדמנויות שנפספסות.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/30 flex items-center justify-center mx-auto mb-4">
                <Users size={24} className="text-[#C5A572]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">לכל סוג עסק</h3>
              <p className="text-sm text-slate-600">
                מפרילנסר עצמאי ועד חברה עם 100 לקוחות - <strong className="text-slate-900">כל אחד יכול להרשות לעצמו.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Demo Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-white"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight">
                כל מה שצריך לניהול לקוחות<br/>
                <span className="text-[#C5A572]">במקום אחד.</span>
              </h2>
              <p className="text-base sm:text-lg text-slate-600 mb-6 sm:mb-8 leading-relaxed">
                {getModuleLabelHe('client')} כוללת את כל הכלים לניהול לקוחות: פורטל לקוח, ניהול קבוצות, מעקב פגישות ומתאמנים, וסנכרון מלא עם זום וגוגל מיט.
              </p>
              <ul className="space-y-3 sm:space-y-4">
                {[
                  'פורטל לקוח - לקוחות נכנסים לראות את המידע שלהם',
                  'אינטגרציה מלאה עם Zoom - יצירת לינק פגישה אוטומטית',
                  'אינטגרציה מלאה עם Google Meet - קישור ישיר מהמערכת',
                  'ניהול קבוצות - ארגון לקוחות בקבוצות וצוותי עבודה',
                  'Meeting Intelligence - ניתוח אינטליגנטי של פגישות',
                  'סנכרון Google Calendar - כל הפגישות במקום אחד',
                  'ניהול משימות אישיות - כל עובד רואה רק את שלו'
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 sm:gap-3 text-sm sm:text-base text-slate-600">
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
              <div className="relative z-10 rounded-[32px] border-8 border-slate-900 shadow-2xl shadow-slate-900/20 bg-slate-900 aspect-[4/3] animate-float overflow-hidden">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-1.5 rounded-full bg-white/10"></div>
                <div className="absolute inset-0 rounded-[24px] bg-white overflow-hidden">
                  <ClientOSDemo />
                </div>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-white/0 via-white/0 to-white/15"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-center mb-8 sm:mb-12 leading-tight">
            מה כלול ב{getModuleLabelHe('client')}?
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
                icon: CircleUser
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
                className="bg-white border border-slate-200 rounded-2xl p-6 hover:border-[#C5A572]/30 transition-all group shadow-sm hover:shadow-md"
              >
                <div className="w-12 h-12 rounded-xl bg-[#C5A572]/20 border border-[#C5A572]/40 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon size={24} className="text-[#C5A572]" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 mb-3 sm:mb-4 leading-tight">
              החזר השקעה<br/>
              <span className="text-[#C5A572]">מובטח</span>
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              {getModuleLabelHe('client')} חוסכת לך זמן וכסף. הנה החישוב:
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-4">פרילנסרים</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">חיסכון זמן:</span>
                  <span className="text-slate-900 font-bold">10-15 שעות/שבוע</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">שווי שעה:</span>
                  <span className="text-slate-900 font-bold">₪100-200</span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between">
                  <span className="text-slate-700 font-bold">ערך חודשי:</span>
                  <span className="text-[#C5A572] font-black text-xl">₪4,000-8,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">עלות Solo:</span>
                  <span className="text-[#C5A572] font-bold">₪149/חודש</span>
                </div>
              </div>
              <div className="bg-[#C5A572]/10 border border-[#C5A572]/20 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-600 mb-1">החזר השקעה</div>
                <div className="text-xl font-black text-[#C5A572]">4,000%+</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold text-slate-900 mb-4">ארגונים וצוותים</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-600">חיסכון זמן:</span>
                  <span className="text-slate-900 font-bold">15-20 שעות/שבוע</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">שווי שעה (צוות):</span>
                  <span className="text-slate-900 font-bold">₪150-300</span>
                </div>
                <div className="h-px bg-slate-200"></div>
                <div className="flex justify-between">
                  <span className="text-slate-700 font-bold">ערך חודשי:</span>
                  <span className="text-[#C5A572] font-black text-xl">₪9,000-18,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">עלות חבילת שיווק ומיתוג:</span>
                  <span className="text-[#C5A572] font-bold">₪349/חודש</span>
                </div>
              </div>
              <div className="bg-[#C5A572]/10 border border-[#C5A572]/20 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-600 mb-1">החזר השקעה</div>
                <div className="text-xl font-black text-[#C5A572]">4,500%+</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
            <p className="text-slate-700 text-lg mb-2">
              <strong className="text-slate-900">₪149/חודש</strong> למודול בודד = חיסכון של <strong className="text-[#C5A572]">₪4,000-8,000/חודש</strong> בזמן.
            </p>
            <p className="text-sm text-slate-600">
              זה לא הוצאה. זה השקעה. <strong className="text-slate-900">7 ימים ניסיון חינם</strong> - תראה בעצמך.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-slate-50 relative z-10 overflow-hidden border-y border-slate-200">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-[#C5A572]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#C5A572]/30 text-[#C5A572] text-xs font-bold mb-6 shadow-sm">
              <DollarSign size={14} className="text-[#C5A572]" />
              <span>תמחור שקוף</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight">
              בחר את התוכנית<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C5A572] via-[#D4AF6E] to-[#E5C17A]">
                שמתאימה לך
              </span>
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
                  billingCycle === 'yearly' ? 'bg-[#C5A572]' : 'bg-slate-200'
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
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto"
            >
              <PricingCard
                title={getModuleLabelHe('client')}
                subtitle="מודול בודד (משתמש אחד)"
                price={billingCycle === 'monthly' ? 149 : Math.round(149 * 0.8)}
                accent="gold"
                features={[
                  'משתמש אחד (ללא ניהול צוות)',
                  'פורטל לקוח',
                  'ניהול קבוצות',
                  'מעקב פגישות',
                  <span key="roi" className="text-[#C5A572] font-bold">החזר השקעה: חיסכון של 10+ שעות/שבוע = ₪4,000-8,000/חודש</span>
                ]}
                recommended={true}
                onSelect={() => router.push(`/subscribe/checkout?package=solo&module=client&billing=${billingCycle}&product=${encodeURIComponent(getModuleLabelHe('client'))}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="חבילת שיווק ומיתוג"
                subtitle="כולל 5 משתמשים · +₪39 לכל מושב נוסף"
                price={billingCycle === 'monthly' ? 349 : Math.round(349 * 0.8)}
                accent="gold"
                features={[
                  getModuleLabelHe('social'),
                  getModuleLabelHe('client'),
                  getModuleLabelHe('nexus'),
                  'סנכרון מלא בין המודולים',
                  '5 משתמשים כלולים'
                ]}
                recommended={false}
                onSelect={() => router.push(`/subscribe/checkout?package=the_authority&billing=${billingCycle}&seats=5&product=${encodeURIComponent('חבילת שיווק ומיתוג')}`)}
                billingCycle={billingCycle}
              />
              <PricingCard
                title="הכל כלול"
                subtitle="כולל 5 משתמשים · +₪39 לכל מושב נוסף"
                price={billingCycle === 'monthly' ? 499 : Math.round(499 * 0.8)}
                accent="gold"
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

      <SalesFaq variant="client" />

      {/* CTA Section */}
      <section className="py-12 sm:py-16 md:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 mb-4 sm:mb-6 leading-tight">
            מוכן לשמור על הלקוחות שלך?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-slate-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
            {getModuleLabelHe('client')} היא הכלי האישי שלך. פשוט, מהיר, ממוקד.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-2">
            <button
              onClick={() => router.push('/login?mode=sign-up&redirect=/workspaces/onboarding')}
              className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-[#C5A572] hover:bg-[#D4AF6E] text-slate-900 border border-[#C5A572]/30 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:scale-105 text-sm sm:text-base"
            >
              התחל ניסיון חינם (בלי כרטיס) <ArrowRight size={18} className="sm:w-5 sm:h-5 rotate-180" />
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
      </section>

      {/* Testimonials Section */}
      <TestimonialsSection />

      <Footer />
      
      <DemoVideoModal 
        isOpen={isVideoModalOpen} 
        onClose={() => setIsVideoModalOpen(false)} 
      />
    </div>
  );
}

