'use client';

import React, { useMemo } from 'react';
import { 
    Zap, Plus, 
    ChevronRight, SquareActivity, 
    TrendingUp, Star, Phone, Video,
    ArrowRight, Flame, Calendar, Target
} from 'lucide-react';
import { UserProfile, CalendarEvent, Lead } from './types';

interface MobileFrontWingProps {
    user?: UserProfile | null;
    leads: Lead[];
    onQuickAction: (action: 'lead' | 'meeting') => void;
    onNavigate: (tab: string) => void;
    onLeadClick: (lead: Lead) => void;
    nextMeeting?: CalendarEvent;
    velocityScore?: number;
}

const MobileFrontWing: React.FC<MobileFrontWingProps> = ({ user, leads, onQuickAction, onNavigate, onLeadClick, nextMeeting, velocityScore = 100 }) => {
    
    const stats = useMemo(() => {
        const total = leads.length;
        const won = leads.filter(l => l.status === 'סגור').length;
        const activeLeadsCount = leads.filter(l => l.status !== 'סגור' && l.status !== 'לא רלוונטי').length;
        const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
        const hot = leads.filter(l => l.isHot && l.status !== 'סגור' && l.status !== 'לא רלוונטי').length;
        
        return { total, won, activeLeadsCount, conversionRate, hot };
    }, [leads]);

    const activeCases = useMemo(() => {
        return leads
            .filter(l => l.status !== 'סגור' && l.status !== 'לא רלוונטי')
            .sort((a,b) => new Date(b.lastContact).getTime() - new Date(a.lastContact).getTime())
            .slice(0, 10);
    }, [leads]);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'בוקר טוב';
        if (hour < 18) return 'צהריים טובים';
        return 'ערב טוב';
    };

    const firstName = (user?.name || 'משתמש').split(' ')[0] || 'משתמש';

    return (
        <div className="flex flex-col gap-4 animate-fade-in px-1">
            
            {/* 1. Greeting + Primary Action */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-black text-slate-900 leading-tight">
                        {getGreeting()}, {firstName}.
                    </h1>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {stats.hot > 0 ? `${stats.hot} לידים חמים ממתינים` : 'אין פריטים דחופים'}
                    </p>
                </div>
                <button
                    onClick={() => onQuickAction('lead')}
                    className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm active:scale-90 transition-transform"
                >
                    <Plus size={20} strokeWidth={2.5} />
                </button>
            </div>

            {/* 2. Quick Actions Row */}
            <div className="grid grid-cols-3 gap-2.5">
                <button
                    onClick={() => onNavigate('comms')}
                    className="flex flex-col items-center gap-1.5 py-3 bg-white rounded-xl border border-slate-200 active:scale-95 transition-transform shadow-sm"
                >
                    <Phone size={18} className="text-emerald-600" />
                    <span className="text-[11px] font-bold text-slate-700">מרכזיה</span>
                </button>
                <button
                    onClick={() => onNavigate('focus_mode')}
                    className="flex flex-col items-center gap-1.5 py-3 bg-white rounded-xl border border-slate-200 active:scale-95 transition-transform shadow-sm"
                >
                    <Zap size={18} className="text-indigo-600" />
                    <span className="text-[11px] font-bold text-slate-700">מיקוד</span>
                </button>
                <button
                    onClick={() => onNavigate('sales_pipeline')}
                    className="flex flex-col items-center gap-1.5 py-3 bg-white rounded-xl border border-slate-200 active:scale-95 transition-transform shadow-sm"
                >
                    <Target size={18} className="text-rose-600" />
                    <span className="text-[11px] font-bold text-slate-700">צנרת</span>
                </button>
            </div>

            {/* 3. KPI Cards */}
            <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">המרות</span>
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900">{stats.conversionRate}%</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Star size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">סגירות</span>
                    </div>
                    <div className="text-xl font-black font-mono text-slate-900">{stats.won}</div>
                </div>
                <div className={`rounded-xl border p-4 shadow-sm ${stats.hot > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats.hot > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
                            <Flame size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">לטיפול מיידי</span>
                    </div>
                    <div className={`text-xl font-black font-mono ${stats.hot > 0 ? 'text-rose-700' : 'text-slate-900'}`}>{stats.hot}</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <SquareActivity size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">דופק</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-xl font-black font-mono text-slate-900">{velocityScore}</div>
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                    width: `${velocityScore}%`,
                                    backgroundColor: velocityScore > 80 ? '#10b981' : velocityScore > 50 ? '#f59e0b' : '#f43f5e'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Next Meeting */}
            {nextMeeting && (
                <div
                    onClick={() => onNavigate('calendar')}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm active:scale-[0.98] transition-transform"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Calendar size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-slate-400">הפגישה הבאה</div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-black text-slate-900">{nextMeeting.time}</span>
                                <span className="text-xs text-slate-400">·</span>
                                <span className="text-sm font-bold text-slate-700 truncate">{nextMeeting.leadName}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <Video size={10} /> {nextMeeting.type === 'zoom' ? 'זום' : nextMeeting.location || 'פרונטלי'}
                            </div>
                        </div>
                        <ArrowRight size={16} className="text-slate-300 shrink-0" />
                    </div>
                </div>
            )}

            {/* 5. Active Cases Strip */}
            <div>
                <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-sm font-bold text-slate-700">תיקים בטיפול</h3>
                    <button
                        onClick={() => onNavigate('sales_leads')}
                        className="text-xs text-indigo-600 font-bold flex items-center gap-0.5"
                    >
                        הכל <ChevronRight size={12} />
                    </button>
                </div>
                
                <div className="flex gap-2.5 overflow-x-auto pb-3 no-scrollbar snap-x">
                    <div 
                        onClick={() => onQuickAction('lead')}
                        className="snap-center shrink-0 w-[72px] h-[88px] flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-400 active:scale-95 transition-transform bg-slate-50/50"
                    >
                        <Plus size={20} />
                        <span className="text-[9px] font-bold">הוסף</span>
                    </div>

                    {activeCases.map((lead) => (
                        <div 
                            key={lead.id} 
                            onClick={() => onLeadClick(lead)}
                            className="snap-center shrink-0 w-[72px] h-[88px] bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center p-2 gap-1 active:scale-95 transition-transform relative"
                        >
                            {lead.isHot && (
                                <div className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                            )}
                            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs border border-slate-200">
                                {lead.name.charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-800 truncate w-full text-center leading-tight">
                                {lead.name.split(' ')[0]}
                            </span>
                        </div>
                    ))}
                    
                    {activeCases.length === 0 && (
                        <div className="flex items-center justify-center w-full py-4 text-slate-400 text-xs">
                            אין תיקים פעילים
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default MobileFrontWing;
