
import React, { useMemo } from 'react';
import { isSuperAdminEmail } from '@/lib/constants/roles';
import { 
    Zap, Calendar, BarChart2, Plus, 
    ArrowRight, ChevronRight, SquareActivity, 
    TrendingUp, Shield, Star, Phone, Video,
    User, Gauge, Link2, Check, Target,
    Lock
} from 'lucide-react';
import { UserProfile, CalendarEvent, Lead } from '../types';

interface MobileFrontWingProps {
    user: UserProfile;
    leads: Lead[];
    onQuickAction: (action: 'lead' | 'meeting' | 'task') => void;
    onNavigate: (tab: string) => void;
    onLeadClick: (lead: Lead) => void;
    nextMeeting?: CalendarEvent;
    velocityScore?: number;
}

const MobileFrontWing: React.FC<MobileFrontWingProps> = ({ user, leads, onQuickAction, onNavigate, onLeadClick, nextMeeting, velocityScore = 100 }) => {
    const [linkCopied, setLinkCopied] = React.useState(false);
    
    const handleCopyLink = () => {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/lead/${user.organizationId || 'default'}` : '#';
        void navigator.clipboard.writeText(url).then(() => {
            setLinkCopied(true);
            setTimeout(() => setLinkCopied(false), 2000);
        });
    };
    
    // --- Systemic Logic (Real-time Calculations) ---
    
    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'won').length;
        const hot = leads.filter(l => l.isHot && l.status !== 'won' && l.status !== 'lost').length;
        const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
        
        return { total, won, hot, conversionRate };
    }, [leads]);

    const activeCases = useMemo(() => {
        return leads
            .filter(l => l.status !== 'won' && l.status !== 'lost')
            .sort((a,b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime());
    }, [leads]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    };

    const isSuperUser = isSuperAdminEmail(user.email) || (user as any).isSuperAdmin;

    return (
        <div className="flex flex-col space-y-6 animate-fade-in">
            
            {/* 1. Hero Cockpit - Compact Version */}
            <div className="bg-slate-900 rounded-[32px] p-5 text-white relative overflow-hidden shadow-2xl isolate border border-white/5">
                {/* Beta Badge */}
                {isSuperUser && (
                    <div className="absolute top-4 left-4 z-20">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-md">
                            <Lock size={10} className="text-indigo-400" />
                            <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">Booking Beta</span>
                        </div>
                    </div>
                )}
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 -z-10"></div>
                
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-nexus-gradient flex items-center justify-center ring-2 ring-white/10 shadow-lg">
                            <User size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black leading-none">
                                {getGreeting()}, {user.name.split(' ')[0]}
                            </h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                                {stats.hot > 0 ? `${stats.hot} לידים חמים ממתינים` : 'המערכת בסריקה'}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                         <span className="text-[10px] font-bold text-slate-500 uppercase">{new Date().toLocaleDateString('he-IL')}</span>
                         <div className="flex items-center gap-1 mt-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Live</span>
                         </div>
                    </div>
                </div>

                {/* Next Meeting - Compact & Actionable */}
                {nextMeeting && (isSuperUser || nextMeeting.module !== 'booking') && (
                    <div className="mb-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 flex items-center justify-between group active:scale-[0.98] transition-all" onClick={() => onNavigate('calendar')}>
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex flex-col items-center justify-center shrink-0 border border-rose-500/30">
                                <span className="text-[10px] font-black text-rose-400 leading-none">NOW</span>
                                <Calendar size={14} className="text-rose-400 mt-0.5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">פגישה קרובה</div>
                                <div className="text-sm font-bold truncate">{nextMeeting.leadName}</div>
                            </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                            <div className="text-sm font-black text-white">{nextMeeting.time}</div>
                            <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                                כניסה <ArrowRight size={10} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Quick Stats Grid - Horizontal Scroll */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
                    <div className="shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-400" />
                        <span className="text-xs font-bold">{stats.conversionRate}% המרות</span>
                    </div>
                    <div className="shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Gauge size={14} className="text-indigo-400" />
                        <span className="text-xs font-bold">קצב {velocityScore}</span>
                    </div>
                    <div className="shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                        <Star size={14} className="text-amber-400" />
                        <span className="text-xs font-bold">{stats.won} סגירות</span>
                    </div>
                </div>

                {/* Main Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => onNavigate('comms')}
                        className="bg-rose-600 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 active:scale-95 transition-all border border-rose-500/30"
                    >
                        <Phone size={18} fill="currentColor" />
                        מרכזיה
                    </button>
                    <button 
                        onClick={() => onQuickAction('lead')}
                        className="bg-white text-slate-900 py-3 rounded-xl font-bold text-sm shadow-lg shadow-white/10 flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <Plus size={18} strokeWidth={3} />
                        ליד חדש
                    </button>
                </div>
            </div>

            {/* 2. Active Cases - Vertical Swipe List */}
            <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-2 mb-4">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <SquareActivity size={16} className="text-rose-500" />
                        תיקים בטיפול ({activeCases.length})
                    </h3>
                    <button 
                        onClick={() => onNavigate('sales_leads')}
                        className="text-[10px] font-black text-rose-500 uppercase tracking-tighter bg-rose-500/10 px-2 py-1 rounded-md"
                    >
                        הכל
                    </button>
                </div>
                
                <div className="space-y-3 pb-20">
                    {activeCases.map((lead) => (
                        <div 
                            key={lead.id} 
                            onClick={() => onLeadClick(lead)}
                            className="bg-slate-900/40 backdrop-blur-sm border border-white/5 rounded-2xl p-4 flex items-center justify-between active:scale-[0.98] transition-all group relative overflow-hidden"
                        >
                            {lead.isHot && (
                                <div className="absolute top-0 right-0 w-1 h-full bg-rose-500/50 blur-[2px]"></div>
                            )}
                            
                            <div className="flex items-center gap-4 min-w-0">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-black shrink-0 shadow-inner ${
                                    lead.isHot ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}>
                                    {lead.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className="font-bold text-white truncate text-base">{lead.name}</h4>
                                        {lead.isHot && <Zap size={12} className="text-rose-500 fill-rose-500 shrink-0" />}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-800 rounded-md border border-slate-700">
                                            {lead.status}
                                        </span>
                                        <span className="text-[10px] font-medium text-slate-500">
                                            {new Date(lead.lastContact).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                <button className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 active:bg-emerald-500 active:text-white transition-colors">
                                    <Phone size={18} fill="currentColor" />
                                </button>
                                <ChevronRight size={20} className="text-slate-600" />
                            </div>
                        </div>
                    ))}
                    
                    {activeCases.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-500 gap-4">
                            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
                                <Target size={32} className="opacity-20" />
                            </div>
                            <p className="text-xs font-bold">אין תיקים פעילים כרגע</p>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default MobileFrontWing;
