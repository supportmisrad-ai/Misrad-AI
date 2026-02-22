'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  MapPin, Navigation, Phone, Clock, CheckCircle2, AlertTriangle,
  User, ChevronDown, MoreHorizontal, Zap, Route, Circle,
  RefreshCw, Filter, X, ChevronUp, Car, Coffee, Briefcase,
  Home, Star, MessageSquare
} from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────────────── Types ───────────────── */

type AgentStatus = 'available' | 'en_route' | 'on_site' | 'break' | 'offline';

interface FieldVisit {
  id: string;
  clientName: string;
  address: string;
  time: string;
  status: 'completed' | 'current' | 'upcoming';
  notes?: string;
}

interface FieldTeamMember {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  status: AgentStatus;
  area: string;
  currentClient?: string;
  currentAddress?: string;
  completedToday: number;
  remainingToday: number;
  lastUpdate: string;
  lat: number;
  lng: number;
  visits: FieldVisit[];
}

/* ───────────────── Mock Data ───────────────── */

const STATUS_CONFIG: Record<AgentStatus, { label: string; color: string; bg: string; dot: string; icon: React.ReactNode }> = {
  available: { label: 'זמין', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-400', icon: <CheckCircle2 size={12} /> },
  en_route: { label: 'בדרך', color: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-400', icon: <Car size={12} /> },
  on_site: { label: 'אצל לקוח', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-400', icon: <Briefcase size={12} /> },
  break: { label: 'הפסקה', color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400', icon: <Coffee size={12} /> },
  offline: { label: 'לא מחובר', color: 'text-slate-400', bg: 'bg-slate-50', dot: 'bg-slate-300', icon: <Circle size={12} /> },
};

const AREAS = ['מרכז', 'צפון', 'דרום', 'שרון', 'שפלה', 'ירושלים'];

const MOCK_AGENTS: FieldTeamMember[] = [
  {
    id: 'f1', name: 'אלון ברק', avatar: 'א', phone: '050-1112233', status: 'on_site',
    area: 'מרכז', currentClient: 'מעדניית הגליל', currentAddress: 'רח׳ הרצל 45, תל אביב',
    completedToday: 4, remainingToday: 2, lastUpdate: 'לפני 5 דק׳', lat: 32.0853, lng: 34.7818,
    visits: [
      { id: 'v1', clientName: 'קפה רומא', address: 'דיזנגוף 120', time: '09:00', status: 'completed' },
      { id: 'v2', clientName: 'סופר פארם', address: 'אבן גבירול 80', time: '10:30', status: 'completed' },
      { id: 'v3', clientName: 'חשמל ישיר', address: 'ויצמן 15', time: '12:00', status: 'completed' },
      { id: 'v4', clientName: 'מעדניית הגליל', address: 'הרצל 45', time: '14:00', status: 'current', notes: 'חידוש חוזה' },
      { id: 'v5', clientName: 'אופטיקנה', address: 'רוטשילד 22', time: '15:30', status: 'upcoming' },
      { id: 'v6', clientName: 'בית קפה נחמן', address: 'נחמני 8', time: '16:30', status: 'upcoming' },
    ]
  },
  {
    id: 'f2', name: 'רונית שמעון', avatar: 'ר', phone: '052-4445566', status: 'en_route',
    area: 'שרון', currentClient: 'משרד עו"ד כהן', currentAddress: 'סוקולוב 30, הרצליה',
    completedToday: 3, remainingToday: 3, lastUpdate: 'לפני 2 דק׳', lat: 32.1627, lng: 34.7911,
    visits: [
      { id: 'v7', clientName: 'סטודיו fit', address: 'אחוזה 55', time: '09:30', status: 'completed' },
      { id: 'v8', clientName: 'מרפאת שיניים ד"ר לוי', address: 'בן גוריון 12', time: '11:00', status: 'completed' },
      { id: 'v9', clientName: 'רשת שוהם', address: 'ויצמן 88', time: '12:30', status: 'completed' },
      { id: 'v10', clientName: 'משרד עו"ד כהן', address: 'סוקולוב 30', time: '14:30', status: 'current' },
      { id: 'v11', clientName: 'פיצה פאלאס', address: 'רחוב הים 15', time: '16:00', status: 'upcoming' },
      { id: 'v12', clientName: 'גלריה ארט', address: 'שד׳ בן גוריון 7', time: '17:00', status: 'upcoming' },
    ]
  },
  {
    id: 'f3', name: 'משה דוד', avatar: 'מ', phone: '054-7778899', status: 'available',
    area: 'צפון', completedToday: 5, remainingToday: 0, lastUpdate: 'לפני 10 דק׳', lat: 32.7940, lng: 34.9896,
    visits: [
      { id: 'v13', clientName: 'מסעדת הים', address: 'חוף הכרמל 3', time: '09:00', status: 'completed' },
      { id: 'v14', clientName: 'ספא אוקיינוס', address: 'הנמל 40', time: '10:30', status: 'completed' },
      { id: 'v15', clientName: 'רשת מוצא', address: 'חורב 55', time: '12:00', status: 'completed' },
      { id: 'v16', clientName: 'משרד ייעוץ נתן', address: 'מוריה 22', time: '13:30', status: 'completed' },
      { id: 'v17', clientName: 'בית ספר דרור', address: 'ויצמן 8', time: '15:00', status: 'completed' },
    ]
  },
  {
    id: 'f4', name: 'דנה יוסף', avatar: 'ד', phone: '053-1010101', status: 'break',
    area: 'דרום', completedToday: 2, remainingToday: 4, lastUpdate: 'לפני 25 דק׳', lat: 31.2530, lng: 34.7915,
    visits: [
      { id: 'v18', clientName: 'סופר נתן', address: 'רגר 10', time: '09:00', status: 'completed' },
      { id: 'v19', clientName: 'מכבסת הנגב', address: 'העצמאות 45', time: '10:30', status: 'completed' },
      { id: 'v20', clientName: 'חנות חלקים', address: 'תעשייה 3', time: '14:00', status: 'upcoming' },
      { id: 'v21', clientName: 'מוסך דרום', address: 'שד׳ רגר 77', time: '15:00', status: 'upcoming' },
      { id: 'v22', clientName: 'מרכז מסחרי BIG', address: 'דרך חברון 100', time: '16:30', status: 'upcoming' },
      { id: 'v23', clientName: 'פאב הקצה', address: 'שמחוני 12', time: '17:30', status: 'upcoming' },
    ]
  },
  {
    id: 'f5', name: 'עומר חן', avatar: 'ע', phone: '050-2020202', status: 'offline',
    area: 'ירושלים', completedToday: 0, remainingToday: 5, lastUpdate: 'לפני 3 שע׳', lat: 31.7683, lng: 35.2137,
    visits: [
      { id: 'v24', clientName: 'מרכז הסיטי', address: 'יפו 12', time: '09:00', status: 'upcoming' },
      { id: 'v25', clientName: 'ספריית ידע', address: 'בן יהודה 30', time: '10:30', status: 'upcoming' },
      { id: 'v26', clientName: 'מסעדת ירושלים', address: 'שמאי 5', time: '12:00', status: 'upcoming' },
      { id: 'v27', clientName: 'סטודיו צילום', address: 'אגריפס 88', time: '14:00', status: 'upcoming' },
      { id: 'v28', clientName: 'חנות ספרים', address: 'קינג ג׳ורג׳ 40', time: '15:30', status: 'upcoming' },
    ]
  },
];

/* ───────────────── Map Pin Component ───────────────── */

function MapPinDot({ agent, isSelected, onClick }: { agent: FieldTeamMember; isSelected: boolean; onClick: () => void }) {
  const sc = STATUS_CONFIG[agent.status];
  // Convert lat/lng to approximate pixel position on Israel map (simplified)
  const top = Math.max(5, Math.min(85, 100 - ((agent.lat - 29.5) / (33.3 - 29.5)) * 100));
  const left = Math.max(10, Math.min(90, ((agent.lng - 34.2) / (35.9 - 34.2)) * 100));

  return (
    <button
      onClick={onClick}
      type="button"
      className={`absolute transition-all duration-300 z-10 group ${isSelected ? 'z-30 scale-125' : 'hover:z-20 hover:scale-110'}`}
      style={{ top: `${top}%`, left: `${left}%`, transform: 'translate(-50%, -50%)' }}
      title={agent.name}
    >
      <div className={`relative ${isSelected ? 'animate-bounce' : ''}`}>
        {/* Pulse ring */}
        {(agent.status === 'en_route' || agent.status === 'on_site') && (
          <div className={`absolute inset-0 rounded-full ${sc.dot} opacity-30 animate-ping`} />
        )}
        {/* Pin body */}
        <div className={`w-10 h-10 rounded-full ${isSelected ? 'ring-4 ring-indigo-400/50' : ''} ${sc.bg} border-2 border-white shadow-lg flex items-center justify-center font-black text-xs ${sc.color}`}>
          {agent.avatar}
        </div>
        {/* Status dot */}
        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full ${sc.dot} border-2 border-white`} />
      </div>
      {/* Name tooltip */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {agent.name}
      </div>
    </button>
  );
}

/* ───────────────── Main Component ───────────────── */

const FieldMapView: React.FC = () => {
  const { addToast } = useToast();
  const [agents] = useState<FieldTeamMember[]>(MOCK_AGENTS);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [filterArea, setFilterArea] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<AgentStatus | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const filteredAgents = useMemo(() => {
    return agents.filter(a => {
      if (filterArea !== 'all' && a.area !== filterArea) return false;
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      return true;
    });
  }, [agents, filterArea, filterStatus]);

  const selected = useMemo(() => agents.find(a => a.id === selectedAgent), [agents, selectedAgent]);

  const stats = useMemo(() => {
    const active = agents.filter(a => a.status !== 'offline').length;
    const totalCompleted = agents.reduce((s, a) => s + a.completedToday, 0);
    const totalRemaining = agents.reduce((s, a) => s + a.remainingToday, 0);
    return { active, total: agents.length, totalCompleted, totalRemaining };
  }, [agents]);

  const handleCall = useCallback((name: string) => {
    addToast(`מתחבר ל${name}...`, 'success');
  }, [addToast]);

  const handleMessage = useCallback((name: string) => {
    addToast(`פותח שיחה עם ${name}`, 'success');
  }, [addToast]);

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <MapPin className="text-rose-500" strokeWidth={2.5} size={28} />
            צוותי שטח
          </h2>
          <p className="text-sm text-slate-500 mt-1">מעקב חי • ביקורים • מסלולים</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('map')}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'map' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              מפה
            </button>
            <button
              onClick={() => setViewMode('list')}
              type="button"
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              רשימה
            </button>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            type="button"
            className={`p-2.5 rounded-xl border transition-all ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
          >
            <Filter size={16} />
          </button>
          <button
            onClick={() => addToast('מיקומים עודכנו', 'success')}
            type="button"
            className="p-2.5 rounded-xl border bg-white border-slate-200 text-slate-500 hover:border-slate-300 transition-all"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">אזור:</span>
                <button onClick={() => setFilterArea('all')} type="button" className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${filterArea === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>הכל</button>
                {AREAS.map(a => (
                  <button key={a} onClick={() => setFilterArea(a)} type="button" className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${filterArea === a ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>{a}</button>
                ))}
              </div>
              <div className="w-px bg-slate-200 mx-2 hidden md:block" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">סטטוס:</span>
                <button onClick={() => setFilterStatus('all')} type="button" className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>הכל</button>
                {(Object.keys(STATUS_CONFIG) as AgentStatus[]).map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} type="button" className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${filterStatus === s ? 'bg-slate-800 text-white' : `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border border-transparent`}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === s ? 'bg-white' : STATUS_CONFIG[s].dot}`} />
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'אנשי שטח פעילים', value: `${stats.active}/${stats.total}`, icon: <User size={16} />, color: 'text-indigo-600 bg-indigo-50' },
          { label: 'ביקורים שבוצעו', value: String(stats.totalCompleted), icon: <CheckCircle2 size={16} />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'ביקורים שנותרו', value: String(stats.totalRemaining), icon: <Clock size={16} />, color: 'text-amber-600 bg-amber-50' },
          { label: 'אחוז ביצוע', value: `${stats.totalCompleted + stats.totalRemaining > 0 ? Math.round((stats.totalCompleted / (stats.totalCompleted + stats.totalRemaining)) * 100) : 0}%`, icon: <Zap size={16} />, color: 'text-violet-600 bg-violet-50' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.color.split(' ')[1]} rounded-2xl p-4 border border-white shadow-sm flex items-center gap-3`}>
            <div className={`p-2 rounded-xl ${kpi.color.split(' ')[1]} ${kpi.color.split(' ')[0]}`}>{kpi.icon}</div>
            <div>
              <p className={`text-xl font-black ${kpi.color.split(' ')[0]} leading-none`}>{kpi.value}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

        {/* Map / List Area */}
        <div className={`${viewMode === 'map' ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {viewMode === 'map' ? (
            /* ── Visual Map ── */
            <div className="bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden" style={{ minHeight: '420px' }}>
              {/* Decorative map grid */}
              <svg className="absolute inset-0 w-full h-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" className="text-slate-600" />
              </svg>

              {/* Israel outline hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
                <MapPin size={300} className="text-slate-800" />
              </div>

              {/* Area labels */}
              <span className="absolute text-[10px] font-bold text-sky-400/60 pointer-events-none" style={{ top: '12%', left: '55%' }}>צפון</span>
              <span className="absolute text-[10px] font-bold text-sky-400/60 pointer-events-none" style={{ top: '35%', left: '40%' }}>שרון</span>
              <span className="absolute text-[10px] font-bold text-sky-400/60 pointer-events-none" style={{ top: '50%', left: '35%' }}>מרכז</span>
              <span className="absolute text-[10px] font-bold text-sky-400/60 pointer-events-none" style={{ top: '55%', left: '70%' }}>ירושלים</span>
              <span className="absolute text-[10px] font-bold text-sky-400/60 pointer-events-none" style={{ top: '78%', left: '45%' }}>דרום</span>

              {/* Agent pins */}
              {filteredAgents.map(agent => (
                <MapPinDot
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent === agent.id}
                  onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
                />
              ))}

              {/* Legend */}
              <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/50 p-3 shadow-sm">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">סטטוס</p>
                <div className="space-y-1.5">
                  {(Object.entries(STATUS_CONFIG) as [AgentStatus, typeof STATUS_CONFIG[AgentStatus]][]).filter(([k]) => k !== 'offline').map(([key, cfg]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className="text-[10px] font-medium text-slate-600">{cfg.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── List View ── */
            <div className="space-y-3">
              {filteredAgents.map(agent => {
                const sc = STATUS_CONFIG[agent.status];
                const isOpen = selectedAgent === agent.id;
                return (
                  <div key={agent.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <button
                      onClick={() => setSelectedAgent(isOpen ? null : agent.id)}
                      type="button"
                      className="w-full flex items-center gap-3 p-4 text-right"
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-sm text-slate-700">{agent.avatar}</div>
                        <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${sc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-sm text-slate-800">{agent.name}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${sc.bg} ${sc.color} flex items-center gap-0.5`}>{sc.icon} {sc.label}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {agent.currentClient ? `📍 ${agent.currentClient}` : `אזור ${agent.area}`}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center gap-4 shrink-0 text-center">
                        <div><p className="text-sm font-black text-emerald-600">{agent.completedToday}</p><p className="text-[9px] text-slate-400">בוצעו</p></div>
                        <div><p className="text-sm font-black text-amber-600">{agent.remainingToday}</p><p className="text-[9px] text-slate-400">נותרו</p></div>
                      </div>
                      {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                    </button>

                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="border-t border-slate-100 p-4 space-y-2">
                            {agent.visits.map(v => (
                              <div key={v.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${v.status === 'current' ? 'bg-amber-50 ring-1 ring-amber-200' : v.status === 'completed' ? 'opacity-60' : ''}`}>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${v.status === 'completed' ? 'bg-emerald-400' : v.status === 'current' ? 'bg-amber-400 animate-pulse' : 'bg-slate-300'}`} />
                                <span className="text-[11px] font-mono text-slate-400 w-10 shrink-0">{v.time}</span>
                                <span className={`text-xs font-bold flex-1 ${v.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{v.clientName}</span>
                                <span className="text-[10px] text-slate-400 hidden md:block">{v.address}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Selected Agent Detail (map mode only) */}
        {viewMode === 'map' && (
          <div className="space-y-4">
            {selected ? (
              <>
                {/* Agent Card */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center font-black text-lg text-indigo-600">
                        {selected.avatar}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${STATUS_CONFIG[selected.status].dot}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-black text-slate-800">{selected.name}</h3>
                      <span className={`text-[10px] font-bold ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].color} px-2 py-0.5 rounded-full flex items-center gap-1 w-fit`}>
                        {STATUS_CONFIG[selected.status].icon}
                        {STATUS_CONFIG[selected.status].label} • {selected.area}
                      </span>
                    </div>
                    <button onClick={() => setSelectedAgent(null)} type="button" className="p-1 hover:bg-slate-100 rounded-lg">
                      <X size={16} className="text-slate-400" />
                    </button>
                  </div>

                  {selected.currentClient && (
                    <div className="bg-amber-50 rounded-xl p-3 mb-3 border border-amber-100">
                      <p className="text-[10px] font-bold text-amber-600 mb-0.5">ביקור נוכחי</p>
                      <p className="text-sm font-bold text-slate-800">{selected.currentClient}</p>
                      <p className="text-[11px] text-slate-500">{selected.currentAddress}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-emerald-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-emerald-600">{selected.completedToday}</p>
                      <p className="text-[10px] text-slate-500 font-bold">בוצעו היום</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-lg font-black text-slate-600">{selected.remainingToday}</p>
                      <p className="text-[10px] text-slate-500 font-bold">נותרו</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCall(selected.name)}
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-all"
                    >
                      <Phone size={14} /> התקשר
                    </button>
                    <button
                      onClick={() => handleMessage(selected.name)}
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                    >
                      <MessageSquare size={14} /> הודעה
                    </button>
                  </div>
                </div>

                {/* Today's Route */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2 mb-3">
                    <Route size={16} className="text-indigo-500" /> מסלול היום
                  </h4>
                  <div className="space-y-1">
                    {selected.visits.map((v, i) => (
                      <div key={v.id} className="flex items-start gap-3 group">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full shrink-0 border-2 ${
                            v.status === 'completed' ? 'bg-emerald-400 border-emerald-400' :
                            v.status === 'current' ? 'bg-amber-400 border-amber-400 animate-pulse' :
                            'bg-white border-slate-300'
                          }`} />
                          {i < selected.visits.length - 1 && (
                            <div className={`w-0.5 h-6 ${v.status === 'completed' ? 'bg-emerald-200' : 'bg-slate-200'}`} />
                          )}
                        </div>
                        <div className="pb-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-slate-400">{v.time}</span>
                            <span className={`text-xs font-bold ${v.status === 'completed' ? 'text-slate-400 line-through' : v.status === 'current' ? 'text-amber-700' : 'text-slate-700'}`}>
                              {v.clientName}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{v.address}</p>
                          {v.notes && <p className="text-[10px] text-indigo-500 font-medium mt-0.5">📝 {v.notes}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* No selection */
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
                <MapPin size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-bold text-slate-400">בחר איש שטח מהמפה</p>
                <p className="text-[11px] text-slate-300 mt-1">לחץ על נקודה כדי לראות פרטים</p>
              </div>
            )}

            {/* Quick Team List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">צוות שטח</h4>
              <div className="space-y-2">
                {agents.map(a => {
                  const sc = STATUS_CONFIG[a.status];
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedAgent(a.id)}
                      type="button"
                      className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-right transition-all ${selectedAgent === a.id ? 'bg-indigo-50 ring-1 ring-indigo-200' : 'hover:bg-slate-50'}`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[11px] text-slate-600">{a.avatar}</div>
                        <div className={`absolute -bottom-0.5 -left-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${sc.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{a.name}</p>
                        <p className="text-[10px] text-slate-400">{a.area}</p>
                      </div>
                      <div className="text-[10px] font-bold text-slate-400">
                        {a.completedToday}/{a.completedToday + a.remainingToday}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldMapView;
