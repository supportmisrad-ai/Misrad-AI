
import React, { useState, useEffect, useMemo } from 'react';
import { Lead, ContentItem, Student, Campaign, Task, CalendarEvent } from '../types';
import { 
    Flame, CircleCheck, Video, Target, Phone, ChevronRight, TriangleAlert, 
    Mic, Users, Coins, BarChart2, Plus, Calendar, Wifi, Check, X, 
    Voicemail, Mail, ArrowRight, Play, Megaphone, SquareActivity, Layers, Zap,
    Sun, Timer, MousePointer2, ArrowUpRight, Radio, CalendarClock, Gauge,
    Cpu, ShieldCheck, HeartPulse, Sparkles, MessageSquare, ExternalLink, Clock, User, PhoneCall
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import MobileFrontWing from './MobileFrontWing';

// Helper Formatters - Moved to top and sanitized variable names to fix potential identifier errors
const formatRelativeTime = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const totalMinutes = Math.floor(diffMs / 60000);
    if (totalMinutes < 60) return `לפני ${totalMinutes} דק'`;
    const totalHours = Math.floor(totalMinutes / 60);
    if (totalHours < 24) return `לפני ${totalHours} שע'`;
    return date.toLocaleDateString('he-IL');
};

const formatDate = (date: Date) => {
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
};

interface SystemCommandCenterProps {
  leads: Lead[];
  content?: ContentItem[];
  students?: Student[];
  campaigns?: Campaign[];
  tasks?: Task[];
  events?: CalendarEvent[];
  onLeadClick: (lead: Lead) => void;
  onNavigate: (tabId: string) => void;
  onQuickAction: (action: 'lead' | 'meeting' | 'task') => void;
}

type VelocityItem = 
  | { type: 'lead'; data: Lead; id: string; score: number; date: Date }
  | { type: 'task'; data: Task; id: string; score: number; date: Date };

const SystemCommandCenter: React.FC<SystemCommandCenterProps> = ({ 
    leads, 
    content = [], 
    students = [], 
    campaigns = [],
    tasks = [],
    events = [],
    onLeadClick, 
    onNavigate, 
    onQuickAction
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [greeting, setGreeting] = useState('');
  
  const isAgent = user?.role === 'agent';
  const userId = user?.id;
  const firstName = user?.name?.split(' ')[0] || '';

  useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('בוקר טוב');
      else if (hour < 18) setGreeting('צהריים טובים');
      else setGreeting('ערב טוב');
  }, []);

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  const myLeads = isAgent 
    ? leads.filter(l => (userId ? l.assignedAgentId === userId : false) || !l.assignedAgentId) 
    : leads;

  const hitListLeads = myLeads.filter(l => (l.isHot || l.score > 70) && l.status !== 'won' && l.status !== 'lost');

  const myTasks = tasks.filter(t => 
      t.status !== 'done' && 
      (userId ? (t.assigneeId === userId || t.assigneeId === 'current') : false) &&
      new Date(t.dueDate).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0)
  );

  const velocityList: VelocityItem[] = useMemo(() => {
      return [
          ...hitListLeads.map(l => ({ type: 'lead' as const, data: l, id: l.id, score: l.score, date: new Date(l.lastContact) })),
          ...myTasks.map(t => ({ type: 'task' as const, data: t, id: t.id, score: t.priority === 'critical' ? 100 : t.priority === 'high' ? 90 : 80, date: t.dueDate }))
      ].filter(item => !completedTaskIds.includes(item.id))
       .sort((a, b) => b.score - a.score);
  }, [hitListLeads, myTasks, completedTaskIds]);

  const nextMeeting = events
    .filter(e => {
        const today = new Date().toISOString().split('T')[0];
        return e.date >= today;
    })
    .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))[0];

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const myWonDeals = leads.filter(l => l.status === 'won' && l.assignedAgentId === userId).length;
  const myCommission = leads
    .filter(l => l.status === 'won' && l.assignedAgentId === userId)
    .reduce((sum, l) => sum + (l.value * 0.05), 0);

  const totalRevenue = useMemo(() => {
      return leads
        .filter(l => l.status === 'won')
        .reduce((sum, l) => sum + (l.value || 0), 0);
  }, [leads]);

  const velocityScore = useMemo(() => {
      const initialLoad = velocityList.length + completedTaskIds.length;
      if (initialLoad === 0) return 100;
      return Math.round(50 + ((completedTaskIds.length / initialLoad) * 50));
  }, [velocityList.length, completedTaskIds.length]);

  const handleComplete = (id: string) => {
      setCompletedTaskIds(prev => [...prev, id]);
      addToast('יפה! פחות אחד.', 'success');
  };

  const getPlaybookIcon = (step?: string) => {
      if (!step) return <Phone size={14} />;
      if (step.includes('וואטסאפ') || step.includes('הודעה')) return <MessageSquare size={14} />;
      return <Phone size={14} />;
  };

  return (
    <>
      <div className="block md:hidden pb-20">
          {user ? (
            <MobileFrontWing 
              user={user} 
              leads={leads}
              onQuickAction={onQuickAction} 
              onNavigate={onNavigate} 
              onLeadClick={onLeadClick}
              nextMeeting={nextMeeting}
              velocityScore={velocityScore}
            />
          ) : null}
      </div>

      <div className="hidden md:block space-y-6 animate-fade-in pb-20 font-sans">
      
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
         
         {/* FRONT WING PILOT INTERFACE */}
         <section 
            className="xl:col-span-8 relative overflow-hidden group bg-white/60 text-slate-900 shadow-sm rounded-[48px] min-h-[360px] flex flex-col justify-between p-12 border border-slate-200/60 backdrop-blur-xl"
         >
            <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-white/70 to-white/30"></div>
            
            <div className="flex justify-between items-start relative z-10">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-white/70 border border-slate-200/70 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-600 mb-6">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" /> תצוגה חדשה
                    </div>
                    <div className="max-w-2xl">
                        <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-3 leading-tight font-display">
                            {greeting},
                            <span className="block">{firstName}.</span>
                        </h2>
                    </div>
                </div>
                
                <div className="hidden md:flex flex-col items-center justify-center relative w-48 h-48 group/gauge">
                    <div className="absolute inset-0 bg-white/5 rounded-full blur-2xl group-hover/gauge:bg-primary/20 transition-all duration-700"></div>
                    <svg className="w-full h-full transform -rotate-90 relative z-10 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                        <circle cx="50%" cy="50%" r="40%" stroke="rgba(255,255,255,0.05)" strokeWidth="14" fill="transparent" />
                        <circle 
                            cx="50%" cy="50%" r="40%" 
                            stroke={velocityScore > 80 ? '#10b981' : velocityScore > 50 ? '#fbbf24' : '#f43f5e'} 
                            strokeWidth="14" 
                            fill="transparent" 
                            strokeDasharray="251.3" 
                            strokeDashoffset={251.3 - (251.3 * velocityScore) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-[1.5s] ease-out shadow-neon"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                        <span className="text-5xl font-black font-mono leading-none tracking-tighter">{velocityScore}</span>
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mt-2">ביצועים</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mt-8 pt-10 border-t border-white/10 relative z-10">
                <div className="md:col-span-8 flex gap-3">
                    <button 
                        onClick={() => onQuickAction('lead')}
                        className="flex-1 bg-white text-onyx-900 hover:bg-rose-50 px-4 py-5 rounded-[28px] font-black text-lg shadow-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.05] active:scale-95 group"
                    >
                        <Plus size={22} strokeWidth={3} className="group-hover:rotate-90 transition-transform" />
                        ליד חדש
                    </button>
                    <button 
                        onClick={() => onNavigate('comms')}
                        className="flex-1 bg-white/10 text-white hover:bg-white/20 px-4 py-5 rounded-[28px] font-bold text-lg border border-white/10 flex items-center justify-center gap-3 transition-all backdrop-blur-2xl group"
                    >
                        <PhoneCall size={24} className="text-rose-400 group-hover:scale-110 transition-transform" />
                        מרכזיה
                    </button>
                    <button 
                        onClick={() => onNavigate('focus_mode')}
                        className="flex-1 bg-white/10 text-white hover:bg-white/20 px-4 py-5 rounded-[28px] font-bold text-lg border border-white/10 flex items-center justify-center gap-3 transition-all backdrop-blur-2xl group"
                    >
                        <Timer size={24} className="text-indigo-300 group-hover:scale-110 transition-transform" />
                        מיקוד
                    </button>
                </div>
                
                <div className="md:col-span-4 flex items-center justify-end gap-8 text-right">
                    <div className="group/stat cursor-default">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 group-hover/stat:text-emerald-400 transition-colors">
                            {isAgent ? 'עמלה' : 'הכנסה'}
                        </div>
                        <div className="text-3xl font-mono font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover/stat:scale-105 transition-transform">
                            {isAgent ? `₪${myCommission.toLocaleString()}` : `₪${totalRevenue.toLocaleString()}`}
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10"></div>
                    <div className="group/stat cursor-default">
                        <div className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 group-hover/stat:text-white transition-colors">
                            {isAgent ? 'סגירות' : 'קמפיינים'}
                        </div>
                        <div className="text-3xl font-mono font-black text-white group-hover/stat:scale-105 transition-transform">
                            {isAgent ? myWonDeals : activeCampaigns}
                        </div>
                    </div>
                </div>
            </div>
         </section>

         <aside className="xl:col-span-4 flex flex-col gap-6">
             <div 
                onClick={() => onNavigate('briefing')}
                className="flex-1 bg-white rounded-[48px] p-8 shadow-sm border border-slate-200 hover:border-primary/30 hover:shadow-float transition-all cursor-pointer group relative overflow-hidden"
             >
                 <div className="absolute top-0 right-0 w-36 h-36 bg-amber-50 rounded-bl-[100px] -mr-4 -mt-4 transition-transform group-hover:scale-125 duration-700"></div>
                 <div className="relative z-10 h-full flex flex-col">
                     <div className="flex justify-between items-start mb-8">
                         <div className="p-5 bg-amber-50 text-amber-600 rounded-[24px] border border-amber-100 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-sm">
                             <Sun size={32} fill="currentColor" />
                         </div>
                         <div className="bg-slate-50 p-2 rounded-full text-slate-300 group-hover:text-amber-500 group-hover:bg-amber-50 transition-all">
                            <ArrowUpRight size={28} className="transition-all group-hover:translate-x-1 group-hover:-translate-y-1" />
                         </div>
                     </div>
                     <div className="mt-auto">
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">הכנה ליום העבודה</div>
                         <h3 className="font-black text-slate-800 text-3xl group-hover:text-amber-700 transition-colors">תדריך בוקר</h3>
                     </div>
                 </div>
             </div>

             <div className="grid grid-cols-2 gap-4 h-44">
                 <div className="bg-indigo-50/40 rounded-[40px] p-6 border border-indigo-100/50 flex flex-col justify-center items-center text-center hover:bg-white hover:shadow-lg transition-all group cursor-default">
                     <div className="text-5xl font-mono font-black text-indigo-700 mb-2 group-hover:scale-110 transition-transform">{myWonDeals}</div>
                     <div className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em]">סגירות</div>
                 </div>
                 <div className="bg-rose-50/40 rounded-[40px] p-6 border border-rose-100/50 flex flex-col justify-center items-center text-center hover:bg-white hover:shadow-lg transition-all group cursor-default">
                     <div className="text-5xl font-mono font-black text-rose-700 mb-2 group-hover:scale-110 transition-transform">{hitListLeads.length}</div>
                     <div className="text-[11px] font-black text-rose-400 uppercase tracking-[0.2em]">לטיפול מיידי</div>
                 </div>
             </div>
         </aside>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        
        {/* REDESIGNED NEXT ACTIONS PANEL */}
        <div className="lg:col-span-2 ui-card flex flex-col h-[650px] overflow-hidden border-slate-200 bg-white/40 backdrop-blur-xl relative">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-nexus-gradient text-white rounded-2xl shadow-lg shadow-rose-500/20">
                        <Zap size={22} fill="currentColor" className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">הפעולות הבאות</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">סדר עדיפויות מבוסס AI</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase mr-2">הספק היום</span>
                    <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${(completedTaskIds.length / (velocityList.length + completedTaskIds.length || 1)) * 100}%` }}
                            className="h-full bg-nexus-gradient"
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                <AnimatePresence mode="popLayout">
                    {velocityList.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="h-full flex flex-col items-center justify-center text-center py-20"
                        >
                            <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center mb-6 text-emerald-500 shadow-inner ring-1 ring-emerald-100">
                                <Check size={48} strokeWidth={3} />
                            </div>
                            <h4 className="text-2xl font-black text-slate-800">השולחן נקי!</h4>
                            <p className="text-slate-500 font-bold max-w-xs mt-2">כל המשימות הדחופות טופלו. זה זמן מצוין ליזום שיחות פולואפ ללידים "קרים".</p>
                        </motion.div>
                    ) : (
                        velocityList.map((item, index) => {
                            const isTask = item.type === 'task';
                            const data = item.data;
                            const isHighPriority = item.score >= 90;
                            const isFirst = index === 0;
                            
                            return (
                                <motion.div 
                                    key={item.id} 
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    onClick={() => !isTask ? onLeadClick(data as Lead) : null}
                                    className={`
                                        group relative p-6 rounded-[32px] border transition-all cursor-pointer flex items-center gap-6
                                        ${isFirst ? 'bg-white shadow-xl border-indigo-100 ring-1 ring-indigo-50/50' : 'bg-white/60 border-slate-200/60 hover:bg-white hover:shadow-float hover:border-primary/20'}
                                    `}
                                >
                                    {/* Left Accent Glow */}
                                    <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full transition-all ${
                                        isTask ? 'bg-indigo-500' : isHighPriority ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-slate-300'
                                    }`}></div>

                                    {/* Status / Complete Toggle */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleComplete(item.id); }}
                                        className={`
                                            w-12 h-12 rounded-[20px] flex items-center justify-center shrink-0 border transition-all duration-300
                                            ${isFirst ? 'bg-slate-900 border-slate-800 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'}
                                        `}
                                    >
                                        <Check size={24} strokeWidth={isFirst ? 3 : 2} />
                                    </button>

                                    {/* Main Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            {isTask ? (
                                                <div className="bg-indigo-50 text-indigo-600 p-1 rounded-md"><CalendarClock size={12} /></div>
                                            ) : (
                                                <div className="bg-rose-50 text-rose-600 p-1 rounded-md"><User size={12} /></div>
                                            )}
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                {isTask ? 'משימה דחופה' : (data as Lead).company || 'לקוח פרטי'}
                                            </span>
                                        </div>
                                        
                                        <h4 className={`font-black text-slate-900 leading-tight truncate group-hover:text-primary transition-colors ${isFirst ? 'text-xl' : 'text-lg'}`}>
                                            {isTask ? (data as Task).title : (data as Lead).name}
                                        </h4>

                                        <div className="flex items-center gap-3 mt-2">
                                            {!isTask && (
                                                <div className="flex items-center gap-1.5 bg-slate-100/50 px-2.5 py-1 rounded-xl border border-slate-200/50">
                                                    {getPlaybookIcon((data as Lead).playbookStep)}
                                                    <span className="text-[11px] font-bold text-slate-600">{(data as Lead).playbookStep || 'שיחה ראשונית'}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                                                <Clock size={10} />
                                                {isTask ? formatDate((data as Task).dueDate) : formatRelativeTime((data as Lead).createdAt)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats & Actions */}
                                    <div className="hidden md:flex items-center gap-8">
                                        <div className="text-right">
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-0.5">ציון עוצמה</div>
                                            <div className={`text-2xl font-black font-mono leading-none ${item.score >= 90 ? 'text-rose-500' : 'text-slate-700'}`}>
                                                {item.score}
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
                                            {!isTask && (
                                                <>
                                                    <button className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-colors border border-emerald-100">
                                                        <Phone size={18} />
                                                    </button>
                                                    <button className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-100 transition-colors border border-indigo-100">
                                                        <MessageSquare size={18} />
                                                    </button>
                                                </>
                                            )}
                                            <button className="p-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-colors shadow-lg shadow-slate-200">
                                                <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>
            
            <button 
                onClick={() => onNavigate('tasks')}
                className="p-6 text-center text-xs font-black text-slate-400 hover:text-primary transition-all border-t border-slate-100/50 bg-slate-50/30 uppercase tracking-[0.3em] group"
            >
                ניהול משימות מלא <ChevronRight size={14} className="inline ml-1 transition-transform group-hover:translate-x-1" />
            </button>
        </div>

        {/* Pulsing System Hub */}
        <section 
          className="ui-card flex flex-col h-[650px] overflow-hidden bg-white/60 border-white/60 backdrop-blur-2xl shadow-xl"
        >
            <div className="p-8 border-b border-slate-100 bg-white/50 flex justify-between items-center">
               <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                   <SquareActivity size={24} className="text-indigo-600" />
                   סטטוס מערכת
               </h3>
               <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {[
                    { icon: CircleCheck, color: 'text-emerald-600', bg: 'bg-emerald-100', title: 'תשלום התקבל', desc: 'יואב כהן שילם מקדמה על סך ₪5,000.', time: 'לפני 12 דק\'' },
                    { icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-100', title: 'תוכן חדש מוכן', desc: 'העורך סיים את הסרטון "איך למנף".', time: 'לפני 38 דק\'' },
                    { icon: TriangleAlert, color: 'text-amber-600', bg: 'bg-amber-100', title: 'התראת נטישה', desc: 'רון שוורץ לא פתח את הפורטל השבוע.', time: 'לפני שעה' },
                    { icon: Mic, color: 'text-rose-600', bg: 'bg-rose-100', title: 'ניתוח שיחה', desc: 'זיהיתי 2 התנגדויות בשיחה עם דניאל.', time: 'לפני שעתיים' },
                    { icon: Layers, color: 'text-slate-600', bg: 'bg-slate-200', title: 'אוטומציה', desc: 'נשלחו 42 הודעות פולואפ אוטומטיות.', time: 'לפני 4 שעות' }
                ].map((item, idx) => (
                    <div key={idx} className="flex gap-5 group">
                        <div className="flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-[20px] ${item.bg} ${item.color} flex items-center justify-center shrink-0 shadow-lg border border-white/5 backdrop-blur-sm z-10 transition-all group-hover:scale-110 group-hover:rotate-3`}>
                                <item.icon size={22} />
                            </div>
                            {idx !== 4 && <div className="w-0.5 flex-1 bg-slate-200/50 mt-3 rounded-full group-hover:bg-indigo-400 transition-colors"></div>}
                        </div>
                        <div className="pb-4 flex-1">
                            <div className="flex justify-between items-start w-full">
                                <h4 className="font-black text-slate-800 text-base group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                                <span className="text-[11px] font-mono font-bold text-slate-400">{item.time}</span>
                            </div>
                            <p className="text-sm text-slate-500 font-bold mt-1 leading-relaxed opacity-80">{item.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
            
            <button 
                onClick={() => onNavigate('notifications_center')}
                className="p-6 text-center text-sm font-black text-indigo-600 hover:bg-white transition-all border-t border-slate-100 active:bg-slate-50 uppercase tracking-[0.2em]"
            >
                כל ההתראות <ArrowRight size={14} className="inline ml-2" />
            </button>
        </section>

      </div>
      </div>
    </>
  );
};

export default SystemCommandCenter;
