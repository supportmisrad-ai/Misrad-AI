
import React, { useMemo } from 'react';
import { 
    Zap, Calendar, BarChart2, Plus, 
    ArrowRight, ChevronRight, Activity, 
    TrendingUp, Shield, Star, Phone, Video,
    User, Gauge
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
            .sort((a,b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
            .slice(0, 10); // Show top 10 recent active cases
    }, [leads]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    };

    return (
        <div className="flex flex-col space-y-6 animate-fade-in">
            
            {/* 1. Hero Cockpit */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-2xl isolate">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 -z-10 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 -z-10"></div>

                {/* Top Tag */}
                <div className="flex items-center justify-between mb-4">
                    <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-rose-300 shadow-sm">
                        <Activity size={12} className="animate-pulse" /> Front Wing
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('he-IL')}</span>
                    </div>
                </div>

                {/* Big Title */}
                <h1 className="text-3xl font-black mb-3 leading-tight">
                    {getGreeting()}, <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-indigo-400">
                        {user.name.split(' ')[0]}.
                    </span>
                </h1>

                {/* Live Context Paragraph */}
                <div className="space-y-3 mb-6">
                    <p className="text-sm text-slate-300 font-medium leading-relaxed">
                        יש לך <span className="text-white font-bold">{stats.hot} לידים חמים</span> שממתינים לשיחה. 
                        {stats.hot > 0 ? ' הזמן הנכון לסגור עסקה הוא עכשיו.' : ' המערכת סורקת הזדמנויות חדשות.'}
                    </p>
                </div>

                {/* Next Meeting Card */}
                {nextMeeting && (
                    <div className="mb-6 bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 relative group active:scale-95 transition-transform" onClick={() => onNavigate('calendar')}>
                        <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-bold uppercase bg-rose-500 px-2 py-0.5 rounded-full animate-pulse shadow-lg shadow-rose-500/40">עכשיו</span>
                        </div>
                        <div className="text-xs font-bold text-indigo-300 uppercase mb-1">הפגישה הבאה</div>
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold">{nextMeeting.time}</h3>
                            <span className="text-sm text-slate-300">|</span>
                            <h3 className="text-lg font-bold truncate">{nextMeeting.leadName}</h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-300">
                            <span className="flex items-center gap-1"><Video size={12} /> {nextMeeting.type === 'zoom' ? 'Zoom' : 'Frontal'}</span>
                            <span className="flex items-center gap-1 text-emerald-300 font-bold"><ArrowRight size={12} /> כנס לפגישה</span>
                        </div>
                    </div>
                )}

                {/* Action Buttons (Stacked) */}
                <div className="space-y-3 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <button 
                            onClick={() => onNavigate('comms')}
                            className="bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-95 transition-transform border border-emerald-500/30"
                        >
                            <Phone size={18} className="fill-emerald-100 text-emerald-100" />
                            מרכזיה
                        </button>
                        <button 
                            onClick={() => onNavigate('focus_mode')}
                            className="bg-white text-slate-900 py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-white/10 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <Zap size={18} className="text-indigo-600 fill-indigo-600" />
                            Focus
                        </button>
                    </div>
                    <button 
                        onClick={() => onQuickAction('lead')}
                        className="w-full bg-white/10 border border-white/10 text-white py-3.5 rounded-xl font-bold text-sm backdrop-blur-md flex items-center justify-center gap-2 active:scale-95 transition-transform hover:bg-white/20"
                    >
                        <Plus size={18} />
                        הוסף ליד חדש
                    </button>
                </div>

                {/* Live Stats Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <TrendingUp size={10} /> {stats.conversionRate}% המרות
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 ${velocityScore > 80 ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-amber-500/20 border-amber-500/30 text-amber-300'}`}>
                        <Gauge size={10} /> Velocity {velocityScore}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                        <Star size={10} /> {stats.won} סגירות
                    </span>
                </div>

                {/* Abstract Viz at bottom */}
                <div className="relative h-16 w-full mt-4 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-xl flex items-center justify-center border border-white/5 overflow-hidden">
                    <div className="flex gap-1 items-end h-8">
                        {[40, 70, 50, 90, 60, 80, 50, 75, 45, 60].map((h, i) => (
                            <div 
                                key={i} 
                                className="w-1.5 bg-rose-500 rounded-t-sm animate-pulse" 
                                style={{ 
                                    height: `${h}%`, 
                                    opacity: 0.6 + (i % 3) * 0.1,
                                    animationDuration: `${0.8 + (i % 5) * 0.2}s`
                                }}
                            ></div>
                        ))}
                    </div>
                    <span className="absolute bottom-1 right-2 text-[9px] text-slate-500 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                        LIVE
                    </span>
                </div>
            </div>

            {/* 2. Active Cases Strip */}
            <div>
                <div className="flex items-center justify-between px-2 mb-3">
                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                        <Activity size={16} className="text-indigo-600" />
                        תיקים בטיפול
                    </h3>
                    <button 
                        onClick={() => onNavigate('sales_hub')}
                        className="text-xs text-indigo-600 font-bold flex items-center gap-1"
                    >
                        לרשימה המלאה <ChevronRight size={12} />
                    </button>
                </div>
                
                <div className="flex gap-3 overflow-x-auto pb-4 px-1 no-scrollbar snap-x">
                    {/* Add New Case Button */}
                    <div 
                        onClick={() => onQuickAction('lead')}
                        className="snap-center shrink-0 w-24 h-24 flex flex-col items-center justify-center p-3 gap-2 border-2 border-dashed border-slate-300 rounded-2xl text-slate-400 active:scale-95 transition-transform bg-slate-50"
                    >
                        <Plus size={24} />
                        <span className="text-[10px] font-bold">חדש</span>
                    </div>

                    {/* Active Leads Cards */}
                    {activeCases.map((lead) => (
                        <div 
                            key={lead.id} 
                            onClick={() => onLeadClick(lead)}
                            className="snap-center shrink-0 w-24 h-24 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-3 gap-2 active:scale-95 transition-transform relative overflow-hidden"
                        >
                            {lead.isHot && <div className="absolute top-0 right-0 w-3 h-3 bg-rose-500 rounded-bl-lg"></div>}
                            
                            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-200">
                                {lead.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate w-full text-center leading-tight">
                                {lead.name.split(' ')[0]}
                            </span>
                            <span className="text-[9px] text-slate-400 truncate w-full text-center font-mono">
                                {lead.status}
                            </span>
                        </div>
                    ))}
                    
                    {activeCases.length === 0 && (
                        <div className="flex items-center justify-center w-full py-4 text-slate-400 text-xs">
                            אין תיקים פעילים כרגע
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default MobileFrontWing;
