
import React, { useState } from 'react';
import { Lead, CalendarEvent, Task, LeadStatus, Status, Priority } from '../types';
import { 
    Sun, Calendar, Clock, MapPin, Phone, ArrowRight, 
    CircleCheck, Coffee, TrendingUp, CircleAlert, ChevronRight, Play, CircleCheckBig
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

interface MorningBriefingViewProps {
  leads: Lead[];
  events: CalendarEvent[];
  tasks: Task[];
  onNavigate: (tab: string) => void;
  onLeadClick: (lead: Lead) => void;
  onUpdateTask?: (task: Task) => void;
  onStartShift?: () => void;
}

const MorningBriefingView: React.FC<MorningBriefingViewProps> = ({ leads, events, tasks, onNavigate, onLeadClick, onUpdateTask, onStartShift }) => {
  const { addToast } = useToast();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const todayIso = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysEvents = events.filter(e => {
    const start = new Date(e.start);
    return start >= startOfToday && start <= endOfToday;
  });

  const urgentLeads = leads
    .filter(l => l.status !== LeadStatus.WON && l.status !== LeadStatus.LOST)
    .slice(0, 3);
  
  const importantTasks = tasks
    .filter(t => t.status !== Status.DONE)
    .sort((a,b) => {
        const priorityOrder: Record<Priority, number> = {
          [Priority.URGENT]: 0,
          [Priority.HIGH]: 1,
          [Priority.MEDIUM]: 2,
          [Priority.LOW]: 3,
        };

        return (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99);
    })
    .slice(0, 4);

  const markEventDone = (id: string) => {
      if (completedSteps.includes(id)) {
          setCompletedSteps(completedSteps.filter(s => s !== id));
      } else {
          setCompletedSteps([...completedSteps, id]);
      }
  };

  const handleTaskComplete = (task: Task) => {
      if (onUpdateTask) {
          onUpdateTask({ ...task, status: Status.DONE });
          addToast('משימה הושלמה!', 'success');
      }
  };

  const handleCall = (e: React.MouseEvent, phone: string) => {
      e.stopPropagation();
      window.location.href = `tel:${phone}`;
      addToast('מחייג ללקוח...', 'info');
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in pb-32">
      
      {/* Header / Greeting */}
      <div className="mb-10 relative overflow-hidden rounded-[40px] bg-slate-900 text-white shadow-2xl border border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-[0.2em] text-indigo-300 mb-6">
                      <Sun size={14} className="animate-pulse" /> מערכת דרוכה
                  </div>
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter mb-4 leading-none">
                      בוקר טוב.
                  </h1>
                  <p className="text-slate-400 text-lg font-medium max-w-xl leading-relaxed">
                      היום {todayLabel}. יש לנו <span className="text-white font-bold">{todaysEvents.length} פגישות</span> מתוכננות ו-{urgentLeads.length} לידים לטיפול.
                  </p>
              </div>
              
              <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-md rounded-[32px] p-8 border border-white/10 text-center min-w-[180px] shadow-inner">
                  <div className="text-5xl font-black mb-1">{todaysEvents.length}</div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">פגישות היום</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-10">
              
              {/* Daily Schedule */}
              <section>
                  <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 mb-6">
                      <Calendar size={22} className="text-indigo-600" />
                      הלו"ז שלך
                  </h3>
                  <div className="space-y-4">
                      {todaysEvents.length === 0 ? (
                          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-400 shadow-sm">
                              <Coffee size={40} className="mx-auto mb-3 opacity-30" />
                              <p className="font-bold text-lg text-slate-500">האירועים פנויים להיום!</p>
                              <p className="text-sm mt-1">זמן טוב לעבור על ה-Velocity List.</p>
                          </div>
                      ) : (
                          todaysEvents.map((event, idx) => (
                              <div key={event.id} className="group flex gap-6">
                                  <div className="flex flex-col items-center pt-2">
                                      <div className={`w-4 h-4 rounded-full border-4 bg-white z-10 transition-all duration-500 ${completedSteps.includes(event.id) ? 'border-emerald-500 bg-emerald-500' : 'border-slate-200 group-hover:border-indigo-400'}`}></div>
                                      {idx !== todaysEvents.length - 1 && <div className="w-0.5 flex-1 bg-slate-200 my-2"></div>}
                                  </div>
                                  <div 
                                    onClick={() => markEventDone(event.id)}
                                    className={`flex-1 bg-white p-6 rounded-[32px] border transition-all cursor-pointer hover:shadow-float ${
                                        completedSteps.includes(event.id) 
                                        ? 'border-emerald-100 bg-emerald-50/20 opacity-60 scale-[0.98]' 
                                        : 'border-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-3">
                                              <span className="font-mono font-black text-slate-900 text-xl tracking-tighter">
                                                {new Date(event.start).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                              <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500 border border-slate-200">פגישה</span>
                                          </div>
                                          {completedSteps.includes(event.id) && <CircleCheckBig size={20} className="text-emerald-500" />}
                                      </div>
                                      <h4 className={`font-black text-slate-800 text-lg ${completedSteps.includes(event.id) && 'line-through'}`}>{event.title}</h4>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </section>

              {/* Tasks */}
              <section>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                          <CircleCheck size={22} className="text-indigo-600" />
                          משימות מפתח
                      </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {importantTasks.map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => handleTaskComplete(task)}
                            className="p-5 rounded-[28px] border bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex items-center gap-4 group"
                          >
                              <div className="w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all border-slate-200 group-hover:border-emerald-500 text-transparent group-hover:text-emerald-500">
                                  <CircleCheck size={16} fill="currentColor" className="opacity-0 group-hover:opacity-100" />
                              </div>
                              <div className="flex-1 min-w-0">
                                  <p className="font-bold text-slate-800 text-sm truncate">{task.title}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded border ${
                                          task.priority === Priority.URGENT ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                                      }`}>
                                          {task.priority}
                                      </span>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>

          </div>

          <div className="space-y-8">
              
              {/* Opportunities */}
              <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                  <div className="mb-8">
                      <h3 className="text-xl font-black flex items-center gap-2 text-slate-900 tracking-tight">
                          <TrendingUp size={22} className="text-rose-500" />
                          הזדמנויות היום
                      </h3>
                  </div>

                  <div className="space-y-4">
                      {urgentLeads.map(lead => (
                          <div key={lead.id} className="bg-slate-50/50 p-5 rounded-3xl border border-slate-100 transition-all cursor-pointer hover:bg-white hover:shadow-lg hover:border-rose-200" onClick={() => onLeadClick(lead)}>
                              <div className="flex justify-between items-start mb-3">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-sm shadow-sm">
                                          {lead.name.charAt(0)}
                                      </div>
                                      <div>
                                          <div className="font-bold text-sm text-slate-800">{lead.name}</div>
                                          <div className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{lead.status}</div>
                                      </div>
                                  </div>
                                  <span className="font-mono font-bold text-slate-900">{Number.isFinite(lead.value) ? `₪${lead.value.toLocaleString()}` : '—'}</span>
                              </div>
                              <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => lead.phone ? handleCall(e, lead.phone) : addToast('אין מספר טלפון ללקוח זה', 'info')}
                                    className="flex-1 bg-white border border-slate-200 hover:border-rose-300 text-slate-700 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
                                  >
                                      חיוג מהיר
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onLeadClick(lead); }}
                                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-indigo-600 transition-all"
                                  >
                                      <ArrowRight size={18} />
                                  </button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>

              {/* AI Wisdom */}
              <div className="bg-slate-900 rounded-[40px] p-8 text-white shadow-2xl relative overflow-hidden ring-1 ring-white/10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl"></div>
                  <h3 className="font-bold text-white flex items-center gap-3 mb-4 relative z-10">
                      <CircleAlert size={22} className="text-indigo-400" />
                      מסר מהמערכת
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium relative z-10 bg-white/5 p-4 rounded-2xl border border-white/5">
                      אין תובנות להצגה כרגע.
                  </p>
              </div>

              {/* ACTION: START DAY */}
              {onStartShift && (
                  <button 
                    onClick={onStartShift} 
                    className="w-full py-6 rounded-[32px] bg-nexus-gradient hover:opacity-90 text-white font-black text-lg transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-rose-500/30 hover:-translate-y-1 active:scale-95"
                  >
                      <Play size={24} fill="currentColor" className="group-hover:scale-110 transition-transform" />
                      התחל יום עבודה
                  </button>
              )}

          </div>
      </div>
    </div>
  );
};

export default MorningBriefingView;
