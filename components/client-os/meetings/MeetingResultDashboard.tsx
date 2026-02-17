'use client';

import React from 'react';
import type { AILiabilityRisk, AITask, MeetingAnalysisResult } from '../../client-os-full/types';
import { ArrowLeft, CircleUser, Briefcase, SquareActivity, Lightbulb, Zap, Send, Check, Clock, CalendarCheck, ShieldAlert, TriangleAlert, MessageSquare, Quote, SquareCheck, FileText, Share2 } from 'lucide-react';
import { AudioPlayer } from '../ui/AudioPlayer';
import { motion } from 'framer-motion';

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
      case 'HIGH': return 'text-signal-danger border-signal-danger/30 bg-signal-danger/10 shadow-[0_0_15px_rgba(220,38,38,0.1)]';
      case 'MEDIUM': return 'text-signal-warning border-signal-warning/30 bg-signal-warning/10';
      default: return 'text-gray-400';
    }
  };

  return (
      <div className="space-y-12 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Top Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <button 
                 onClick={onBack} 
                 className="flex items-center gap-3 text-slate-400 hover:text-primary transition-all group w-fit font-bold"
              >
                  <div className="p-2 rounded-xl bg-white border border-slate-100 group-hover:border-primary/20 group-hover:shadow-sm">
                    <ArrowLeft size={20} />
                  </div>
                  <span>חזרה לרשימת הפגישות</span>
              </button>
              <div className="flex gap-4 w-full md:w-auto">
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:shadow-md transition-all active:scale-[0.98]">
                      <FileText size={18} />
                      ייצא דוח PDF
                  </button>
                  <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-nexus-gradient text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:shadow-xl transition-all active:scale-[0.98]">
                      <Share2 size={18} />
                      שתף תובנות
                  </button>
              </div>
          </div>

          {/* 1. Executive Summary & Pulse */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 ui-card p-8 bg-white border-r-4 border-r-primary relative overflow-hidden flex flex-col gap-8 shadow-luxury">
                  
                  {/* Audio Player Component */}
                  <AudioPlayer />

                  <div className="space-y-6">
                      <div className="flex justify-between items-start gap-6">
                          <div className="space-y-2">
                              <h2 className="text-3xl font-black text-slate-900 tracking-tight">{fileName || 'ניתוח פגישה'}</h2>
                              <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg"><CircleUser size={14} className="text-slate-300"/> Multi-Participant</span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                  <span className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-lg"><Clock size={14} className="text-slate-300"/> 45:00 min</span>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                  <span className="text-primary">Processed by Nexus AI</span>
                              </div>
                          </div>
                          <div className={`text-2xl font-black px-6 py-3 rounded-2xl border-2 shadow-inner ${analysisResult?.sentimentScore && analysisResult.sentimentScore > 70 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)] border-[color:var(--os-accent)]/30'}`}>
                              {analysisResult?.sentimentScore ?? 85}
                              <span className="text-xs opacity-50 ml-1">/100</span>
                          </div>
                      </div>
                      
                      <div className="relative">
                        <div className="absolute top-0 left-0 p-4 opacity-5">
                            <Quote size={80} />
                        </div>
                        <p className="text-slate-700 leading-relaxed text-lg font-medium bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 relative z-10 italic">
                            "{analysisResult?.summary || 'ניתוח הפגישה מתאר את הנקודות המרכזיות שעלו בשיחה, כולל החלטות שהתקבלו ומשימות להמשך.'}"
                        </p>
                      </div>
                  </div>
              </div>

              {/* IQ Metrics */}
              <div className="space-y-6">
                  <div className="ui-card p-6 bg-white flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Briefcase size={22}/></div>
                          <span className="font-black text-slate-900 uppercase text-xs tracking-widest">מקצועיות</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width: `${analysisResult?.rating?.professionalism ?? 90}%`}} className="bg-blue-600 h-full" /></div>
                          <span className="font-mono font-black text-slate-900">{analysisResult?.rating?.professionalism ?? 90}</span>
                      </div>
                  </div>
                  <div className="ui-card p-6 bg-white flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><SquareActivity size={22}/></div>
                          <span className="font-black text-slate-900 uppercase text-xs tracking-widest">חמימות</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width: `${analysisResult?.rating?.warmth ?? 85}%`}} className="bg-pink-600 h-full" /></div>
                          <span className="font-mono font-black text-slate-900">{analysisResult?.rating?.warmth ?? 85}</span>
                      </div>
                  </div>
                  <div className="ui-card p-6 bg-white flex items-center justify-between group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[color:var(--os-accent)]/10 text-[color:var(--os-accent)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Lightbulb size={22}/></div>
                          <span className="font-black text-slate-900 uppercase text-xs tracking-widest">בהירות</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width: `${analysisResult?.rating?.clarity ?? 95}%`}} className="bg-[color:var(--os-accent)] h-full" /></div>
                          <span className="font-mono font-black text-slate-900">{analysisResult?.rating?.clarity ?? 95}</span>
                      </div>
                  </div>
              </div>
          </div>

          {/* AUTO-PILOT SECTION */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-luxury relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 group-hover:bg-primary/20 transition-colors duration-700"></div>
               <div className="relative z-10">
                   <div className="flex items-center gap-5 mb-10">
                       <div className="w-16 h-16 bg-white/10 rounded-[1.5rem] backdrop-blur-md shadow-2xl flex items-center justify-center text-primary border border-white/10 group-hover:rotate-6 transition-all">
                           <Zap size={32} fill="currentColor" />
                       </div>
                       <div>
                           <h3 className="text-3xl font-black tracking-tight">Nexus Auto-Pilot</h3>
                           <p className="text-slate-400 text-lg font-medium">הפעל תהליכי המשך אוטומטיים בלחיצה אחת</p>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       {[ 
                           { id: 'SUMMARY', icon: Send, label: 'שלח סיכום מעוצב', desc: 'מייל ממותג ללקוח עם עיקרי הדברים' },
                           { id: 'TASKS', icon: Clock, label: 'מעקב משימות (Chaser)', desc: 'תזכורות אוטומטיות לביצוע מטלות' },
                           { id: 'MEETING', icon: CalendarCheck, label: 'זימון פגישת המשך', desc: 'קביעת מועד חדש בלו\"ז מול הלקוח' }
                       ].map((auto) => (
                           <button 
                               key={auto.id}
                               onClick={() => onToggleAutomation(auto.id)}
                               className={`p-8 rounded-[2.5rem] border-2 transition-all text-right flex flex-col gap-4 group relative overflow-hidden active:scale-[0.98] ${activeAutomations.includes(auto.id) ? 'bg-white text-slate-900 border-white shadow-2xl' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'}`}
                           >
                               <div className="flex justify-between items-center">
                                   <auto.icon size={28} className={activeAutomations.includes(auto.id) ? 'text-primary' : 'text-slate-400'} />
                                   {activeAutomations.includes(auto.id) && (
                                       <motion.div initial={{scale:0}} animate={{scale:1}} className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                                           <Check size={14} strokeWidth={4} />
                                       </motion.div>
                                   )}
                               </div>
                               <div>
                                   <h4 className="font-black text-xl leading-tight">{auto.label}</h4>
                                   <p className={`text-sm font-medium mt-1 leading-relaxed ${activeAutomations.includes(auto.id) ? 'text-slate-500' : 'text-slate-500'}`}>{auto.desc}</p>
                               </div>
                           </button>
                       ))}
                   </div>
               </div>
          </div>

          {/* 2. Deep Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Intent Decoder */}
              <div className="ui-card p-8 bg-white border border-slate-100 bg-gradient-to-br from-white to-slate-50/50">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Zap size={24}/></div>
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 leading-none">פענוח כוונות (Deep IQ)</h3>
                          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Hidden Intentions</p>
                      </div>
                  </div>
                  <div className="space-y-4">
                      {analysisResult?.intents?.length ? analysisResult.intents.map((intent: string, i: number) => (
                          <div key={i} className="flex gap-4 items-start p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-indigo-200 transition-colors">
                              <div className="mt-1 text-indigo-400"><Zap size={16} fill="currentColor" /></div>
                              <p className="text-slate-700 text-lg font-medium italic leading-relaxed">"{intent}"</p>
                          </div>
                      )) : <p className="text-slate-400 italic py-4">לא זוהו כוונות נסתרות משמעותיות.</p>}
                  </div>
              </div>

              {/* Liability Shield */}
              <div className="ui-card p-8 bg-white border border-red-50 bg-gradient-to-br from-white to-red-50/20">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center"><ShieldAlert size={24}/></div>
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 leading-none">מגן התחייבויות</h3>
                          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest mt-1">Liability Shield</p>
                      </div>
                  </div>
                  <div className="space-y-4">
                      {analysisResult?.liabilityRisks.length ? analysisResult.liabilityRisks.map((risk: AILiabilityRisk, i: number) => (
                          <div key={i} className={`p-6 rounded-2xl border-2 ${getRiskColor(risk.riskLevel)}`}>
                             <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Critical Quote</span>
                                <span className="px-2 py-1 bg-white/50 rounded-lg text-[10px] font-black tracking-widest">{risk.riskLevel} RISK</span>
                             </div>
                             <p className="text-xl font-serif italic font-bold mb-4 leading-tight">"{risk.quote}"</p>
                             <div className="text-sm font-bold opacity-70 border-t border-current/10 pt-4 flex items-start gap-2">
                                <TriangleAlert size={16} className="shrink-0 mt-0.5" />
                                <span>{risk.context}</span>
                             </div>
                          </div>
                      )) : <p className="text-slate-400 italic py-4">השיחה נקייה מהתחייבויות חריגות.</p>}
                  </div>
              </div>
          </div>

          {/* 3. Action Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="ui-card p-8 bg-white border border-slate-100">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <Briefcase size={24} className="text-primary"/> משימות צוות (Agency)
                    </h3>
                    <span className="text-xs bg-slate-50 text-slate-400 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Internal</span>
                  </div>
                  <div className="space-y-4">
                      {analysisResult?.agencyTasks.length ? analysisResult.agencyTasks.map((t: AITask, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-lg transition-all duration-300">
                              <div className={`w-3 h-3 rounded-full ${t.priority === 'HIGH' ? 'bg-primary shadow-[0_0_12px_rgba(162,29,60,0.5)]' : 'bg-slate-300'}`}></div>
                              <div className="flex-1">
                                  <p className={`text-lg font-bold text-slate-800 ${t.status === 'COMPLETED' ? 'line-through opacity-40' : ''}`}>{t.task}</p>
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Deadline: {t.deadline}</p>
                              </div>
                              <div className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:text-primary">
                                <Check size={20} />
                              </div>
                          </div>
                      )) : <p className="text-slate-400 italic">אין משימות פתוחות לצוות.</p>}
                  </div>
              </div>
              
              <div className="ui-card p-8 bg-white border border-emerald-50">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                        <CircleUser size={24} className="text-emerald-500"/> משימות לקוח (Client)
                    </h3>
                    <span className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Waiting for</span>
                  </div>
                  <div className="space-y-4">
                      {analysisResult?.clientTasks.length ? analysisResult.clientTasks.map((t: AITask, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 group hover:bg-white hover:shadow-lg transition-all duration-300 shadow-inner">
                              <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20"><SquareCheck size={16} strokeWidth={3}/></div>
                              <div className="flex-1">
                                  <p className={`text-lg font-bold text-slate-800 ${t.status === 'COMPLETED' ? 'line-through opacity-40' : ''}`}>{t.task}</p>
                                  <p className="text-xs font-black text-emerald-600/60 uppercase tracking-widest mt-1">Pending since: {t.deadline}</p>
                              </div>
                          </div>
                      )) : <p className="text-slate-400 italic">הלקוח סיים את כל המשימות שלו.</p>}
                  </div>
              </div>
          </div>

          {/* 4. Cultural & Slang */}
          <div className="ui-card p-8 bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-white text-primary rounded-2xl shadow-sm border border-slate-100"><MessageSquare size={24}/></div>
                  <h3 className="text-2xl font-black text-slate-900">סלנג וסיפורים שעלו בשיחה</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Keywords Cloud</h4>
                      <div className="flex flex-wrap gap-3">
                          {analysisResult?.slang?.map((word: string, i: number) => (
                              <span key={i} className="px-5 py-2 bg-white text-slate-700 rounded-2xl text-sm font-bold border border-slate-200 shadow-sm hover:border-primary/20 transition-colors">
                                  #{word}
                              </span>
                          ))}
                      </div>
                  </div>
                  <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Meeting Anecdotes</h4>
                      <div className="space-y-3">
                          {analysisResult?.stories?.map((story: string, i: number) => (
                              <div key={i} className="flex gap-4 items-start text-lg font-medium text-slate-600 bg-white/60 p-5 rounded-3xl border border-white/40 shadow-sm italic leading-relaxed">
                                  <Quote size={20} className="text-primary mt-1 flex-shrink-0 opacity-20" />
                                  "{story}"
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );
};
