import React, { useState } from 'react';
import { Client, AssignedForm, AutomationSequence, ScheduledAutomation } from '../../types';
import { 
  UserCheck, 
  CircleAlert, 
  Plus, 
  ClipboardList, 
  FileText, 
  Send, 
  History, 
  Zap, 
  Settings, 
  ArrowRight,
  Upload,
  Paperclip,
  X,
  Loader2,
  SquareActivity,
  Mail,
  Timer
} from 'lucide-react';
import { createClientTask } from '@/app/actions/client-tasks';
import { getClientOsOrgId } from '../../lib/getOrgId';
import { useNexus } from '../../context/ClientContext';

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
  const { refreshClients } = useNexus();
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    type: 'UPLOAD' as 'APPROVAL' | 'UPLOAD' | 'SIGNATURE' | 'FORM' | 'FEEDBACK',
    isBlocking: false,
    fileUrl: '',
    fileName: ''
  });

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    
    setIsSubmitting(true);
    try {
      const orgId = getClientOsOrgId();
      if (!orgId) throw new Error('No organization ID');

      await createClientTask({
        orgId,
        clientId: client.id,
        title: newTask.title,
        description: newTask.description,
        dueDate: newTask.dueDate,
        type: newTask.type,
        isBlocking: newTask.isBlocking,
        fileUrl: newTask.fileUrl || null,
        fileName: newTask.fileName || null,
      });

      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'משימה נוספה בהצלחה!', type: 'success' } 
      }));
      
      await refreshClients();
      setIsAddingTask(false);
      setNewTask({
        title: '',
        description: '',
        dueDate: new Date().toISOString().split('T')[0],
        type: 'UPLOAD',
        isBlocking: false,
        fileUrl: '',
        fileName: ''
      });
    } catch (err) {
      console.error('Failed to add task:', err);
      window.dispatchEvent(new CustomEvent('nexus-toast', { 
        detail: { message: 'הוספת המשימה נכשלה', type: 'error' } 
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Manual Tasks & Reverse Accountability */}
            <div className="lg:col-span-2 space-y-8">
                {/* Reverse Accountability */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <UserCheck size={18} className="text-nexus-primary"/> מחכים ללקוח
                        </h3>
                        <button 
                            onClick={() => setIsAddingTask(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-nexus-primary text-white rounded-lg text-xs font-bold hover:bg-nexus-accent transition-all shadow-sm"
                        >
                            <Plus size={14} /> הוסף משימה ללקוח
                        </button>
                    </div>

                    {isAddingTask && (
                        <div className="mb-6 bg-white border-2 border-nexus-primary/20 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300">
                            <div className="flex justify-between items-start mb-6">
                                <h4 className="font-black text-gray-900 flex items-center gap-2">
                                    <ClipboardList size={20} className="text-nexus-primary" /> משימה חדשה ללקוח
                                </h4>
                                <button onClick={() => setIsAddingTask(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">כותרת המשימה</label>
                                        <input 
                                            type="text"
                                            value={newTask.title}
                                            onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))} 
                                            placeholder="למשל: העלאת דוחות כספיים רבעון 1"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-nexus-primary outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">תיאור (מה הלקוח צריך לעשות?)</label>
                                        <textarea 
                                            value={newTask.description}
                                            onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))} 
                                            placeholder="פרט כאן את ההוראות ללקוח..."
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-nexus-primary outline-none transition-all min-h-[100px] resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">תאריך יעד</label>
                                        <input 
                                            type="date"
                                            value={newTask.dueDate}
                                            onChange={(e) => setNewTask(prev => ({ ...prev, dueDate: e.target.value }))} 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-nexus-primary outline-none transition-all font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1.5">סוג פעולה</label>
                                        <select 
                                            value={newTask.type}
                                            onChange={(e) => setNewTask(prev => ({ ...prev, type: e.target.value as any }))} 
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-nexus-primary outline-none transition-all font-bold"
                                        >
                                            <option value="UPLOAD">העלאת קובץ</option>
                                            <option value="APPROVAL">אישור מסמך</option>
                                            <option value="SIGNATURE">חתימה דיגיטלית</option>
                                            <option value="FORM">מילוי טופס</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <input 
                                        type="checkbox" 
                                        id="isBlocking"
                                        checked={newTask.isBlocking}
                                        onChange={(e) => setNewTask(prev => ({ ...prev, isBlocking: e.target.checked }))} 
                                        className="w-4 h-4 rounded text-nexus-primary focus:ring-nexus-primary"
                                    />
                                    <label htmlFor="isBlocking" className="text-sm font-bold text-gray-700 cursor-pointer">
                                        משימה חוסמת (הלקוח יראה התראה אדומה בפורטל)
                                    </label>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button 
                                        onClick={() => setIsAddingTask(false)}
                                        className="px-6 py-2.5 rounded-xl text-gray-500 font-bold hover:bg-gray-100 transition-all"
                                    >
                                        ביטול
                                    </button>
                                    <button 
                                        onClick={handleAddTask}
                                        disabled={isSubmitting || !newTask.title.trim()}
                                        className="px-8 py-2.5 rounded-xl bg-nexus-primary text-white font-black shadow-lg shadow-nexus-primary/20 hover:opacity-95 transition-all flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                        שלח לפורטל הלקוח
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {client.pendingActions.length > 0 ? client.pendingActions.map(action => (
                            <div key={action.id} className={`${action.isBlocking ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100 shadow-sm'} border p-5 rounded-2xl flex items-start gap-4 transition-all hover:shadow-md`}>
                                <div className={`mt-1 ${action.isBlocking ? 'text-red-500' : 'text-nexus-primary'}`}>
                                    {action.type === 'UPLOAD' ? <Upload size={20} /> : 
                                     action.type === 'SIGNATURE' ? <FileText size={20} /> :
                                     <CircleAlert size={20} />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-black text-gray-900 text-base">{action.title}</h4>
                                        {action.isBlocking && (
                                            <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-black uppercase tracking-tighter animate-pulse">
                                                חוסם!
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 font-medium leading-relaxed">{action.description}</p>
                                    
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 uppercase tracking-tighter">
                                            <History size={10} /> יעד: {action.dueDate}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-nexus-primary bg-nexus-primary/5 px-2 py-1 rounded-md border border-nexus-primary/10 uppercase tracking-tighter">
                                            <Zap size={10} /> {action.type}
                                        </div>
                                        {(action as any).file_url && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 uppercase tracking-tighter">
                                                <Paperclip size={10} /> קובץ מצורף
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="text-xs font-black text-nexus-primary hover:bg-nexus-primary/5 px-4 py-2 rounded-xl border border-nexus-primary/20 transition-all">
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
