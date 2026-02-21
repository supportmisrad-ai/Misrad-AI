
import React, { useState } from 'react';
import { Lead, SquareActivity, Task, PipelineStage } from '../types';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';
import { 
    X, Phone, Mail, FileText, ArrowRight, Building, Play, Thermometer,
    Crown, Users, SquareActivity as ActivityIcon, SquareCheck, Layers, Mic, MessageSquare,
    Briefcase, User, CalendarClock, Zap, PackageOpen, Rocket, CreditCard, Star, LifeBuoy
} from 'lucide-react';
import LeadBusinessSide from './LeadBusinessSide';
import LeadScoringTool from './LeadScoringTool';
import { useToast } from '../contexts/ToastContext';

interface LeadModalProps {
  lead: Lead;
  onClose: () => void;
  onAddActivity: (leadId: string, SquareActivity: SquareActivity) => void;
  onScheduleMeeting: (leadId: string) => void;
  onStatusChange?: (id: string, status: PipelineStage) => void; 
  onOpenClientPortal?: () => void;
  onAddTask?: (task: Task) => void;
}

const LeadModal: React.FC<LeadModalProps> = ({ lead, onClose, onAddActivity, onScheduleMeeting, onStatusChange, onOpenClientPortal, onAddTask }) => {
  useBackButtonClose(true, onClose);
  const { addToast } = useToast();
  const [composerTab, setComposerTab] = useState<'note' | 'call' | 'task' | 'email'>('note');
  const [noteContent, setNoteContent] = useState('');
  
  const [mobileView, setMobileView] = useState<'info' | 'timeline' | 'business'>('timeline');
  const [showFollowUp, setShowFollowUp] = useState(false);

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    
    const typeMap: Record<string, SquareActivity['type']> = {
        'note': 'note', 'call': 'call', 'email': 'email', 'task': 'system'
    };

    const newActivity: SquareActivity = {
      id: Date.now().toString(),
      type: typeMap[composerTab],
      content: noteContent,
      timestamp: new Date()
    };
    onAddActivity(lead.id, newActivity);
    setNoteContent('');
  };

  const getActivityIcon = (type: SquareActivity['type']) => {
      switch(type) {
          case 'call': return <Phone size={14} />;
          case 'feedback': return <Star size={14} />;
          case 'support': return <LifeBuoy size={14} />;
          case 'financial': return <CreditCard size={14} />;
          default: return <Layers size={14} />;
      }
  };

  const getActivityColor = (type: SquareActivity['type']) => {
      switch(type) {
          case 'call': return 'bg-rose-50 border-rose-100 text-rose-600';
          case 'feedback': return 'bg-amber-50 border-amber-100 text-amber-600';
          case 'support': return 'bg-blue-50 border-blue-100 text-blue-600';
          case 'financial': return 'bg-emerald-50 border-emerald-100 text-emerald-600';
          default: return 'bg-slate-100 border-slate-200 text-slate-500';
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-end md:items-center justify-center p-0 md:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white w-full h-[95dvh] md:max-w-[95vw] md:h-[90vh] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row ring-1 ring-white/20 animate-slide-up md:animate-scale-in" 
        onClick={e => e.stopPropagation()}
      >
        
        {/* Identity Column */}
        <div className={`${mobileView === 'info' ? 'flex' : 'hidden lg:flex'} w-full lg:w-[25%] bg-slate-50 border-b lg:border-b-0 lg:border-l border-slate-200 flex flex-col overflow-y-auto shrink-0 relative lg:h-full`}>
            <div className="p-6 text-center border-b border-slate-200/50">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-xl mb-4 border-4 border-white mx-auto ${lead.status === 'won' ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-rose-500 to-slate-800'}`}>
                    {lead.name.charAt(0)}
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">{lead.name}</h2>
                <p className="text-sm text-slate-500 mb-4">{lead.company || 'לקוח פרטי'}</p>
                <LeadScoringTool lead={lead} />
            </div>

            <div className="p-4 bg-white/50 border-b border-slate-200/50">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] block mb-3">Portal Connectivity</label>
                <button onClick={onOpenClientPortal} className="w-full flex items-center justify-between p-2.5 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all group">
                    <div className="flex items-center gap-2 text-xs font-bold">
                        <LifeBuoy size={14} /> צפה כפי שהלקוח רואה
                    </div>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
            </div>
            
            {/* Action Bar (Static for now) */}
            <div className="p-4 grid grid-cols-4 gap-2 border-b border-slate-200/50">
                <button className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-600 hover:text-rose-600 border border-slate-200 shadow-sm"><Phone size={18} /><span className="text-[9px] font-bold">חייג</span></button>
                <button className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-600 hover:text-emerald-600 border border-slate-200 shadow-sm"><MessageSquare size={18} /><span className="text-[9px] font-bold">WhatsApp</span></button>
                <button className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-600 hover:text-blue-600 border border-slate-200 shadow-sm"><Mail size={18} /><span className="text-[9px] font-bold">Email</span></button>
                <button className="flex flex-col items-center justify-center p-2 rounded-xl bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 shadow-sm"><CalendarClock size={18} /><span className="text-[9px] font-bold">פולואפ</span></button>
            </div>
        </div>

        {/* Narrative Timeline Column */}
        <div className={`${mobileView === 'timeline' ? 'flex' : 'hidden lg:flex'} w-full lg:w-[50%] bg-white flex-col h-full relative z-10 shadow-sm lg:shadow-2xl overflow-hidden order-last lg:order-none border-t border-slate-200 lg:border-t-0`}>
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary rounded-lg"><Play size={16} fill="currentColor" /></div>
                    <div>
                        <div className="text-[10px] font-bold text-primary-glow uppercase tracking-wider">סטטוס פרויקט</div>
                        <div className="font-bold text-sm">שלב הביצוע (Delivery)</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full text-[10px] font-bold">
                    <Star size={10} fill="currentColor" className="text-amber-400" /> חווית לקוח: גבוהה
                </div>
            </div>

            <div className="p-4 md:p-6 border-b border-slate-100 bg-white z-20 shrink-0">
                <div className="flex gap-4 mb-3">
                    {[{ id: 'note', label: 'פתק', icon: FileText }, { id: 'call', label: 'שיחה', icon: Phone }, { id: 'task', label: 'משימה', icon: SquareCheck }, { id: 'email', label: 'מייל', icon: Mail }].map(tab => (
                        <button key={tab.id} onClick={() => setComposerTab(tab.id as 'note' | 'call' | 'task' | 'email')} className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${composerTab === tab.id ? 'border-primary text-primary' : 'border-transparent text-slate-400'}`}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>
                <form onSubmit={handleSubmitActivity} className="relative">
                    <textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:outline-none h-24 resize-none" placeholder="תעד פעילות חדשה..." value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
                    <button type="submit" className="absolute bottom-3 left-3 p-2 bg-primary text-white rounded-lg shadow-md"><ArrowRight size={16} /></button>
                </form>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/30">
                {/* Fixed type errors on lines 144/145 by casting strings to SquareActivity['type'] */}
                {[
                    { id: 'm1', type: 'support' as SquareActivity['type'], content: 'פנייה מהפורטל: "צריך להזיז את פגישת הקיק-אוף"', timestamp: new Date(Date.now() - 3600000) },
                    { id: 'm2', type: 'feedback' as SquareActivity['type'], content: 'המלצה חדשה נתקבלה: "שירות מצוין, תהליך האפיון היה מעבר לציפיות!" (5 כוכבים)', timestamp: new Date(Date.now() - 7200000) },
                    ...lead.activities
                ].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((act) => (
                    <div key={act.id} className="flex gap-4 group animate-fade-in">
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm z-10 ${getActivityColor(act.type)}`}>
                                {getActivityIcon(act.type)}
                            </div>
                            <div className="w-0.5 flex-1 bg-slate-200 my-1 group-last:hidden"></div>
                        </div>
                        <div className="flex-1 pb-6">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-slate-700 capitalize">{act.type}</span>
                                <span className="text-[10px] text-slate-400">{new Date(act.timestamp).toLocaleString('he-IL')}</span>
                            </div>
                            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-sm text-slate-700 leading-relaxed">
                                {act.content}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Business Context Column */}
        <div className={`${mobileView === 'business' ? 'flex' : 'hidden lg:flex'} w-full lg:w-[25%] flex-col h-full`}>
            <LeadBusinessSide lead={lead} onClose={onClose} onAddActivity={onAddActivity} onStatusChange={onStatusChange} onOpenClientPortal={onOpenClientPortal} />
        </div>

      </div>
    </div>
  );
};

export default LeadModal;
