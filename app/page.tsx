import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ClipboardCheck, ArrowLeft, Sparkles, Zap, Shield, Users, Eye, Target, Rocket, MessageCircle, Share2, Gift, TrendingUp, Monitor, Smartphone, Plus, Cloud, Fingerprint, X } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/server/authHelper';
import { loadCurrentUserLastLocation } from '@/lib/server/workspace';
import { Navbar } from '@/components/landing/Navbar';
import { auth } from '@clerk/nextjs/server';
import { Footer } from '@/components/landing/Footer';
import KillerFeaturesBox from '@/components/landing/KillerFeaturesBox';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import { SalesFaq } from '@/components/landing/SalesFaq';
import { CTAButtons } from '@/components/landing/CTAButtons';
import { PartnersLogosSection } from '@/components/landing/PartnersLogosSection';

export const dynamic = 'force-dynamic';
export const maxDuration = 10;

async function getLandingSettings() {
  try {
    const row = await Promise.race([
      prisma.social_system_settings.findUnique({
        where: { key: 'landing_settings' },
        select: { value: true },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
    ]);
    const value = (row as any)?.value || {};
    return {
      logo: value.logo ?? null,
      logoText: value.logoText ?? null,
    };
  } catch {
    return { logo: null, logoText: null };
  }
}

export default async function RootPage() {
  // Landing page is now always accessible for all users (logged in or not)
  // Logged-in users can navigate to /me for automatic workspace routing
  
  const [landingSettings, authData] = await Promise.all([
    getLandingSettings(),
    auth(),
  ]);
  
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden flex flex-col" dir="rtl">
      <Navbar 
        initialLogo={landingSettings.logo}
        initialLogoText={landingSettings.logoText}
        isSignedIn={!!authData.userId}
      />
      
      {/* Visual Hook - Modules Bar */}
      <div className="hidden pt-20 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {[
              { name: 'Operations', icon: ClipboardCheck, iconClass: 'text-emerald-500' },
              { name: 'System', icon: Target, iconClass: 'text-blue-500' },
              { name: 'Nexus', icon: Rocket, iconClass: 'text-purple-500' },
              { name: 'Social', icon: Share2, iconClass: 'text-rose-500' },
              { name: 'Client', icon: Users, iconClass: 'text-amber-500' },
              { name: 'Finance', icon: TrendingUp, iconClass: 'text-cyan-500' },
            ].map((module) => {
              const Icon = module.icon;
              return (
                <div 
                  key={module.name}
                  className="group flex items-center gap-2 px-3 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/60 hover:border-slate-300 hover:bg-white hover:shadow-md transition-all cursor-pointer"
                >
                  <Icon size={14} className={`${module.iconClass} group-hover:scale-110 transition-transform`} />
                  <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                    {module.name}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-4">
            <p className="text-xs font-bold text-slate-400 tracking-wide">
              מערכת אחת. 6 מודולים.
            </p>
          </div>
        </div>
      </div>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
          {/* Background Effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/40 via-rose-200/30 to-transparent rounded-full blur-[120px]" />
            <div className="absolute -bottom-32 -left-24 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-200/30 via-purple-200/20 to-transparent rounded-full blur-[150px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-100/20 to-cyan-100/20 rounded-full blur-[200px]" />
          </div>

          <div className="max-w-7xl mx-auto px-6 pt-32 sm:pt-48 md:pt-56 pb-16 sm:pb-20 relative">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                {/* Badge - Clean */}
                <div className="text-center lg:text-right mb-5 sm:mb-6 md:mb-8">
                  <div className="inline-flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 md:py-2 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 sm:border-2 shadow-md sm:shadow-lg">
                    <span className="px-2 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] sm:text-xs md:text-sm font-black flex items-center gap-1 sm:gap-1.5 md:gap-2 shadow-sm sm:shadow-md">
                      <Sparkles size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
                      MISRAD AI
                    </span>
                    <span className="text-[10px] sm:text-xs md:text-sm font-bold text-indigo-700 leading-none">מערכת ניהול משולבת</span>
                  </div>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-tight text-center lg:text-right">
                  <span className="text-slate-900">תהיו המנכ״ל האמיתי</span>
                  <span className="block mt-2 text-slate-900">של העסק שלכם.</span>
                  <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-rose-700 drop-shadow-sm">
                    תעבדו על העסק, לא בתוך העסק.
                  </span>
                </h1>

                <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed text-center lg:text-right mx-auto lg:mx-0">
                  מערכת ניהול שעושה את העבודה הכבדה. לקוחות, משימות, תשלומים
                  <span className="font-semibold text-slate-700"> — הכל זורם אוטומטית.</span>
                </p>

                {/* Real Benefits */}
                <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-4 md:gap-6 text-xs sm:text-sm md:text-base">
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-slate-700">
                    <Shield size={16} className="sm:w-5 sm:h-5 text-emerald-500" />
                    <span className="font-bold whitespace-nowrap">מאובטח ומוגן</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-slate-700">
                    <Zap size={16} className="sm:w-5 sm:h-5 text-indigo-500" />
                    <span className="font-bold whitespace-nowrap">התחלה מהירה</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 text-slate-700">
                    <Users size={16} className="sm:w-5 sm:h-5 text-amber-500" />
                    <span className="font-bold whitespace-nowrap">תמיכה בעברית</span>
                  </div>
                </div>


                {/* Trust Badges */}
                <div className="hidden mt-5 flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-emerald-500" />
                    <span>ללא כרטיס אשראי</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    <span>ביטול בכל עת</span>
                  </div>
                </div>
              </div>

              {/* Real Dashboard Screenshot */}
              <div className="relative lg:mt-0 mt-8 sm:mt-12">
                <div className="absolute -inset-6 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-rose-500/20 rounded-[3rem] blur-3xl" />
                <div className="relative rounded-3xl bg-gradient-to-br from-slate-50 to-white border-2 border-slate-200/80 shadow-2xl overflow-hidden">
                  {/* Dashboard Header */}
                  <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">דשבורד ראשי</div>
                        <div className="text-[10px] font-bold text-slate-500">העסק שלי</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-[10px] font-bold text-emerald-600">מחובר</span>
                    </div>
                  </div>

                  {/* Dashboard Stats */}
                  <div className="p-3 sm:p-6 space-y-3 sm:space-y-4">
                    {/* Revenue & Stats Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 text-emerald-600" />
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">הכנסות חודשיות</span>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900">₪47,200</div>
                        <div className="text-[8px] sm:text-[9px] font-bold text-emerald-600">+23% מחודש שעבר</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Target size={12} className="sm:w-3.5 sm:h-3.5 text-blue-600" />
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">לידים פעילים</span>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900">34</div>
                        <div className="text-[8px] sm:text-[9px] font-bold text-blue-600">12 חדשים השבוע</div>
                      </div>
                      <div className="bg-white rounded-xl border border-slate-200 p-2.5 sm:p-3 col-span-2 sm:col-span-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Users size={12} className="sm:w-3.5 sm:h-3.5 text-purple-600" />
                          </div>
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-500">לקוחות פעילים</span>
                        </div>
                        <div className="text-base sm:text-lg font-black text-slate-900">28</div>
                        <div className="text-[8px] sm:text-[9px] font-bold text-purple-600">96% שביעות רצון</div>
                      </div>
                    </div>

                    {/* Active Leads List */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-[10px] sm:text-xs font-black text-slate-900">לידים חמים</h3>
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">5 פעילים</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: 'יוסי כהן', company: 'כהן אחים בע"מ', status: 'מחכה להצעה', color: 'amber' },
                          { name: 'שרה לוי', company: 'לוי שיווק', status: 'משא ומתן', color: 'blue' },
                          { name: 'דוד מזרחי', company: 'מזרחי טק', status: 'חתימה', color: 'emerald' },
                        ].map((lead, i) => (
                          <div key={i} className="flex items-center gap-3 p-2 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-700 font-black text-[10px]">
                              {lead.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-black text-slate-900 truncate">{lead.name}</div>
                              <div className="text-[9px] font-bold text-slate-500 truncate">{lead.company}</div>
                            </div>
                            <span className={`text-[8px] font-bold px-2 py-1 rounded-md bg-${lead.color}-100 text-${lead.color}-700 whitespace-nowrap`}>
                              {lead.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tasks Today */}
                    <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <h3 className="text-[10px] sm:text-xs font-black text-slate-900">משימות להיום</h3>
                        <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">3 מתוך 7</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { task: 'שיחת מעקב עם יוסי כהן', done: true },
                          { task: 'הכנת הצעת מחיר למזרחי', done: true },
                          { task: 'עדכון לוח שידורים', done: false },
                        ].map((item, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              item.done 
                                ? 'bg-emerald-500 border-emerald-500' 
                                : 'border-slate-300'
                            }`}>
                              {item.done && <div className="w-2 h-2 bg-white rounded-sm" />}
                            </div>
                            <span className={`text-[10px] font-bold ${
                              item.done 
                                ? 'text-slate-400 line-through' 
                                : 'text-slate-700'
                            }`}>
                              {item.task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <CTAButtons />
          </div>
        </section>

        {/* Real Device Mockups Section */}
        <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
          {/* Background Gradients */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl sm:text-5xl font-black mb-6">
                המשרד שלכם. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">בכל מקום.</span>
              </h2>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto">
                מהמחשב במשרד או מהנייד בשטח. חוויית משתמש אחידה, מהירה ומאובטחת.
                הכל מסונכרן בזמן אמת.
              </p>
            </div>

            <div className="hidden grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              
              {/* Desktop Mockup */}
              <div className="relative group">
                <div className="absolute -inset-4 bg-indigo-500/10 rounded-2xl blur-2xl" />
                
                {/* Macbook Frame */}
                <div className="relative bg-gradient-to-b from-slate-950 to-slate-900 rounded-2xl border-2 border-slate-700/50 shadow-xl overflow-hidden aspect-[16/10]">
                  {/* Screen Content */}
                  <div className="absolute inset-0 bg-slate-900 flex flex-col">
                    {/* Window Header */}
                    <div className="h-8 bg-slate-800/90 backdrop-blur-sm flex items-center px-4 gap-2 border-b border-slate-700/50">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500" />
                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex-1 text-center text-xs text-slate-400 font-mono flex items-center justify-center gap-2">
                        <Shield size={10} className="text-emerald-500" />
                        <span>misrad-ai.com</span>
                      </div>
                    </div>
                    
                    {/* App UI with Live Data Visualization */}
                    <div className="flex-1 p-4 grid grid-cols-12 gap-3 relative">
                      {/* Sidebar */}
                      <div className="col-span-3 bg-slate-800/50 rounded-xl p-3 space-y-2 border border-slate-700/30">
                        <div className="h-6 bg-gradient-to-r from-indigo-600/40 to-purple-600/40 rounded-lg animate-pulse" />
                        <div className="h-6 bg-slate-700/30 rounded-lg" />
                        <div className="h-6 bg-slate-700/30 rounded-lg" />
                        <div className="h-6 bg-slate-700/30 rounded-lg" />
                      </div>
                      
                      {/* Main Content */}
                      <div className="col-span-9 grid grid-rows-3 gap-3">
                        {/* Stats Card with animated bars */}
                        <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-4 border border-indigo-500/20 row-span-1">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-xs text-indigo-300 font-bold">ביצועים השבוע</div>
                            <TrendingUp size={12} className="text-emerald-400" />
                          </div>
                          <div className="flex gap-1 h-12 items-end">
                            <div className="flex-1 bg-indigo-500/30 rounded-t animate-[grow_2s_ease-in-out_infinite]" style={{height: '60%'}} />
                            <div className="flex-1 bg-indigo-500/40 rounded-t animate-[grow_2s_ease-in-out_infinite_0.2s]" style={{height: '80%'}} />
                            <div className="flex-1 bg-indigo-500/50 rounded-t animate-[grow_2s_ease-in-out_infinite_0.4s]" style={{height: '100%'}} />
                            <div className="flex-1 bg-purple-500/50 rounded-t animate-[grow_2s_ease-in-out_infinite_0.6s]" style={{height: '75%'}} />
                            <div className="flex-1 bg-purple-500/40 rounded-t animate-[grow_2s_ease-in-out_infinite_0.8s]" style={{height: '90%'}} />
                          </div>
                        </div>
                        
                        {/* Cards Grid with icons */}
                        <div className="grid grid-cols-3 gap-3 row-span-2">
                          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 hover:border-emerald-500/30 transition-colors relative overflow-hidden group/card">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            <Target size={16} className="text-emerald-400 mb-2" />
                            <div className="h-2 w-3/4 bg-slate-700/50 rounded mb-1" />
                            <div className="h-2 w-1/2 bg-slate-700/30 rounded" />
                          </div>
                          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 hover:border-purple-500/30 transition-colors relative overflow-hidden group/card">
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            <Rocket size={16} className="text-purple-400 mb-2" />
                            <div className="h-2 w-3/4 bg-slate-700/50 rounded mb-1" />
                            <div className="h-2 w-1/2 bg-slate-700/30 rounded" />
                          </div>
                          <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30 hover:border-amber-500/30 transition-colors relative overflow-hidden group/card">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />
                            <Users size={16} className="text-amber-400 mb-2" />
                            <div className="h-2 w-3/4 bg-slate-700/50 rounded mb-1" />
                            <div className="h-2 w-1/2 bg-slate-700/30 rounded" />
                          </div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                  
                  {/* Screen Reflection & Glare */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.08] pointer-events-none" />
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                </div>
                
                {/* Macbook Base with depth */}
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[110%] h-4 bg-gradient-to-b from-slate-800 to-slate-900 rounded-b-xl shadow-2xl flex items-center justify-center border-t border-slate-700/50">
                  <div className="w-1/3 h-0.5 bg-slate-950 rounded-full" />
                </div>

                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-bold">
                    <Monitor size={16} />
                    <span>PC / Mac / Tablet</span>
                  </div>
                </div>
              </div>

              {/* Mobile Mockup */}
              <div className="relative flex justify-center lg:justify-end">
                <div className="relative w-[300px] h-[600px] group">
                  {/* Glow */}
                  <div className="absolute -inset-3 bg-indigo-500/10 rounded-[3rem] blur-xl" />
                  
                  {/* iPhone Frame */}
                  <div className="relative w-full h-full bg-black rounded-[3rem] border-[8px] border-slate-800 shadow-xl overflow-hidden ring-1 ring-white/10">
                    {/* Dynamic Island */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-7 bg-black rounded-b-2xl z-20" />
                    
                    {/* Screen Content */}
                    <div className="absolute inset-0 bg-slate-900 flex flex-col overflow-hidden">
                      <div className="pt-14 px-6 text-center">
                        {/* Biometric Icon */}
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                          <svg className="w-9 h-9 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                            <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                            <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                            <path d="M2 12a10 10 0 0 1 18-6" />
                            <path d="M2 16h.01" />
                            <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                            <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
                          </svg>
                        </div>

                        <div className="text-2xl font-black text-white leading-tight">ברוכים הבאים</div>
                        <div className="text-slate-400 text-sm mt-1">הניחו אצבע לכניסה</div>
                      </div>

                      {/* Subtle static content (avoids empty black area) */}
                      <div className="mt-6 px-6 flex-1 w-full flex flex-col gap-4">
                        <div className="rounded-2xl bg-slate-800/40 border border-slate-700/40 p-4">
                          <div className="h-2.5 w-40 bg-slate-700/60 rounded mb-3" />
                          <div className="space-y-2">
                            <div className="h-2 w-full bg-slate-700/30 rounded" />
                            <div className="h-2 w-5/6 bg-slate-700/25 rounded" />
                            <div className="h-2 w-2/3 bg-slate-700/20 rounded" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-2xl bg-slate-800/30 border border-slate-700/30 p-3">
                            <div className="h-2 w-16 bg-indigo-500/30 rounded mb-2" />
                            <div className="h-2 w-20 bg-slate-700/30 rounded" />
                          </div>
                          <div className="rounded-2xl bg-slate-800/30 border border-slate-700/30 p-3">
                            <div className="h-2 w-16 bg-purple-500/25 rounded mb-2" />
                            <div className="h-2 w-20 bg-slate-700/30 rounded" />
                          </div>
                        </div>

                        {/* Additional skeleton items to fill space */}
                        <div className="space-y-3 opacity-60">
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/20">
                                <div className="w-10 h-10 rounded-full bg-slate-700/30" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-2 w-24 bg-slate-700/30 rounded" />
                                    <div className="h-1.5 w-16 bg-slate-700/20 rounded" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/20 border border-slate-700/20">
                                <div className="w-10 h-10 rounded-full bg-slate-700/30" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-2 w-20 bg-slate-700/30 rounded" />
                                    <div className="h-1.5 w-24 bg-slate-700/20 rounded" />
                                </div>
                            </div>
                        </div>
                      </div>

                      {/* App Bottom UI */}
                      <div className="mt-auto h-20 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex justify-around items-center px-6">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <Target size={18} className="text-indigo-400" />
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                          <Rocket size={18} className="text-slate-600" />
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center">
                          <Plus size={24} className="text-white" />
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                          <MessageCircle size={18} className="text-slate-600" />
                        </div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                          <Users size={18} className="text-slate-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-bold">
                      <Smartphone size={16} />
                      <span>iOS & Android</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Security Features Grid */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 transition-colors">
                <Shield size={32} className="text-emerald-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">אבטחת בנק</h3>
                <p className="text-slate-400 text-sm">הצפנת SSL/TLS מלאה, גיבויים שעתיים ושרתים מאובטחים בסטנדרט המחמיר ביותר.</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 transition-colors">
                <Fingerprint size={32} className="text-indigo-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">כניסה ביומטרית</h3>
                <p className="text-slate-400 text-sm">FaceID ו-TouchID מובנים באפליקציה. אין צורך לזכור סיסמאות מסובכות.</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:bg-slate-800 transition-colors">
                <Cloud size={32} className="text-sky-400 mb-4" />
                <h3 className="text-lg font-bold text-white mb-2">סנכרון מיידי</h3>
                <p className="text-slate-400 text-sm">התחילו במחשב, המשיכו בנייד. כל שינוי מתעדכן אצל כולם באותה שנייה.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Solution - Modules Section */}
        <section id="solution" className="py-12 sm:py-20 md:py-28 bg-white relative">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-8 sm:mb-14">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-black mb-3 sm:mb-4">
                <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" />
                הפתרון
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900">
                6 מודולים. מערכת אחת.
              </h2>
              <p className="mt-2 sm:mt-4 text-sm sm:text-base md:text-lg text-slate-600">
                בחרו רק את מה שאתם צריכים, או קבלו את הכל
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {[
                {
                  name: 'Operations',
                  title: 'ניהול קריאות',
                  desc: 'קריאות שירות, טכנאים, מעקב GPS, דיווחים מהשטח',
                  icon: ClipboardCheck,
                  gradient: 'from-emerald-500 to-teal-600',
                  href: '/operations'
                },
                {
                  name: 'System',
                  title: 'CRM מכירות',
                  desc: 'ניהול לידים, ליווי עסקאות, אוטומציות, דוחות',
                  icon: Target,
                  gradient: 'from-blue-500 to-indigo-600',
                  href: '/system'
                },
                {
                  name: 'Nexus',
                  title: 'ניהול פרויקטים',
                  desc: 'משימות, צוות, timeline, מעקב אחר התקדמות',
                  icon: Rocket,
                  gradient: 'from-purple-500 to-pink-600',
                  href: '/nexus'
                },
                {
                  name: 'Social',
                  title: 'ניהול תוכן',
                  desc: 'פוסטים, לוח שידורים, AI, קמפיינים ממומנים',
                  icon: Share2,
                  gradient: 'from-rose-500 to-orange-500',
                  href: '/pricing'
                },
                {
                  name: 'Client',
                  title: 'קליניקה דיגיטלית',
                  desc: 'ניהול לקוחות, פגישות, תוכניות, משוב',
                  icon: Users,
                  gradient: 'from-amber-500 to-yellow-500',
                  href: '/pricing'
                },
                {
                  name: 'Finance',
                  title: 'ניהול כספים',
                  desc: 'חשבוניות, הוצאות, דוחות, אינטגרציות',
                  icon: TrendingUp,
                  gradient: 'from-cyan-500 to-blue-500',
                  href: '/pricing'
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
                      {/* Icon */}
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform mb-3 sm:mb-4 md:mb-6`}>
                        <Icon size={18} className="sm:w-5 sm:h-5 md:w-6 md:h-6" />
                      </div>

                      {/* Content */}
                      <div className="mb-3 sm:mb-4">
                        <div className="text-[9px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 sm:mb-2">
                          {module.name}
                        </div>
                        <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight">
                          {module.title}
                        </h3>
                      </div>
                      
                      <p className="text-slate-600 leading-relaxed text-[11px] sm:text-xs md:text-sm">
                        {module.desc}
                      </p>

                      {/* Arrow */}
                      <div className="mt-3 sm:mt-4 md:mt-6 flex items-center gap-2 text-xs sm:text-sm font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
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

        <KillerFeaturesBox id="features" />

        {/* Pricing CTA Section */}
        <section id="pricing" className="py-14 sm:py-18 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-indigo-100/40 rounded-full blur-[100px]" />
          </div>
          <div className="max-w-6xl mx-auto px-6 py-10 sm:py-12 relative">
            <div className="relative rounded-[2rem] overflow-hidden border-2 border-slate-200 bg-white shadow-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30" />
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-100 rounded-full blur-3xl opacity-20" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-20" />
              <div className="relative p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="text-center lg:text-right">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-emerald-50 border border-indigo-100 text-slate-700 text-xs font-bold mb-4">
                    <Gift size={14} className="text-emerald-600" />
                    ניסיון חינם מלא — בלי כרטיס
                  </div>
                  <div className="text-3xl sm:text-4xl font-black text-slate-900">מוכנים להתחיל?</div>
                  <div className="mt-3 text-slate-600 text-lg font-medium">ניסיון חינם 14 יום - ללא כרטיס אשראי</div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href="/pricing"
                    className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-slate-900 to-slate-800 text-white font-black shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20"
                  >
                    התחילו עכשיו
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Value Props Section */}
        <section id="comparison" className="py-20 sm:py-28 bg-white relative">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-14">
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">למה MISRAD?</h2>
              <p className="mt-4 text-lg text-slate-600">תוצאות אמיתיות, לא רק features.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: Target, title: 'חוסכים 10 שעות שבועיות', desc: 'תפסיקו לבזבז זמן על טלפונים וחיפושים באקסלים.', gradient: 'from-cyan-500 to-blue-600' },
                { icon: Users, title: 'לקוחות מרוצים', desc: 'עדכונים אוטומטיים בווצאפ - הלקוח תמיד יודע מה קורה.', gradient: 'from-purple-500 to-indigo-600' },
                { icon: TrendingUp, title: 'יותר רווח', desc: 'לא מפספסים קריאות. כל עבודה מתועדת ומתומחרת.', gradient: 'from-amber-500 to-orange-600' },
              ].map((x) => (
                <div key={x.title} className="group rounded-3xl bg-white border border-slate-200 p-8 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${x.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                    <x.icon size={24} />
                  </div>
                  <div className="mt-6 text-xl font-black text-slate-900">{x.title}</div>
                  <div className="mt-3 text-slate-600 leading-relaxed">{x.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>


        <TestimonialsSection />

        <PartnersLogosSection />

        <SalesFaq variant="default" />
      </main>
      <Footer />
      
    </div>
  );
}
