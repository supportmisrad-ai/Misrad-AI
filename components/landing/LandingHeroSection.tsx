import { ClipboardCheck, Sparkles, Zap, Shield, Users, Target, Rocket, Share2, TrendingUp } from 'lucide-react';
import { CTAButtons } from '@/components/landing/CTAButtons';

export function LandingHeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Background Effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/40 via-rose-200/30 to-transparent rounded-full blur-[120px]" />
        <div className="absolute -bottom-32 -left-24 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-200/30 via-purple-200/20 to-transparent rounded-full blur-[100px]" />
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
  );
}
