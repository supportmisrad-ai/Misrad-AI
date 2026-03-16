import React, { useState } from 'react';
import { ServicePlan, Meeting, MeetingTemplate } from '../../../types';
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  ChevronRight, 
  Calendar, 
  FileText, 
  Brain,
  Zap,
  Layout,
  Flag,
  Target,
  ArrowRight,
  Video
} from 'lucide-react';
import { QuickRecord } from './QuickRecord';

interface ServiceTimelineProps {
  plans: ServicePlan[];
  onSelectMeeting: (meetingId: string) => void;
}

export const ServiceTimeline: React.FC<ServiceTimelineProps> = ({ plans, onSelectMeeting }) => {
  if (!plans.length) {
    return (
      <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
        <div className="bg-gray-50 p-4 rounded-full mb-4">
          <Layout size={32} className="text-gray-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">אין תוכנית ליווי פעילה</h3>
        <p className="text-gray-500 max-w-xs">הגדר תוכנית ליווי כדי להתחיל לעקוב אחר ההתקדמות בצורה מסודרת</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in pb-10">
      {plans.map((plan) => (
        <div key={plan.id} className="relative">
          {/* Roadmap Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-nexus-primary/10 rounded-lg text-nexus-primary">
                  <Target size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{plan.title}</h2>
              </div>
              <p className="text-gray-500 text-sm font-medium pr-1">{plan.description}</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm flex items-center gap-6">
              <div className="text-center border-l border-gray-50 pl-6">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">התקדמות</div>
                <div className="text-lg font-black text-nexus-primary">
                  {Math.round((plan.phases.filter((p: { status: string }) => p.status === 'COMPLETED').length / plan.phases.length) * 100)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">סטטוס</div>
                <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                   <span className="text-sm font-bold text-gray-700">פעיל</span>
                </div>
              </div>
            </div>
          </div>

          {/* Roadmap Track */}
          <div className="relative">
            {/* The Connecting Line */}
            <div className="absolute top-0 bottom-0 right-[2.25rem] w-1 bg-gradient-to-b from-nexus-primary/20 via-nexus-primary/10 to-transparent hidden md:block rounded-full" />
            
            <div className="space-y-16">
              {plan.phases.map((phase: { id: string; status: string; title: string; description?: string; meetings: Meeting[]; templates: MeetingTemplate[] }, phaseIdx: number) => {
                const isActive = phase.status === 'ACTIVE' || (phase.status === 'PENDING' && (phaseIdx === 0 || plan.phases[phaseIdx-1]?.status === 'COMPLETED'));
                
                return (
                  <div key={phase.id} className={`relative transition-all duration-500 ${!isActive && phase.status !== 'COMPLETED' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    {/* Phase Marker & Title */}
                    <div className="flex items-start gap-6 mb-8 relative z-10">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 shrink-0 ${
                        phase.status === 'COMPLETED' ? 'bg-green-500 text-white rotate-0' : 
                        isActive ? 'bg-nexus-primary text-white ring-8 ring-nexus-primary/10 scale-110' : 
                        'bg-white border-2 border-gray-100 text-gray-300'
                      }`}>
                        {phase.status === 'COMPLETED' ? <CheckCircle2 size={24} /> : <Flag size={20} className={isActive ? 'animate-bounce-short' : ''} />}
                      </div>
                      
                      <div className="pt-1">
                        <div className="flex items-center gap-3">
                          <h3 className={`font-black text-xl tracking-tight ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                            {phase.title}
                          </h3>
                          {isActive && (
                            <span className="px-2 py-0.5 rounded-md bg-nexus-primary/10 text-nexus-primary text-[10px] font-bold animate-pulse">
                              השלב הנוכחי
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 font-medium mt-1">{phase.description || `שלב ${phaseIdx + 1} בתהליך הליווי המקצועי`}</p>
                      </div>
                    </div>

                    {/* Phase Content (Meetings & Quick Actions) */}
                    <div className="md:mr-16 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Meetings List */}
                      <div className="lg:col-span-8 space-y-3">
                        {phase.meetings.map((meeting: Meeting) => (
                          <div 
                            key={meeting.id}
                            onClick={() => onSelectMeeting(meeting.id)}
                            className="group bg-white border border-gray-100 rounded-2xl p-5 hover:border-nexus-primary hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex justify-between items-center shadow-sm"
                          >
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-nexus-primary group-hover:text-white transition-all duration-300">
                                <Video size={20} />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 group-hover:text-nexus-primary transition-colors text-lg">{meeting.title}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                                    <Calendar size={12} /> {meeting.date}
                                  </div>
                                  {meeting.aiAnalysis && (
                                    <div className="flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-md border border-green-100 uppercase tracking-tighter">
                                      <Zap size={10} fill="currentColor" /> מנותח AI
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                               <div className="text-[10px] font-bold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">צפה בסיכום</div>
                               <ChevronRight size={20} className="text-gray-200 group-hover:text-nexus-primary group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        ))}

                        {/* Templates (Next Steps) */}
                        {phase.templates
                          .filter((t: { id: string }) => !phase.meetings.some((m: Meeting) => m.templateId === t.id))
                          .map((template: MeetingTemplate) => (
                          <div 
                            key={template.id}
                            className={`rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all border-2 border-dashed ${
                              isActive ? 'bg-nexus-primary/5 border-nexus-primary/20 ring-1 ring-nexus-primary/5' : 'bg-gray-50/50 border-gray-100 opacity-50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center ${isActive ? 'bg-white border-nexus-primary/30 text-nexus-primary' : 'bg-gray-50 border-gray-200 text-gray-300'}`}>
                                <FileText size={20} />
                              </div>
                              <div>
                                <div className={`font-black text-lg ${isActive ? 'text-nexus-primary' : 'text-gray-400'}`}>
                                  {template.title} <span className="text-xs font-bold opacity-60">(מתוכנן)</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                    <Brain size={12} /> ממתין להקלטה
                                  </div>
                                  {isActive && (
                                     <div className="flex items-center gap-1 text-[10px] font-bold text-nexus-primary animate-pulse">
                                       <ArrowRight size={12} /> כדאי לבצע כעת
                                     </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {isActive && (
                               <div className="w-full sm:w-auto">
                                 <QuickRecord 
                                   clientId={plan.clientId} 
                                   phaseId={phase.id} 
                                   templateId={template.id} 
                                 />
                               </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Phase Intelligence Sidebar */}
                      {isActive && (
                        <div className="lg:col-span-4 space-y-4">
                           <div className="bg-gradient-to-br from-nexus-primary to-nexus-accent rounded-2xl p-5 text-white shadow-lg shadow-nexus-primary/20 relative overflow-hidden">
                              <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                              <h4 className="text-sm font-black mb-3 flex items-center gap-2">
                                <Brain size={16} /> הכנה למפגש (AI Brief)
                              </h4>
                              <p className="text-xs text-white/90 leading-relaxed font-medium mb-4">
                                "הלקוח ציין בפגישה הקודמת קושי בלו״ז. היום חשוב להתמקד בתיעדוף משימות ולוודא שהוא רותם את הצוות שלו."
                              </p>
                              <div className="space-y-2">
                                 <div className="text-[10px] font-black uppercase tracking-wider opacity-60">אג׳נדה מומלצת:</div>
                                 <ul className="text-[11px] space-y-1 font-bold">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-white/40" /> פתרון חסמי לו״ז</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-white/40" /> תיעדוף רבעוני</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={10} className="text-white/40" /> רתימת הנהלה</li>
                                 </ul>
                              </div>
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
