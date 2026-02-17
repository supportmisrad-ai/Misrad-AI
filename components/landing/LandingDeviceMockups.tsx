import { Shield, Target, Rocket, Users, TrendingUp, MessageCircle, Monitor, Smartphone, Plus, Cloud, Scan } from 'lucide-react';

export function LandingDeviceMockups() {
  return (
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

                  {/* Subtle static content */}
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

                    {/* Additional skeleton items */}
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
            <Scan size={32} className="text-indigo-400 mb-4" />
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
  );
}
