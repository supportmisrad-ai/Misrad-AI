'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Lead, ContentItem, Student, Campaign, Task, CalendarEvent } from './types';
import { 
    Flame, CircleCheck, Video, Target, Phone, ChevronRight, TriangleAlert, 
    Users, Coins, Plus, Calendar, Check,
    ArrowRight, SquareActivity, Zap,
    Sun, Timer, ArrowUpRight, Radio,
    HeartPulse, MessageSquare, PhoneCall
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './contexts/ToastContext';
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
  notifications?: Array<{
    id: string;
    title: string;
    description: string;
    time: string;
    type: 'success' | 'warning' | 'error' | 'info' | 'financial';
    isRead: boolean;
  }>;
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
    notifications = [],
    onLeadClick, 
    onNavigate, 
    onQuickAction
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [greeting, setGreeting] = useState('');
  
  const isAgent = user?.role === 'agent';

  useEffect(() => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting('בוקר טוב');
      else if (hour < 18) setGreeting('צהריים טובים');
      else setGreeting('ערב טוב');
  }, []);

  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

  const myLeads = useMemo(() => isAgent && user
    ? leads.filter(l => l.assignedAgentId === user.id || !l.assignedAgentId) 
    : leads, [leads, isAgent, user]);

  const hitListLeads = useMemo(() => myLeads.filter(l => (l.isHot || l.score > 70) && l.status !== 'won' && l.status !== 'lost'), [myLeads]);

  const myTasks = useMemo(() => {
    const todayMs = new Date().setHours(0,0,0,0);
    return tasks.filter(t => 
      t.status !== 'done' && 
      (user && (t.assigneeId === user.id || t.assigneeId === 'current')) &&
      new Date(t.dueDate).setHours(0,0,0,0) <= todayMs
    );
  }, [tasks, user]);

  const velocityList: VelocityItem[] = useMemo(() => {
      return [
          ...hitListLeads.map(l => ({ type: 'lead' as const, data: l, id: l.id, score: l.score, date: new Date(l.lastContact) })),
          ...myTasks.map(t => ({ type: 'task' as const, data: t, id: t.id, score: t.priority === 'critical' ? 100 : t.priority === 'high' ? 90 : 80, date: t.dueDate }))
      ].filter(item => !completedTaskIds.includes(item.id))
       .sort((a, b) => b.score - a.score);
  }, [hitListLeads, myTasks, completedTaskIds]);

  const nextMeeting = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return events
      .filter(e => e.date >= today)
      .sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
  }, [events]);

  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
  const myWonDeals = user ? leads.filter(l => l.status === 'won' && l.assignedAgentId === user.id).length : 0;
  const myCommission = user ? leads
    .filter(l => l.status === 'won' && l.assignedAgentId === user.id)
    .reduce((sum, l) => sum + (l.value * 0.05), 0) : 0;

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

  const pulseItems = useMemo(() => {
      const toPresentation = (n: (typeof notifications)[number]) => {
          if (n.type === 'success') {
              return { icon: CircleCheck, color: 'text-emerald-600', bg: 'bg-emerald-100' };
          }
          if (n.type === 'error') {
              return { icon: TriangleAlert, color: 'text-red-600', bg: 'bg-red-100' };
          }
          if (n.type === 'warning') {
              return { icon: TriangleAlert, color: 'text-amber-600', bg: 'bg-amber-100' };
          }
          if (n.type === 'financial') {
              return { icon: Coins, color: 'text-blue-600', bg: 'bg-blue-100' };
          }
          return { icon: Video, color: 'text-indigo-600', bg: 'bg-indigo-100' };
      };

      return (Array.isArray(notifications) ? notifications : []).slice(0, 5).map((n) => ({
          ...n,
          ...toPresentation(n),
      }));
  }, [notifications]);

  return (
    <>
      <div className="block md:hidden pb-20">
          <MobileFrontWing 
            user={user || null} 
            leads={leads}
            onQuickAction={onQuickAction} 
            onNavigate={onNavigate} 
            onLeadClick={onLeadClick}
            nextMeeting={nextMeeting}
            velocityScore={velocityScore}
          />
      </div>

      <div className="hidden md:flex flex-col gap-5 animate-fade-in pb-20 font-sans">

        {/* ── 1. Greeting Bar ── */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-nexus-gradient text-white flex items-center justify-center font-black text-lg shadow-lg shadow-primary/20">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {greeting}, {user?.name?.split(' ')[0]}.
              </h1>
              <p className="text-sm text-slate-500 font-medium mt-0.5">
                {velocityList.length > 0 ? `${velocityList.length} פריטים ממתינים לטיפול` : 'אין משימות דחופות כרגע'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onQuickAction('lead')}
              className="h-10 px-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black active:scale-95 transition-all shadow-sm"
            >
              <Plus size={16} strokeWidth={2.5} />
              ליד חדש
            </button>
            <button
              onClick={() => onNavigate('comms')}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              <PhoneCall size={16} />
              מרכזיה
            </button>
            <button
              onClick={() => onNavigate('focus_mode')}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              <Timer size={16} />
              מיקוד
            </button>
            <button
              onClick={() => onNavigate('briefing')}
              className="h-10 px-4 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-700 hover:bg-amber-100 active:scale-95 transition-all"
            >
              <Sun size={16} />
              תדריך בוקר
            </button>
          </div>
        </div>

        {/* ── 2. KPI Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Velocity Gauge */}
          <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 flex items-center gap-4 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="relative w-14 h-14 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" stroke="#E2E8F0" strokeWidth="6" fill="transparent" />
                <circle
                  cx="28" cy="28" r="22"
                  stroke={velocityScore > 80 ? '#10b981' : velocityScore > 50 ? '#f59e0b' : '#f43f5e'}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 22}`}
                  strokeDashoffset={2 * Math.PI * 22 - (2 * Math.PI * 22 * velocityScore) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-[1.2s] ease-out"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-base font-black font-mono text-slate-800">
                {velocityScore}
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-slate-400">ביצועים</div>
              <div className="text-sm font-black text-slate-700 mt-0.5">
                {velocityScore > 80 ? 'מצוין' : velocityScore > 50 ? 'סביר' : 'דורש תשומת לב'}
              </div>
            </div>
          </div>

          {/* Revenue / Commission */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <Coins size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400">{isAgent ? 'עמלה' : 'הכנסה'}</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              ₪{(isAgent ? myCommission : totalRevenue).toLocaleString()}
            </div>
          </div>

          {/* Total Leads */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <Users size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400">{isAgent ? 'סגירות' : 'קמפיינים'}</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {isAgent ? myWonDeals : activeCampaigns}
            </div>
          </div>

          {/* Won Deals */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-slate-300 transition-all group">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <Target size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400">סגירות</span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 tracking-tight">
              {myWonDeals}
            </div>
          </div>

          {/* Needs Attention */}
          <div className={`rounded-2xl border p-5 hover:shadow-md transition-all group ${
            hitListLeads.length > 0 ? 'bg-rose-50/60 border-rose-200 hover:border-rose-300' : 'bg-white border-slate-200 hover:border-slate-300'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                hitListLeads.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'
              }`}>
                <Flame size={16} />
              </div>
              <span className="text-xs font-bold text-slate-400">לטיפול מיידי</span>
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${
              hitListLeads.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}>
              {hitListLeads.length}
            </div>
          </div>
        </div>

        {/* ── 3. Main Content Area ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* ── Left Column: Next Actions ── */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden hover:shadow-sm transition-shadow">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-nexus-gradient text-white flex items-center justify-center shadow-sm">
                  <Zap size={18} fill="currentColor" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">הפעולות הבאות</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">סדר עדיפויות מבוסס AI</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-bold text-slate-400">{completedTaskIds.length}/{velocityList.length + completedTaskIds.length}</span>
                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedTaskIds.length / (velocityList.length + completedTaskIds.length || 1)) * 100}%` }}
                    className="h-full bg-nexus-gradient rounded-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[520px]">
              <AnimatePresence mode="popLayout">
                {velocityList.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center text-center py-16 px-6"
                  >
                    <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 text-emerald-500 ring-1 ring-emerald-100">
                      <Check size={32} strokeWidth={3} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800">השולחן נקי!</h4>
                    <p className="text-slate-500 font-medium text-sm max-w-xs mt-1">כל המשימות הדחופות טופלו. זמן מצוין ליזום שיחות מעקב.</p>
                  </motion.div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {velocityList.map((item, index) => {
                      const isTask = item.type === 'task';
                      const data = item.data;
                      const isFirst = index === 0;

                      return (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -40, height: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.03 }}
                          onClick={() => !isTask ? onLeadClick(data as Lead) : null}
                          className={`group flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors ${
                            isFirst ? 'bg-indigo-50/40' : 'hover:bg-slate-50'
                          }`}
                        >
                          {/* Complete button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleComplete(item.id); }}
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-200 ${
                              isFirst
                                ? 'bg-slate-900 border-slate-800 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-300 hover:bg-emerald-500 hover:text-white hover:border-emerald-500'
                            }`}
                          >
                            <Check size={16} strokeWidth={2.5} />
                          </button>

                          {/* Left accent */}
                          <div className={`w-1 self-stretch rounded-full shrink-0 ${
                            isTask ? 'bg-indigo-400' : item.score >= 90 ? 'bg-rose-400' : 'bg-slate-200'
                          }`} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              {isTask ? (
                                <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">משימה</span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">ליד</span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400">
                                {isTask ? formatDate((data as Task).dueDate) : (data as Lead).company || formatRelativeTime((data as Lead).createdAt)}
                              </span>
                            </div>
                            <h4 className={`font-bold text-slate-900 truncate group-hover:text-primary transition-colors ${isFirst ? 'text-base' : 'text-sm'}`}>
                              {isTask ? (data as Task).title : (data as Lead).name}
                            </h4>
                            {!isTask && (data as Lead).playbookStep && (
                              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                                {getPlaybookIcon((data as Lead).playbookStep)}
                                {(data as Lead).playbookStep}
                              </p>
                            )}
                          </div>

                          {/* Score + Actions */}
                          <div className="hidden lg:flex items-center gap-3 shrink-0">
                            <div className={`text-lg font-black font-mono ${item.score >= 90 ? 'text-rose-500' : 'text-slate-400'}`}>
                              {item.score}
                            </div>
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!isTask && (
                                <>
                                  <button className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                                    <Phone size={14} />
                                  </button>
                                  <button className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                                    <MessageSquare size={14} />
                                  </button>
                                </>
                              )}
                              <button className="p-2 bg-slate-900 text-white rounded-lg hover:bg-black transition-colors">
                                <ArrowRight size={14} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={() => onNavigate('tasks')}
              className="px-6 py-3.5 text-center text-xs font-bold text-slate-400 hover:text-primary hover:bg-slate-50 transition-all border-t border-slate-100 group"
            >
              ניהול משימות מלא <ChevronRight size={12} className="inline mr-1 transition-transform group-hover:-translate-x-1" />
            </button>
          </div>

          {/* ── Right Column: Sidebar ── */}
          <div className="lg:col-span-2 flex flex-col gap-5">

            {/* Next Meeting */}
            {nextMeeting && (
              <div
                onClick={() => onNavigate('calendar')}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                    <Calendar size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-slate-400">הפגישה הבאה</div>
                    <div className="text-sm font-black text-slate-900">{nextMeeting.time} · {nextMeeting.dayName}</div>
                  </div>
                  <ArrowUpRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                  <div className="font-bold text-slate-800 text-sm">{nextMeeting.leadName}</div>
                  {nextMeeting.location && (
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Radio size={10} /> {nextMeeting.type === 'zoom' ? 'זום' : nextMeeting.location}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* System Pulse */}
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden flex-1 hover:shadow-sm transition-shadow">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  <HeartPulse size={16} className="text-indigo-500" />
                  סטטוס מערכת
                </h3>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600">פעיל</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
                {pulseItems.length === 0 ? (
                  <div className="text-center py-12 px-6">
                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <SquareActivity size={24} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">הכל מעודכן</h4>
                    <p className="text-xs text-slate-400 mt-1">אין התראות חדשות כרגע</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {pulseItems.map((item) => (
                      <div key={String(item.id)} className="flex gap-3 px-5 py-3.5 hover:bg-slate-50/50 transition-colors group">
                        <div className={`w-8 h-8 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0 transition-transform group-hover:scale-105`}>
                          <item.icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-indigo-600 transition-colors">{item.title}</h4>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigate('notifications')}
                className="px-5 py-3 text-center text-xs font-bold text-indigo-600 hover:bg-indigo-50/50 transition-all border-t border-slate-100 group"
              >
                כל ההתראות <ArrowRight size={12} className="inline mr-1" />
              </button>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => onNavigate('sales_pipeline')}
                className="bg-white rounded-2xl border border-slate-200 p-4 text-center hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
              >
                <div className="text-2xl font-black font-mono text-indigo-700 group-hover:scale-110 transition-transform">{myWonDeals}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">עסקאות שנסגרו</div>
              </div>
              <div
                onClick={() => onNavigate('marketing')}
                className="bg-white rounded-2xl border border-slate-200 p-4 text-center hover:shadow-md hover:border-rose-200 transition-all cursor-pointer group"
              >
                <div className="text-2xl font-black font-mono text-rose-700 group-hover:scale-110 transition-transform">{activeCampaigns}</div>
                <div className="text-[11px] font-bold text-slate-400 mt-1">קמפיינים פעילים</div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
};

export default SystemCommandCenter;

