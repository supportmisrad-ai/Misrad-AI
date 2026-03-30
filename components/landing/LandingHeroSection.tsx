'use client';

import { ClipboardCheck, Sparkles, Zap, Shield, Users, Target, Rocket, Share2, TrendingUp } from 'lucide-react';
import { CTAButtons } from '@/components/landing/CTAButtons';

export function LandingHeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50/50 to-white">
      {/* Background Effects — GPU-accelerated, reduced blur for scroll perf */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute -top-24 -right-24 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/40 via-rose-200/30 to-transparent rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute -bottom-32 -left-24 w-[700px] h-[700px] bg-gradient-to-tr from-indigo-200/30 via-purple-200/20 to-transparent rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-emerald-100/20 to-cyan-100/20 rounded-full blur-3xl will-change-transform" style={{ transform: 'translateZ(0)' }} />
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
                <span className="text-[10px] sm:text-xs md:text-sm font-bold text-indigo-700 leading-none">מנהלת את הארגון ומנהלת את השיחות — גם פנימה, גם החוצה</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-[1.1] tracking-tight text-center lg:text-right">
              <span className="text-slate-900">העסק עובד בשבילך,</span>
              <span className="block mt-2 text-slate-900">גם כשאתה לא שם.</span>
              <span className="block mt-3 text-transparent bg-clip-text bg-gradient-to-r from-indigo-700 via-purple-700 to-rose-700 drop-shadow-sm">
                ה-AI מנהל את הארגון ומדבר עם העולם.
              </span>
            </h1>

            <p className="mt-5 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 max-w-xl leading-relaxed text-center lg:text-right mx-auto lg:mx-0">
              המערכת מנהלת את העסק ומנהלת את השיחות — לקוח כותב בוואטסאפ, הבוט עונה ופותח ליד.
              <span className="font-semibold text-slate-700"> — זה לא רק CRM. זה עובד בשבילך.</span>
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


            {/* Trust Strip */}
            <div className="mt-6 sm:mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2 sm:gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] sm:text-xs font-bold text-emerald-700">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                הצפנת AES-256
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[10px] sm:text-xs font-bold text-blue-700">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                GDPR
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-[10px] sm:text-xs font-bold text-purple-700">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                7 ימי ניסיון חינם
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[10px] sm:text-xs font-bold text-amber-700">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                ייצוא נתונים מלא
              </span>
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
                  <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-[9px] font-bold text-amber-700">תצוגת דוגמה</span>
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

                {/* Ping WhatsApp Preview - The Living Proof */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.292-1.223-1.206-1.39-1.372-.362-.36-.874-.982-1.35-1.314-.583-.414-.702-.453-.933-.453-.254 0-.517.122-.721.367-.203.244-.89 1.047-.89 1.047s-.248.303-.15.598c.074.224.396.595.689.918.506.556.982 1.01 1.03 1.06.085.09.107.215-.026.355-.13.137-.361.423-.514.596-.182.204-.367.344-.576.447-.22.108-.452.147-.671.147-.225 0-.462-.04-.703-.118-.57-.19-1.098-.546-1.398-.778-.388-.298-.947-.837-1.413-1.415-.354-.436-.664-.923-.866-1.384-.222-.5-.323-1.02-.323-1.423 0-.485.123-.926.36-1.308.258-.414.617-.706.986-.849.355-.137.71-.179 1.044-.129.28.041.53.135.727.245l.025.013c.184.111.373.271.553.429.136.117.265.244.394.371.03.03.06.058.09.086.1.097.202.192.301.294.225.233.388.42.493.56l.052.074c.048.069.09.13.125.183l-.006-.006c.036.053.07.104.098.15.082.136.123.236.14.31l.006.026c.02.097.003.204-.053.308l-.01.017c-.063.117-.152.226-.266.328-.125.113-.26.215-.374.289-.097.064-.196.121-.283.162l-.033.016c-.122.058-.262.115-.398.162-.164.055-.326.093-.466.093-.11 0-.222-.023-.332-.069-.123-.051-.239-.13-.337-.239-.11-.123-.197-.275-.253-.437-.057-.166-.082-.345-.073-.52.018-.354.145-.705.37-1.02.234-.327.563-.596.94-.76.398-.174.84-.227 1.264-.15.427.078.81.284 1.087.586.293.319.47.723.503 1.14.034.424-.078.852-.314 1.212-.24.367-.586.652-.99.81-.414.163-.87.186-1.287.065-.422-.123-.79-.387-1.03-.737-.25-.365-.358-.816-.298-1.25.06-.433.307-.834.67-1.09.366-.26.83-.36 1.27-.278.44.083.83.34 1.07.703.248.374.336.838.245 1.26-.091.422-.352.796-.713 1.02-.366.23-.814.292-1.222.173-.413-.12-.764-.423-.96-.824-.202-.413-.233-.898-.085-1.337.15-.438.464-.813.863-1.026.404-.217.89-.256 1.33-.111.444.146.813.468 1.01.88.203.424.218.916.04 1.353-.18.442-.523.804-.95.994-.432.193-.933.182-1.355-.03-.428-.215-.77-.598-.93-1.05-.165-.463-.132-.984.09-1.423.222-.437.602-.784 1.052-.96.455-.18.967-.172 1.415.022.454.198.823.552 1.02 1.007.19.446.187.962-.007 1.406-.196.45-.552.82-1.004 1.027-.454.21-.968.193-1.406-.02-.444-.217-.803-.612-.98-1.09z M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                      </svg>
                    </div>
                    <div>
                      <div className="text-[10px] sm:text-xs font-black text-slate-900">שיחת וואטסאפ חיה</div>
                      <div className="text-[9px] font-bold text-emerald-600">הבוט עונה אוטומטית</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-[10px] sm:text-xs">
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-slate-600">לקוח</div>
                      <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-slate-100 max-w-[85%]">
                        <span className="text-slate-700">שמעתי עליכם, מתעניין בשירות</span>
                        <span className="block text-[8px] text-slate-400 mt-1">09:15</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-row-reverse">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 flex-shrink-0 flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      </div>
                      <div className="bg-emerald-100 rounded-lg rounded-tr-none px-3 py-2 shadow-sm max-w-[85%]">
                        <span className="text-slate-700">היי! אשמח לעזור. באיזה תחום העסק שלך?</span>
                        <span className="block text-[8px] text-emerald-600 mt-1">09:15 ✓✓</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-slate-600">לקוח</div>
                      <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 shadow-sm border border-slate-100 max-w-[85%]">
                        <span className="text-slate-700">מכון כושר בתל אביב</span>
                        <span className="block text-[8px] text-slate-400 mt-1">09:18</span>
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center">
                      <span className="text-amber-700 font-bold">→ פתח ליד חם ב-Nexus</span>
                    </div>
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
