
import React from 'react';
import { MeetingAnalysisResult } from '../../types';
import { ArrowLeft, UserCircle, Briefcase, Activity, Lightbulb, Zap, Send, Check, Clock, CalendarCheck, BrainCircuit, ShieldAlert, AlertTriangle, MessageSquare, Quote, CheckSquare } from 'lucide-react';
import { AudioPlayer } from '../ui/AudioPlayer';

interface MeetingResultDashboardProps {
  analysisResult?: MeetingAnalysisResult;
  fileName: string;
  onBack: () => void;
  activeAutomations: string[];
  onToggleAutomation: (id: string) => void;
}

export const MeetingResultDashboard: React.FC<MeetingResultDashboardProps> = ({ 
  analysisResult, 
  fileName, 
  onBack, 
  activeAutomations, 
  onToggleAutomation 
}) => {
  
  const getRiskColor = (level: string) => {
    switch(level) {
      case 'HIGH': return 'text-signal-danger border-signal-danger/30 bg-signal-danger/10';
      case 'MEDIUM': return 'text-signal-warning border-signal-warning/30 bg-signal-warning/10';
      default: return 'text-gray-400';
    }
  };

  return (
      <div className="animate-slide-up space-y-6 pb-20">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <button 
                 onClick={onBack} 
                 className="flex items-center gap-2 text-gray-500 hover:text-nexus-primary transition-colors w-fit"
              >
                  <ArrowLeft size={18} /> חזרה לרשימה
              </button>
              <div className="flex gap-2 w-full md:w-auto">
                  <button className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 whitespace-nowrap">ייצא PDF</button>
                  <button className="flex-1 md:flex-none px-4 py-3 md:py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent whitespace-nowrap">שתף סיכום</button>
              </div>
          </div>

          {/* 1. Executive Summary & Pulse */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-card p-4 md:p-6 rounded-2xl border-l-4 border-l-nexus-primary relative overflow-hidden flex flex-col gap-6">
                  
                  {/* Audio Player */}
                  <AudioPlayer />

                  <div>
                      <div className="flex justify-between items-start mb-4 gap-2">
                          <div className="min-w-0">
                              <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-1 truncate">{fileName || 'ישיבת סטטוס רבעונית + השקה'}</h2>
                              <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1"><UserCircle size={12}/> אלכס, אלינה, דוד</span>
                                  <span className="hidden md:inline">•</span>
                                  <span>שעתיים ו-15 דקות</span>
                                  <span className="hidden md:inline">•</span>
                                  <span className="text-nexus-accent font-bold">נותח ע"י Nexus AI</span>
                              </div>
                          </div>
                          <div className={`text-lg md:text-xl font-bold px-3 py-2 rounded-xl border whitespace-nowrap ${analysisResult?.sentimentScore && analysisResult.sentimentScore > 70 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)] border-[color:var(--os-accent)]/30'}`}>
                              {analysisResult?.sentimentScore}/100
                          </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
                          {analysisResult?.summary}
                      </p>
                  </div>
              </div>

              {/* Rating Cards */}
              <div className="grid grid-cols-1 gap-4">
                  <div className="glass-card p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Briefcase size={18}/></div>
                          <span className="font-bold text-gray-700">מקצועיות</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-16 md:w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="bg-blue-600 h-full" style={{width: `${analysisResult?.rating?.professionalism}%`}}></div></div>
                          <span className="font-mono font-bold">{analysisResult?.rating?.professionalism}</span>
                      </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><Activity size={18}/></div>
                          <span className="font-bold text-gray-700">חמימות</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-16 md:w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="bg-pink-600 h-full" style={{width: `${analysisResult?.rating?.warmth}%`}}></div></div>
                          <span className="font-mono font-bold">{analysisResult?.rating?.warmth}</span>
                      </div>
                  </div>
                  <div className="glass-card p-4 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)] rounded-lg"><Lightbulb size={18}/></div>
                          <span className="font-bold text-gray-700">בהירות</span>
                      </div>
                      <div className="flex items-center gap-2">
                          <div className="w-16 md:w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className="bg-[color:var(--os-accent)] h-full" style={{width: `${analysisResult?.rating?.clarity}%`}}></div></div>
                          <span className="font-mono font-bold">{analysisResult?.rating?.clarity}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* AUTO-PILOT SECTION */}
          <div className="bg-gradient-to-r from-nexus-primary to-slate-900 rounded-2xl p-6 text-white shadow-luxury relative overflow-hidden">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
               <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-6">
                       <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm shadow-glow-gold text-nexus-accent">
                           <Zap size={24} fill="currentColor" />
                       </div>
                       <div>
                           <h3 className="text-xl font-bold">Nexus Auto-Pilot</h3>
                           <p className="text-white/60 text-sm">הפעל אוטומציות חכמות על בסיס השיחה הזו</p>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                       {/* Automation 1: Send Summary */}
                       <button 
                           onClick={() => onToggleAutomation('SUMMARY')}
                           className={`p-4 rounded-xl border transition-all text-right flex flex-col gap-3 group relative overflow-hidden active:scale-[0.98] ${activeAutomations.includes('SUMMARY') ? 'bg-white text-nexus-primary border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                       >
                           <div className="flex justify-between items-start w-full">
                               <Send size={20} className={activeAutomations.includes('SUMMARY') ? 'text-nexus-primary' : 'text-white/70'} />
                               {activeAutomations.includes('SUMMARY') && <Check size={16} className="text-green-500" />}
                           </div>
                           <div>
                               <h4 className="font-bold text-sm">שלח סיכום ללקוח</h4>
                               <p className={`text-xs mt-1 ${activeAutomations.includes('SUMMARY') ? 'text-gray-500' : 'text-white/50'}`}>מייל מעוצב עם כל ההחלטות והמשימות מהשיחה.</p>
                           </div>
                       </button>

                       {/* Automation 2: Task Chaser */}
                       <button 
                           onClick={() => onToggleAutomation('TASKS')}
                           className={`p-4 rounded-xl border transition-all text-right flex flex-col gap-3 group relative overflow-hidden active:scale-[0.98] ${activeAutomations.includes('TASKS') ? 'bg-white text-nexus-primary border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                       >
                            <div className="flex justify-between items-start w-full">
                               <Clock size={20} className={activeAutomations.includes('TASKS') ? 'text-nexus-primary' : 'text-white/70'} />
                               {activeAutomations.includes('TASKS') && <Check size={16} className="text-green-500" />}
                           </div>
                           <div>
                               <h4 className="font-bold text-sm">רדוף אחרי משימות</h4>
                               <p className={`text-xs mt-1 ${activeAutomations.includes('TASKS') ? 'text-gray-500' : 'text-white/50'}`}>תזכורת אוטומטית ללקוח בעוד 3 ימים אם המשימות לא סומנו כבוצעו.</p>
                           </div>
                       </button>

                       {/* Automation 3: Next Meeting */}
                       <button 
                           onClick={() => onToggleAutomation('MEETING')}
                           className={`p-4 rounded-xl border transition-all text-right flex flex-col gap-3 group relative overflow-hidden active:scale-[0.98] ${activeAutomations.includes('MEETING') ? 'bg-white text-nexus-primary border-white' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                       >
                            <div className="flex justify-between items-start w-full">
                               <CalendarCheck size={20} className={activeAutomations.includes('MEETING') ? 'text-nexus-primary' : 'text-white/70'} />
                               {activeAutomations.includes('MEETING') && <Check size={16} className="text-green-500" />}
                           </div>
                           <div>
                               <h4 className="font-bold text-sm">קבע פגישת המשך</h4>
                               <p className={`text-xs mt-1 ${activeAutomations.includes('MEETING') ? 'text-gray-500' : 'text-white/50'}`}>שלח זימון אוטומטי לעוד שבועיים באותה שעה.</p>
                           </div>
                       </button>
                   </div>
               </div>
          </div>

          {/* 2. Intent Decoder & Liability Shield */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Intent Decoder */}
              <div className="glass-card p-6 rounded-2xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><BrainCircuit size={20}/></div>
                      <div>
                          <h3 className="font-bold text-gray-900">פענוח כוונות נסתרות</h3>
                          <p className="text-xs text-gray-500">מה הם אמרו vs. למה הם התכוונו</p>
                      </div>
                  </div>
                  <div className="space-y-3">
                      {analysisResult?.intents?.map((intent, i) => (
                          <div key={i} className="flex gap-3 items-start p-3 bg-white/60 rounded-xl border border-purple-100/50">
                              <div className="mt-1 text-purple-400"><Zap size={14} fill="currentColor" /></div>
                              <p className="text-sm text-gray-700 italic font-medium">"{intent}"</p>
                          </div>
                      ))}
                  </div>
              </div>

              {/* Liability Shield */}
              <div className="glass-card p-6 rounded-2xl border border-red-100 bg-gradient-to-br from-white to-red-50/30">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-red-100 text-red-600 rounded-xl"><ShieldAlert size={20}/></div>
                      <div>
                          <h3 className="font-bold text-gray-900">מגן התחייבויות (Liability Shield)</h3>
                          <p className="text-xs text-gray-500">הבטחות שנתתם ועלולות לסבך אתכם</p>
                      </div>
                  </div>
                  <div className="space-y-3">
                      {analysisResult?.liabilityRisks.map((risk, i) => (
                          <div key={i} className={`p-4 rounded-xl border ${getRiskColor(risk.riskLevel)}`}>
                             <div className="flex justify-between items-center mb-1">
                                <span className="text-xs font-bold opacity-70 uppercase tracking-wider">ציטוט מהשיחה</span>
                                <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded font-bold">{risk.riskLevel}</span>
                             </div>
                             <p className="font-serif italic font-medium mb-2 opacity-90">"{risk.quote}"</p>
                             <div className="text-xs opacity-70 border-t border-gray-200/60 pt-2 flex items-start gap-1">
                                <AlertTriangle size={12} className="mt-0.5" />
                                {risk.context}
                             </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>

          {/* 3. Cultural & Slang */}
          <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-nexus-accent/10 text-nexus-accent rounded-xl"><MessageSquare size={20}/></div>
                  <h3 className="font-bold text-gray-900">סלנג וסיפורים</h3>
              </div>
              <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[300px]">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">מילים שחזרו על עצמן</h4>
                      <div className="flex flex-wrap gap-2">
                          {analysisResult?.slang?.map((word, i) => (
                              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm border border-gray-200">
                                  {word}
                              </span>
                          ))}
                      </div>
                  </div>
                  <div className="flex-1 min-w-[300px]">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">סיפורים ואנקדוטות</h4>
                      <div className="space-y-2">
                          {analysisResult?.stories?.map((story, i) => (
                              <div key={i} className="flex gap-2 items-start text-sm text-gray-700 bg-nexus-bg p-2 rounded-lg">
                                  <Quote size={14} className="text-nexus-accent mt-1 flex-shrink-0" />
                                  {story}
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>

          {/* 4. Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Briefcase size={18} className="text-nexus-primary"/> משימות שלנו (Agency)
                  </h3>
                  <div className="space-y-3">
                      {analysisResult?.agencyTasks.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                              <div className={`mt-1.5 w-2 h-2 rounded-full ${t.priority === 'HIGH' ? 'bg-red-500 shadow-glow' : 'bg-gray-400'}`}></div>
                              <div>
                                  <p className={`text-sm font-bold text-gray-800 ${t.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>{t.task}</p>
                                  <span className="text-xs text-gray-500">לביצוע עד: {t.deadline}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="glass-card p-6 rounded-2xl border border-nexus-accent/20">
                  <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <UserCircle size={18} className="text-nexus-accent"/> משימות שלהם (Client)
                  </h3>
                  <div className="space-y-3">
                      {analysisResult?.clientTasks.map((t, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm">
                              <div className="p-1 bg-green-100 rounded text-green-600 mt-0.5"><CheckSquare size={12}/></div>
                              <div>
                                  <p className={`text-sm font-bold text-gray-800 ${t.status === 'COMPLETED' ? 'line-through text-gray-400' : ''}`}>{t.task}</p>
                                  <span className="text-xs text-gray-500">מחכים להם: {t.deadline}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      </div>
  );
};
