'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Video, MapPin, Plus, ChevronLeft, ChevronRight, RefreshCw, Phone, ExternalLink, Check, Users, Zap } from 'lucide-react';
import { Lead, CalendarEvent } from '../../types';
import { Skeleton } from '@/components/ui/skeletons';

interface CalendarViewProps {
  leads: Lead[];
  events: CalendarEvent[];
  onAddEvent: (event: CalendarEvent) => void;
  onNewMeetingClick: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ leads, events, onAddEvent, onNewMeetingClick }) => {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const toDate = (value: unknown) => {
    const d = value instanceof Date ? value : new Date(String(value || ''));
    return Number.isFinite(d.getTime()) ? d : new Date();
  };

  const startOfWeek = () => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  };

  const toISODate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const weekStart = startOfWeek();
  const DAYS = Array.from({ length: 5 }, (_, idx) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + idx);
    return {
      name: dayNames[d.getDay()] || '',
      date: String(d.getDate()),
      iso: toISODate(d),
    };
  });

  const displayEvents = events
    .map((e) => {
      const start = toDate((e as any).start);
      const end = toDate((e as any).end);
      return {
        id: e.id,
        title: e.title,
        start,
        end,
        dayName: start.toLocaleDateString('he-IL', { weekday: 'long' }),
        iso: toISODate(start),
        timeLabel: start.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
      };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const upcomingMeetings = [...displayEvents];

  const handleSyncGCal = () => {
      setIsSyncing(true);
      setSyncSuccess(false);
      setTimeout(() => {
          setIsSyncing(false);
          setSyncSuccess(true);
          setTimeout(() => setSyncSuccess(false), 3000);
      }, 2000);
  };

  const handleEnterZoom = (meetingId: string) => {
      return;
  };

  const renderMonthView = () => {
    const weekDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    const daysInMonth = Array.from({ length: 35 }, (_, i) => {
        const day = i + 1;
        return day <= 31 ? day : null;
    });

    return (
        <div className="flex flex-col h-full bg-white animate-fade-in rounded-b-3xl">
             {/* Headers */}
             <div className="grid grid-cols-7 border-b border-slate-50">
                {weekDays.map(d => (
                    <div key={d} className="py-3 text-center text-xs font-bold text-slate-400">
                        {d}
                    </div>
                ))}
             </div>
             
             {/* Grid */}
             <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-slate-50 overflow-hidden rounded-b-3xl">
                {daysInMonth.map((day, i) => {
                    if (!day) return <div key={i} className="bg-white"></div>;
                    
                    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                    const dateObj = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
                    const dateStr = toISODate(dateObj);
                    const dayEvents = displayEvents.filter(e => e.iso === dateStr);
                    const isToday = dateStr === toISODate(new Date());

                    return (
                        <div key={i} className="bg-white p-2 relative group hover:bg-slate-50/50 transition-colors flex flex-col gap-1 min-h-[80px]">
                            <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1 ${isToday ? 'bg-black text-white' : 'text-slate-700'}`}>
                                {day}
                            </div>
                            
                            <div className="flex-1 w-full space-y-1 overflow-y-auto custom-scrollbar">
                                {dayEvents.map(ev => (
                                    <div 
                                        key={ev.id} 
                                        className="px-2 py-1 rounded text-[9px] font-bold truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1 bg-slate-50 text-slate-700"
                                    >
                                       <div className="w-1 h-1 rounded-full bg-slate-500"></div>
                                       {ev.timeLabel} {ev.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
             </div>
        </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto h-full flex flex-col animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Calendar className="text-primary" strokeWidth={2.5} />
            הלו"ז שלי
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
                onClick={handleSyncGCal}
                disabled={isSyncing}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-1 md:flex-none justify-center border ${
                    syncSuccess 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
                {isSyncing ? <Skeleton className="w-4 h-4 rounded-full" /> : syncSuccess ? <Check size={16} /> : <RefreshCw size={16} />}
                <span className="hidden md:inline">
                    {isSyncing ? 'מסנכרן...' : syncSuccess ? 'פיקס!' : 'סנכרון אירועים'}
                </span>
            </button>

            <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200/50 shadow-inner">
                <button 
                    onClick={() => setView('week')}
                    className={`px-4 py-1.5 rounded-lg text-base font-bold transition-all ${view === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    שבוע
                </button>
                <button 
                    onClick={() => setView('month')}
                    className={`px-4 py-1.5 rounded-lg text-base font-bold transition-all ${view === 'month' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    חודש
                </button>
            </div>
            
            <button 
                onClick={onNewMeetingClick}
                className="bg-onyx-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-onyx-900/20 hover:bg-black transition-all hover:-translate-y-0.5 flex items-center gap-2 flex-1 md:flex-none justify-center"
            >
                <Plus size={18} />
                <span className="hidden md:inline">קבע פגישה</span>
                <span className="md:hidden">חדש</span>
            </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-8 flex-1 min-h-0">
        
        {/* Main Calendar Grid - HIDDEN ON MOBILE (Too wide) */}
        <div className="hidden md:flex flex-1 ui-card flex-col overflow-hidden min-h-[500px] border border-slate-100 shadow-sm">
            {/* Calendar Header Navigation */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-xl">
                    <span>{new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex gap-2">
                    <button className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all text-slate-500 hover:text-slate-900"><ChevronRight size={18} /></button>
                    <button className="px-4 py-1 text-xs font-bold bg-white border border-slate-200 rounded-xl text-slate-600 hover:border-slate-300 transition-colors">היום</button>
                    <button className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition-all text-slate-500 hover:text-slate-900"><ChevronLeft size={18} /></button>
                </div>
            </div>

            {view === 'month' ? renderMonthView() : (
                /* Week View */
                <div className="flex-1 overflow-x-auto custom-scrollbar bg-white">
                    <div className="grid grid-cols-5 divide-x divide-x-reverse divide-slate-50 min-h-[600px] min-w-[800px] h-full">
                        {DAYS.map((day, index) => (
                            <div key={day.name} className="flex flex-col h-full bg-white group/col">
                                <div className={`p-4 text-center border-b border-slate-50 ${index === 3 ? 'bg-rose-50/10' : ''}`}>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{day.name}</div>
                                    <div className={`text-2xl font-bold ${index === 3 ? 'text-white bg-black w-10 h-10 rounded-full flex items-center justify-center mx-auto shadow-lg' : 'text-slate-800'}`}>
                                        {day.date}
                                    </div>
                                </div>
                                <div className={`flex-1 p-3 space-y-3 relative transition-colors ${index === 3 ? 'bg-rose-50/5' : 'group-hover/col:bg-slate-50/20'}`}>
                                    {/* Minimalist Time Lines */}
                                    <div className="absolute inset-0 flex flex-col pointer-events-none">
                                        {[...Array(12)].map((_, i) => (
                                            <div key={i} className="flex-1 border-b border-slate-50"></div>
                                        ))}
                                    </div>

                                    {/* Events */}
                                    {displayEvents.filter(e => e.iso === day.iso).map(event => (
                                        <div 
                                            key={event.id} 
                                            className="p-3 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 relative overflow-hidden group/event border shadow-sm bg-white border-slate-100"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="text-[10px] font-bold px-1.5 rounded bg-white text-slate-700">{event.timeLabel}</span>
                                            </div>
                                            <h4 className="font-bold text-slate-900 text-xs mb-0.5 leading-tight">{event.title}</h4>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Sidebar - Upcoming List (Becomes Main View on Mobile) */}
        <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0 h-full">
            <div className="ui-card overflow-hidden flex flex-col h-full max-h-[600px] border border-slate-100 shadow-none md:shadow-sm">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white">
                    <h3 className="font-bold text-slate-900 text-lg">פגישות קרובות</h3>
                    <button className="text-xs text-primary font-bold hover:underline">לכל הלו"ז</button>
                </div>
                
                <div className="p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50 flex-1">
                    {upcomingMeetings.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <p className="text-sm font-medium">אין פגישות קרובות</p>
                        </div>
                    ) : (
                        upcomingMeetings.map((meeting, idx) => {
                            const isNext = idx === 0;
                            
                            return (
                                <div key={meeting.id} className="relative">
                                    {isNext ? (
                                        // Highlight Card
                                        <div className="rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group bg-onyx-900">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">הבא בתור</span>
                                                    </div>
                                                    <span className="text-white font-mono text-xl font-bold">{meeting.timeLabel}</span>
                                                </div>
                                                <h4 className="text-2xl font-bold mb-6">{meeting.title}</h4>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button 
                                                        onClick={() => handleEnterZoom(meeting.id)}
                                                        className="bg-white text-slate-900 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-rose-50 transition-colors"
                                                    >
                                                        <Video size={14} /> פתיחה
                                                    </button>
                                                    <button className="bg-slate-800 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors border border-slate-700">
                                                        <Phone size={14} /> התקשר
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        // Standard List Item
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 hover:border-slate-300 transition-all group flex gap-4 items-center">
                                            <div className="flex flex-col items-center min-w-[3rem]">
                                                <span className="text-xs font-bold text-slate-400">{meeting.dayName}</span>
                                                <span className="font-mono font-bold text-slate-800 text-lg">{meeting.timeLabel}</span>
                                            </div>
                                            <div className="w-px h-8 bg-slate-100"></div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 text-sm group-hover:text-primary transition-colors">{meeting.title}</h4>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

