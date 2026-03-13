
import React from 'react';
import { Client, AssignedForm, AutomationSequence, ScheduledAutomation } from '../../types';
import { UserCheck, CircleAlert, ClipboardList, Plus, FileText, Zap, SquareActivity, Mail, Timer, X } from 'lucide-react';

interface ClientTasksTabProps {
  client: Client;
  assignedForms: AssignedForm[];
  onAssignForm: () => void;
  onAddAutomation: () => void;
  activeSequences: AutomationSequence[];
  scheduledAutomations: ScheduledAutomation[];
}

export const ClientTasksTab: React.FC<ClientTasksTabProps> = ({ 
  client, 
  assignedForms, 
  onAssignForm, 
  onAddAutomation,
  activeSequences, 
  scheduledAutomations 
}) => {
  return (
    <div className="space-y-8 animate-slide-up">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Manual Tasks & Reverse Accountability */}
            <div className="lg:col-span-2 space-y-8">
                {/* Reverse Accountability */}
                <div>
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <UserCheck size={18} className="text-nexus-primary"/> מחכים ללקוח
                    </h3>
                    <div className="space-y-3">
                        {client.pendingActions.length > 0 ? client.pendingActions.map(action => (
                            <div key={action.id} className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                                <div className="mt-1 text-red-500"><CircleAlert size={18} /></div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900 text-sm">{action.title}</h4>
                                    <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-[10px] font-bold bg-white px-2 py-0.5 rounded text-red-500 border border-red-200">
                                            {action.dueDate}
                                        </span>
                                        {action.isBlocking && <span className="text-[10px] font-bold text-red-600">חוסם התקדמות!</span>}
                                    </div>
                                </div>
                                <button className="text-xs font-bold text-red-600 hover:underline bg-white px-2 py-1 rounded border border-red-200">
                                    שלח תזכורת
                                </button>
                            </div>
                        )) : (
                            <div className="p-6 bg-green-50 rounded-xl border border-green-100 text-center text-green-700">
                                <UserCheck size={24} className="mx-auto mb-2" />
                                <span className="font-bold text-sm">אין משימות פתוחות ללקוח!</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Forms & Onboarding */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <ClipboardList size={18} className="text-nexus-accent"/> טפסים שנשלחו
                        </h3>
                        <button 
                            onClick={onAssignForm}
                            className="text-xs font-bold text-nexus-accent hover:underline flex items-center gap-1"
                        >
                            <Plus size={12} /> שלח טופס
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {assignedForms.map(form => (
                            <div key={form.id} className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-4 hover:border-nexus-primary/30 transition-all">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                    <FileText size={18} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <h4 className="font-bold text-gray-900 text-sm">{form.title}</h4>
                                        <span className="text-[10px] font-bold text-gray-500">{form.progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                        <div className="bg-nexus-primary h-full rounded-full" style={{ width: `${form.progress}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                                        <span>נשלח: {form.dateSent}</span>
                                        <span className={form.status === 'COMPLETED' ? 'text-green-600 font-bold' : ''}>
                                            {form.status === 'COMPLETED' ? 'הושלם' : 'בתהליך'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {assignedForms.length === 0 && (
                            <div className="text-center py-6 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                לא נשלחו טפסים
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: AUTOMATION CENTER */}
            <div className="space-y-6">
                <div className="bg-nexus-primary rounded-2xl p-6 text-white relative overflow-hidden shadow-luxury">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md shadow-glow-gold">
                                <Zap size={18} className="text-nexus-accent" fill="currentColor" />
                            </div>
                            <h3 className="font-bold">אוטומציה מלאה</h3>
                        </div>
                        <p className="text-white/60 text-xs leading-relaxed mb-6">
                            מערכת השליחה האוטומטית דואגת לשמור על קשר רציף עם הלקוח בין הפגישות.
                        </p>

                        <div className="space-y-4">
                            {/* Active Sequences */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">תהליכים רצים</h4>
                                <div className="space-y-2">
                                    {activeSequences.map(seq => (
                                        <div key={seq.id} className="bg-white/10 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="font-bold text-xs block">{seq.name}</span>
                                                <span className="text-[10px] text-white/50">{seq.description}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 text-green-400 rounded text-[10px] font-bold border border-green-500/20">
                                                <SquareActivity size={10} /> פעיל
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Scheduled Queue */}
                            <div>
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">בתור לשליחה</h4>
                                <div className="space-y-2">
                                    {scheduledAutomations.map(auto => (
                                        <div key={auto.id} className="bg-white text-gray-900 p-3 rounded-xl flex items-center gap-3 shadow-sm group relative overflow-hidden">
                                            <div className="p-2 bg-gray-100 rounded text-gray-500 group-hover:bg-nexus-primary group-hover:text-white transition-colors">
                                                {auto.type === 'EMAIL_SUMMARY' ? <Mail size={14} /> : <Timer size={14} />}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-bold text-xs block">{auto.title}</span>
                                                <span className="text-[10px] text-gray-400 block">{auto.scheduledFor}</span>
                                            </div>
                                            <button className="text-gray-300 hover:text-red-500 transition-colors p-1">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {scheduledAutomations.length === 0 && (
                                        <div className="text-center py-4 text-white/30 text-xs italic border border-dashed border-white/10 rounded-xl">
                                            התור ריק
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button 
                                onClick={onAddAutomation}
                                className="w-full py-2.5 mt-2 bg-white text-nexus-primary rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> הוסף אוטומציה חדשה
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};
