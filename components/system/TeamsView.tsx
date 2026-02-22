'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Trophy, TrendingUp, Phone, Star, ChevronDown, ChevronUp,
  Plus, MoreHorizontal, Target, Zap, Crown, Medal, Award,
  ArrowUpRight, ArrowDownRight, Minus, UserPlus, Settings,
  BarChart3, Flame, CircleDot, X
} from 'lucide-react';
import { useToast } from './contexts/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';

/* ───────────────── Types ───────────────── */

interface TeamMember {
  id: string;
  name: string;
  role: 'closer' | 'sdr' | 'manager' | 'support';
  avatar: string;
  phone: string;
  dealsWon: number;
  dealsPending: number;
  revenue: number;
  conversionRate: number;
  avgResponseTime: number; // minutes
  trend: 'up' | 'down' | 'stable';
  isOnline: boolean;
}

interface Department {
  id: string;
  name: string;
  color: string;
  icon: string;
  members: TeamMember[];
  monthlyTarget: number;
  monthlyActual: number;
}

/* ───────────────── Mock Data ───────────────── */

const MOCK_DEPARTMENTS: Department[] = [
  {
    id: 'sales',
    name: 'מכירות',
    color: 'indigo',
    icon: '💼',
    monthlyTarget: 250000,
    monthlyActual: 187500,
    members: [
      { id: 'm1', name: 'יוסי כהן', role: 'manager', avatar: 'י', phone: '050-1234567', dealsWon: 12, dealsPending: 8, revenue: 85000, conversionRate: 68, avgResponseTime: 4, trend: 'up', isOnline: true },
      { id: 'm2', name: 'מיכל לוי', role: 'closer', avatar: 'מ', phone: '052-9876543', dealsWon: 18, dealsPending: 5, revenue: 62000, conversionRate: 78, avgResponseTime: 6, trend: 'up', isOnline: true },
      { id: 'm3', name: 'דני אברהם', role: 'closer', avatar: 'ד', phone: '054-5555555', dealsWon: 9, dealsPending: 12, revenue: 28000, conversionRate: 43, avgResponseTime: 15, trend: 'down', isOnline: false },
      { id: 'm4', name: 'שירה גולן', role: 'sdr', avatar: 'ש', phone: '053-1112222', dealsWon: 6, dealsPending: 22, revenue: 12500, conversionRate: 21, avgResponseTime: 2, trend: 'up', isOnline: true },
    ],
  },
  {
    id: 'cs',
    name: 'הצלחת לקוחות',
    color: 'emerald',
    icon: '🤝',
    monthlyTarget: 50000,
    monthlyActual: 42000,
    members: [
      { id: 'm5', name: 'נועה פרידמן', role: 'manager', avatar: 'נ', phone: '050-3334444', dealsWon: 4, dealsPending: 3, revenue: 22000, conversionRate: 57, avgResponseTime: 8, trend: 'stable', isOnline: true },
      { id: 'm6', name: 'אורי שפירא', role: 'support', avatar: 'א', phone: '052-7778888', dealsWon: 8, dealsPending: 2, revenue: 20000, conversionRate: 80, avgResponseTime: 3, trend: 'up', isOnline: true },
    ],
  },
  {
    id: 'biz',
    name: 'פיתוח עסקי',
    color: 'amber',
    icon: '🚀',
    monthlyTarget: 100000,
    monthlyActual: 65000,
    members: [
      { id: 'm7', name: 'רון מזרחי', role: 'closer', avatar: 'ר', phone: '054-9990001', dealsWon: 5, dealsPending: 7, revenue: 45000, conversionRate: 42, avgResponseTime: 12, trend: 'down', isOnline: false },
      { id: 'm8', name: 'תמר ביטון', role: 'sdr', avatar: 'ת', phone: '053-6667777', dealsWon: 3, dealsPending: 15, revenue: 20000, conversionRate: 17, avgResponseTime: 5, trend: 'up', isOnline: true },
    ],
  },
];

const ROLE_LABELS: Record<TeamMember['role'], string> = {
  closer: 'סוגר עסקאות',
  sdr: 'נציג פיתוח',
  manager: 'מנהל צוות',
  support: 'תמיכה',
};

const ROLE_COLORS: Record<TeamMember['role'], string> = {
  closer: 'bg-indigo-100 text-indigo-700',
  sdr: 'bg-sky-100 text-sky-700',
  manager: 'bg-amber-100 text-amber-800',
  support: 'bg-emerald-100 text-emerald-700',
};

/* ───────────────── Helpers ───────────────── */

function formatCurrency(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K ₪` : `${n} ₪`;
}

function getRankIcon(index: number) {
  if (index === 0) return <Crown size={16} className="text-amber-500" />;
  if (index === 1) return <Medal size={16} className="text-slate-400" />;
  if (index === 2) return <Award size={16} className="text-amber-700" />;
  return <span className="text-[10px] font-bold text-slate-400">{index + 1}</span>;
}

/* ───────────────── Component ───────────────── */

const TeamsView: React.FC = () => {
  const { addToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>(MOCK_DEPARTMENTS);
  const [expandedDept, setExpandedDept] = useState<string | null>('sales');
  const [showAddMember, setShowAddMember] = useState(false);
  const [addToDept, setAddToDept] = useState<string>('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<TeamMember['role']>('closer');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Global leaderboard — all members sorted by revenue
  const leaderboard = useMemo(() => {
    return departments
      .flatMap(d => d.members.map(m => ({ ...m, deptName: d.name, deptColor: d.color })))
      .sort((a, b) => b.revenue - a.revenue);
  }, [departments]);

  // Global KPIs
  const globalKPIs = useMemo(() => {
    const allMembers = departments.flatMap(d => d.members);
    const totalRevenue = allMembers.reduce((s, m) => s + m.revenue, 0);
    const totalTarget = departments.reduce((s, d) => s + d.monthlyTarget, 0);
    const totalDeals = allMembers.reduce((s, m) => s + m.dealsWon, 0);
    const avgConversion = allMembers.length > 0
      ? Math.round(allMembers.reduce((s, m) => s + m.conversionRate, 0) / allMembers.length)
      : 0;
    const onlineCount = allMembers.filter(m => m.isOnline).length;
    return { totalRevenue, totalTarget, totalDeals, avgConversion, onlineCount, totalMembers: allMembers.length };
  }, [departments]);

  const handleAddMember = () => {
    if (!newMemberName.trim() || !addToDept) return;
    const member: TeamMember = {
      id: `m_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      avatar: newMemberName.trim().charAt(0),
      phone: newMemberPhone || '—',
      dealsWon: 0,
      dealsPending: 0,
      revenue: 0,
      conversionRate: 0,
      avgResponseTime: 0,
      trend: 'stable',
      isOnline: false,
    };
    setDepartments(prev => prev.map(d =>
      d.id === addToDept ? { ...d, members: [...d.members, member] } : d
    ));
    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddMember(false);
    addToast(`${member.name} נוסף בהצלחה`, 'success');
  };

  const pctOf = (actual: number, target: number) => target > 0 ? Math.min(Math.round((actual / target) * 100), 100) : 0;

  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-24 min-h-0 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Users className="text-indigo-600" strokeWidth={2.5} size={28} />
            צוותי מכירות
          </h2>
          <p className="text-sm text-slate-500 mt-1">ביצועים, יעדים וליגת הסוגרים</p>
        </div>
        <button
          onClick={() => { setShowAddMember(true); setAddToDept(departments[0]?.id || ''); }}
          className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-lg hover:bg-black transition-all flex items-center gap-2 hover:-translate-y-0.5 text-sm"
        >
          <UserPlus size={16} strokeWidth={2.5} /> הוסף חבר צוות
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'הכנסה החודש', value: formatCurrency(globalKPIs.totalRevenue), sub: `מתוך ${formatCurrency(globalKPIs.totalTarget)}`, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'עסקאות שנסגרו', value: String(globalKPIs.totalDeals), sub: 'החודש', color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'אחוז המרה ממוצע', value: `${globalKPIs.avgConversion}%`, sub: 'כלל הצוותים', color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'אנשי צוות', value: String(globalKPIs.totalMembers), sub: `${globalKPIs.onlineCount} מחוברים`, color: 'text-sky-600', bg: 'bg-sky-50' },
          { label: 'עמידה ביעד', value: `${pctOf(globalKPIs.totalRevenue, globalKPIs.totalTarget)}%`, sub: globalKPIs.totalRevenue >= globalKPIs.totalTarget ? 'עמדנו ביעד!' : 'עוד קצת...', color: globalKPIs.totalRevenue >= globalKPIs.totalTarget ? 'text-emerald-600' : 'text-rose-600', bg: globalKPIs.totalRevenue >= globalKPIs.totalTarget ? 'bg-emerald-50' : 'bg-rose-50' },
        ].map((kpi, i) => (
          <div key={i} className={`${kpi.bg} rounded-2xl p-4 md:p-5 border border-white shadow-sm`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</p>
            <p className={`text-xl md:text-2xl font-black ${kpi.color} leading-none`}>{kpi.value}</p>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Main Grid: Departments + Leaderboard ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: Departments (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          {departments.map(dept => {
            const isExpanded = expandedDept === dept.id;
            const pct = pctOf(dept.monthlyActual, dept.monthlyTarget);
            const colorMap: Record<string, { ring: string; accent: string; bg: string; bar: string }> = {
              indigo: { ring: 'ring-indigo-200', accent: 'text-indigo-600', bg: 'bg-indigo-50', bar: 'bg-indigo-500' },
              emerald: { ring: 'ring-emerald-200', accent: 'text-emerald-600', bg: 'bg-emerald-50', bar: 'bg-emerald-500' },
              amber: { ring: 'ring-amber-200', accent: 'text-amber-600', bg: 'bg-amber-50', bar: 'bg-amber-500' },
            };
            const c = colorMap[dept.color] || colorMap.indigo;

            return (
              <div key={dept.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                {/* Department Header */}
                <button
                  onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                  className="w-full flex items-center gap-4 p-4 md:p-5 text-right"
                  type="button"
                >
                  <span className="text-2xl">{dept.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-black text-slate-800 text-lg">{dept.name}</h3>
                      <span className={`text-[10px] font-bold ${c.bg} ${c.accent} px-2 py-0.5 rounded-full`}>
                        {dept.members.length} אנשים
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {dept.members.filter(m => m.isOnline).length} מחוברים
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                        <div className={`h-full ${c.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={`text-xs font-bold ${c.accent}`}>{pct}%</span>
                      <span className="text-[10px] text-slate-400">{formatCurrency(dept.monthlyActual)} / {formatCurrency(dept.monthlyTarget)}</span>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </button>

                {/* Expanded Members */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-slate-100 divide-y divide-slate-50">
                        {[...dept.members]
                          .sort((a, b) => b.revenue - a.revenue)
                          .map((member, idx) => (
                          <div key={member.id} className="flex items-center gap-3 px-4 md:px-5 py-3 hover:bg-slate-50/50 transition-colors group">
                            {/* Rank */}
                            <div className="w-6 flex justify-center shrink-0">
                              {getRankIcon(idx)}
                            </div>

                            {/* Avatar */}
                            <div className="relative shrink-0">
                              <div className={`w-9 h-9 rounded-full ${c.bg} ${c.accent} flex items-center justify-center font-black text-sm`}>
                                {member.avatar}
                              </div>
                              <div className={`absolute -bottom-0.5 -left-0.5 w-3 h-3 rounded-full border-2 border-white ${member.isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-800 truncate">{member.name}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ROLE_COLORS[member.role]}`}>
                                  {ROLE_LABELS[member.role]}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Target size={10} /> {member.dealsWon} סגירות
                                </span>
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Phone size={10} /> {member.avgResponseTime} דק׳ תגובה
                                </span>
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="hidden md:flex items-center gap-4 shrink-0">
                              <div className="text-center">
                                <p className="text-xs font-black text-slate-800">{formatCurrency(member.revenue)}</p>
                                <p className="text-[9px] text-slate-400">הכנסה</p>
                              </div>
                              <div className="text-center">
                                <p className="text-xs font-black text-slate-800">{member.conversionRate}%</p>
                                <p className="text-[9px] text-slate-400">המרה</p>
                              </div>
                              <div className="shrink-0">
                                {member.trend === 'up' && <ArrowUpRight size={16} className="text-emerald-500" />}
                                {member.trend === 'down' && <ArrowDownRight size={16} className="text-rose-500" />}
                                {member.trend === 'stable' && <Minus size={16} className="text-slate-400" />}
                              </div>
                            </div>
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

        {/* Right: Leaderboard */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-2xl p-5 md:p-6 text-white shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <Trophy size={20} className="text-amber-400" />
            <h3 className="font-black text-lg">ליגת הסוגרים</h3>
          </div>

          <div className="space-y-2">
            {leaderboard.slice(0, 8).map((m, i) => (
              <div
                key={m.id}
                className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                  i === 0 ? 'bg-amber-500/20 ring-1 ring-amber-400/30' :
                  i === 1 ? 'bg-white/5' :
                  i === 2 ? 'bg-white/5' : 'bg-transparent hover:bg-white/5'
                }`}
              >
                <div className="w-6 flex justify-center shrink-0">
                  {getRankIcon(i)}
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                  i === 0 ? 'bg-amber-400 text-amber-900' : 'bg-white/10 text-white'
                }`}>
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{m.name}</p>
                  <p className="text-[10px] text-white/40">{m.deptName}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="font-black text-sm">{formatCurrency(m.revenue)}</p>
                  <p className="text-[10px] text-white/40 flex items-center gap-1 justify-end">
                    {m.trend === 'up' && <ArrowUpRight size={10} className="text-emerald-400" />}
                    {m.trend === 'down' && <ArrowDownRight size={10} className="text-rose-400" />}
                    {m.conversionRate}% המרה
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Motivational footer */}
          <div className="mt-5 pt-4 border-t border-white/10 text-center">
            <p className="text-white/50 text-[11px] flex items-center justify-center gap-1.5">
              <Flame size={12} className="text-amber-400" />
              {leaderboard[0]?.name} מוביל/ה החודש!
            </p>
          </div>
        </div>
      </div>

      {/* ── Add Member Modal ── */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowAddMember(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
                  <UserPlus size={20} className="text-indigo-600" />
                  הוספת חבר צוות
                </h3>
                <button onClick={() => setShowAddMember(false)} className="p-1 hover:bg-slate-100 rounded-lg" type="button">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">שם מלא</label>
                  <input
                    value={newMemberName}
                    onChange={e => setNewMemberName(e.target.value)}
                    placeholder="ישראל ישראלי"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">טלפון</label>
                  <input
                    value={newMemberPhone}
                    onChange={e => setNewMemberPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">מחלקה</label>
                  <div className="grid grid-cols-3 gap-2">
                    {departments.map(d => (
                      <button
                        key={d.id}
                        onClick={() => setAddToDept(d.id)}
                        type="button"
                        className={`p-3 rounded-xl border text-center transition-all text-xs font-bold ${
                          addToDept === d.id
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-lg block mb-0.5">{d.icon}</span>
                        {d.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">תפקיד</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(ROLE_LABELS) as TeamMember['role'][]).map(role => (
                      <button
                        key={role}
                        onClick={() => setNewMemberRole(role)}
                        type="button"
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                          newMemberRole === role
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {ROLE_LABELS[role]}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleAddMember}
                  disabled={!newMemberName.trim()}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition-all mt-2"
                  type="button"
                >
                  הוסף לצוות
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeamsView;
