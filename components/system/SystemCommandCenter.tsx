'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Lead, ContentItem, Student, Campaign, CalendarEvent } from './types';
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
  onQuickAction: (action: 'lead' | 'meeting') => void;
}

type VelocityItem = { type: 'lead'; data: Lead; id: string; score: number; date: Date };

const SystemCommandCenter: React.FC<SystemCommandCenterProps> = ({ 
    leads, 
    content = [], 
    students = [], 
    campaigns = [],
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

  const [completedIds, setCompletedIds] = useState<string[]>([]);

  const myLeads = useMemo(() => isAgent && user
    ? leads.filter(l => l.assignedAgentId === user.id || !l.assignedAgentId) 
    : leads, [leads, isAgent, user]);

  const hitListLeads = useMemo(() => myLeads.filter(l => (l.isHot || l.score > 70) && l.status !== 'won' && l.status !== 'lost'), [myLeads]);

  const velocityList: VelocityItem[] = useMemo(() => {
      return hitListLeads
          .map(l => ({ type: 'lead' as const, data: l, id: l.id, score: l.score, date: new Date(l.lastContact) }))
          .filter(item => !completedIds.includes(item.id))
          .sort((a, b) => b.score - a.score);
  }, [hitListLeads, completedIds]);

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
      const initialLoad = velocityList.length + completedIds.length;
      if (initialLoad === 0) return 100;
      return Math.round(50 + ((completedIds.length / initialLoad) * 50));
  }, [velocityList.length, completedIds.length]);

  const handleComplete = (id: string) => {
      setCompletedIds(prev => [...prev, id]);
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

        {/* ── 1. Compact Header ── */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-white/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg shrink-0">
              {user?.name?.charAt(0) || '?'}
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                {greeting}, {user?.name?.split(' ')[0]} <span className="inline-block animate-bounce">👋</span>
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-1">
                {velocityList.length > 0 ? `${velocityList.length} משימות דחופות` : 'הכל מעודכן'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onQuickAction('lead')}
              className="h-9 px-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-black active:scale-95 transition-all shadow-md"
            >
              <Plus size={14} strokeWidth={3} />
              ליד חדש
            </button>
            <button
              onClick={() => onNavigate('comms')}
              className="h-9 px-3 inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all"
            >
              <PhoneCall size={14} />
              מרכזיה
            </button>
            <button
              onClick={() => onNavigate('briefing')}
              className="h-9 px-3 inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 text-xs font-bold text-amber-700 hover:bg-amber-100 transition-all"
            >
              <Sun size={14} />
              תדריך
            </button>
          </div>
        </div>

        {/* ── 2. Compact KPI Strip ── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Velocity Gauge */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 hover:shadow-md transition-all">
            <div className="relative w-10 h-10 shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" stroke="#f1f5f9" strokeWidth="6" fill="transparent" />
                <circle
                  cx="28" cy="28" r="24"
                  stroke={velocityScore > 80 ? '#10b981' : velocityScore > 50 ? '#f59e0b' : '#f43f5e'}
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={2 * Math.PI * 24 - (2 * Math.PI * 24 * velocityScore) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black font-mono text-slate-800">
                {velocityScore}
              </span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase">ביצועים</div>
              <div className={`text-xs font-black ${velocityScore > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {velocityScore > 80 ? 'מצוין' : 'סביר'}
              </div>
            </div>
          </div>

          {/* Revenue */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{isAgent ? 'עמלה' : 'הכנסה'}</div>
            <div className="text-xl font-black font-mono text-slate-900 tracking-tighter">
              ₪{(isAgent ? myCommission : totalRevenue).toLocaleString()}
            </div>
          </div>

          {/* Leads */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">לידים</div>
            <div className="text-xl font-black font-mono text-slate-900 tracking-tighter">
              {isAgent ? myWonDeals : activeCampaigns}
            </div>
          </div>

          {/* Won */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-md transition-all">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">סגירות</div>
            <div className="text-xl font-black font-mono text-slate-900 tracking-tighter">
              {myWonDeals}
            </div>
          </div>

          {/* Immediate */}
          <div className={`rounded-2xl border p-4 hover:shadow-md transition-all ${hitListLeads.length > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-200'}`}>
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">דחוף</div>
            <div className={`text-xl font-black font-mono tracking-tighter ${hitListLeads.length > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
              {hitListLeads.length}
            </div>
          </div>
        </div>

        {/* ── 3. Balanced Content Area ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Next Actions */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden h-[420px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Zap size={16} fill="currentColor" className="text-amber-400" />
                פעולות הבאות
              </h3>
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(completedIds.length / (velocityList.length + completedIds.length || 1)) * 100}%` }}
                  className="h-full bg-slate-900 rounded-full"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {velocityList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <Check size={32} className="text-emerald-500 mb-2" />
                    <h4 className="text-base font-black text-slate-800">השולחן נקי</h4>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {velocityList.map((item, index) => (
                      <motion.div
                        key={item.id}
                        layout
                        className="group flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => onLeadClick(item.data)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleComplete(item.id); }}
                          className="w-8 h-8 rounded-xl flex items-center justify-center border border-slate-200 text-slate-200 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <Check size={14} strokeWidth={3} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{item.data.name}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">{item.data.playbookStep || 'ליד חם'}</p>
                        </div>
                        <div className="text-xs font-black font-mono text-slate-400">{item.score}</div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Meeting */}
            {nextMeeting && (
              <div onClick={() => onNavigate('calendar')} className="bg-white rounded-3xl border border-slate-200 p-5 hover:shadow-md cursor-pointer group">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={18} className="text-indigo-600" />
                  <div className="text-[11px] font-bold text-slate-400">פגישה הבאה</div>
                </div>
                <div className="text-sm font-black text-slate-900">{nextMeeting.time} · {nextMeeting.leadName}</div>
              </div>
            )}

            {/* System Status */}
            <div className="bg-white rounded-3xl border border-slate-200 flex flex-col overflow-hidden flex-1 h-[200px]">
              <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                <h3 className="font-bold text-slate-800 text-xs">סטטוס</h3>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-600">Online</span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                {pulseItems.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors rounded-2xl">
                    <div className={`w-7 h-7 rounded-lg ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                      <item.icon size={14} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-[11px] truncate">{item.title}</h4>
                      <p className="text-[10px] text-slate-500 truncate">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default SystemCommandCenter;

