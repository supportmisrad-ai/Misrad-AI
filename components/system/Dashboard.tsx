'use client';


import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { Lead, DashboardStats, PipelineStage } from './types';
import { STAGES } from './constants';
import { CircleAlert, TrendingUp, DollarSign, Users, ArrowUpRight, Target, SquareActivity, Zap, Layers, PieChart as PieChartIcon, Calendar, Megaphone, Wallet, Play, PhoneCall, Copy, Check } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

interface DashboardProps {
  leads: Lead[];
  onNavigate?: (tab: string) => void;
  onQuickAction?: (action: string) => void;
}

const DashboardSkeleton = () => (
    <div className="space-y-8 animate-pulse pb-10">
        <div className="h-64 bg-slate-200/50 rounded-[40px] w-full opacity-50"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-100/50 rounded-[40px] h-96 opacity-50"></div>
            <div className="bg-slate-100/50 rounded-[40px] h-96 opacity-50"></div>
        </div>
    </div>
);

const Dashboard: React.FC<DashboardProps> = ({ leads, onNavigate, onQuickAction }) => {
  const { orgSlug } = useApp();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
      const timer = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(timer);
  }, []);

  const handleCopyLeadFormLink = () => {
    if (!orgSlug) return;
    const leadFormUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/lead/${orgSlug}`
      : `/lead/${orgSlug}`;
    navigator.clipboard.writeText(leadFormUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <DashboardSkeleton />;

  const stats: DashboardStats = {
    totalValue: leads.reduce((sum, lead) => lead.status !== 'לא רלוונטי' ? sum + lead.value : sum, 0),
    totalLeads: leads.length,
    newLeads: leads.filter(l => l.status === 'חדש').length,
    inProgress: leads.filter(l => !['חדש', 'סגור', 'לא רלוונטי', 'נטישה'].includes(l.status)).length,
    wonLeads: leads.filter(l => l.status === 'won').length,
    conversionRate: Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) || 0,
    leadsNeedingAttention: leads.filter(l => {
        const diffTime = Math.abs(new Date().getTime() - new Date(l.lastContact).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 3 && l.status !== 'סגור' && l.status !== 'לא רלוונטי';
    }).length
  };

  const funnelData = STAGES.map(stage => ({
    name: stage.label,
    count: leads.filter(l => l.status === stage.id).length,
    value: leads.filter(l => l.status === stage.id).reduce((sum, l) => sum + l.value, 0),
  }));

  const sourceMap = leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);
  
  const sourceData = Object.keys(sourceMap).map(key => ({
      name: key,
      value: sourceMap[key]
  })).sort((a,b) => b.value - a.value);

  const PIE_COLORS = ['#A21D3C', '#3730A3', '#4338CA', '#881337', '#64748B'];

  const getBarColor = (stageId: PipelineStage) => {
    switch(stageId) {
        case 'won': return '#A21D3C'; 
        case 'negotiation': return '#3730A3'; 
        case 'proposal': return '#4338CA'; 
        case 'meeting': return '#64748B'; 
        case 'contacted': return '#94A3B8'; 
        default: return '#E2E8F0'; 
    }
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20">
      
      {/* --- LAUNCHPAD: Pill Shaped Buttons --- */}
      <div className="bg-white/40 backdrop-blur-md p-4 rounded-[2rem] border border-white/60 shadow-sm">
        <div className="grid grid-cols-4 md:grid-cols-7 lg:grid-cols-8 gap-3">
            {[ 
                { id: 'sales_mgmt', icon: Zap, label: 'ניהול', color: 'text-slate-700', bg: 'bg-slate-100' },
                { id: 'pipeline', icon: Layers, label: 'צנרת', color: 'text-indigo-700', bg: 'bg-indigo-50' },
                { id: 'comms', icon: PhoneCall, label: 'מרכזיה', color: 'text-rose-700', bg: 'bg-rose-50' },
                { id: 'calendar', icon: Calendar, label: 'אירועים', color: 'text-slate-700', bg: 'bg-slate-100' },
                { id: 'marketing', icon: Megaphone, label: 'שיווק', color: 'text-slate-700', bg: 'bg-slate-100' },
                { id: 'finance', icon: Wallet, label: 'כספים', color: 'text-emerald-700', bg: 'bg-emerald-50' },
            ].map((item) => (
                <button 
                  key={item.id}
                  onClick={() => onNavigate && onNavigate(item.id)}
                  className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100 rounded-2xl hover:bg-slate-50 hover:shadow-md transition-all group active:scale-95"
                >
                    <div className={`w-9 h-9 rounded-xl ${item.bg} ${item.color} flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform`}>
                        <item.icon size={18} />
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 text-center leading-tight">{item.label}</span>
                </button>
            ))}

            <button 
              onClick={() => onQuickAction && onQuickAction('lead')}
              className="flex flex-col items-center justify-center p-3 bg-slate-900 border border-transparent rounded-2xl hover:bg-black hover:shadow-lg transition-all group active:scale-95"
            >
                <div className="w-9 h-9 rounded-xl bg-white/10 text-white flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Play size={18} fill="currentColor" />
                </div>
                <span className="text-[11px] font-bold text-white text-center leading-tight">הוסף ליד</span>
            </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">סה"כ לידים</div>
          <div className="text-3xl font-black text-slate-900">{stats.totalLeads}</div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm border-r-4 border-r-indigo-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">לידים חדשים</div>
          <div className="text-3xl font-black text-slate-900">{stats.newLeads}</div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm border-r-4 border-r-amber-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">בתהליך</div>
          <div className="text-3xl font-black text-slate-900">{stats.inProgress}</div>
        </div>
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm border-r-4 border-r-emerald-500">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">עסקאות שנסגרו</div>
          <div className="text-3xl font-black text-slate-900">{stats.wonLeads}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="ui-card p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition-all border border-slate-100">
              <div className="flex justify-between items-start z-10">
                  <div className="p-2 bg-slate-50 text-slate-800 rounded-lg border border-slate-100"><Target size={18} /></div>
              </div>
              <div className="z-10">
                  <div className="text-2xl font-black font-mono tracking-tight text-slate-900 tabular-nums">{stats.conversionRate}%</div>
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">המרה</div>
              </div>
          </div>

          <div className="ui-card p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:shadow-md transition-all border border-red-50 bg-red-50/5">
              <div className="flex justify-between items-start z-10">
                  <div className="p-2 bg-white rounded-lg text-red-700 border border-red-100"><CircleAlert size={18} /></div>
              </div>
              <div className="z-10">
                  <div className="text-2xl font-black font-mono tracking-tight text-red-800 tabular-nums">{stats.leadsNeedingAttention}</div>
                  <div className="text-red-600/60 text-[10px] font-bold uppercase tracking-wider">דחוף</div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 ui-card p-8 md:p-10 h-[450px] md:h-[550px] flex flex-col">
            <div className="flex justify-between items-center mb-8 md:mb-12">
                <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-800">איפה עומדים (המשפך)</h3>
                    <p className="text-slate-400 text-xs md:text-sm mt-1 font-medium">ניהול מסע הלקוח מקצה לקצה</p>
                </div>
            </div>
            
            <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }} barSize={36}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} /> 
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fill: '#64748B', fontSize: 10, fontWeight: 700}} 
                        dy={10}
                        interval={0}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10}} />
                    <Tooltip 
                      cursor={{fill: '#F1F5F9', radius: 12}}
                      contentStyle={{ 
                          borderRadius: '24px', 
                          border: 'none', 
                          background: '#fff',
                          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.08)',
                          padding: '16px',
                          color: '#18181B',
                          fontWeight: 'bold',
                          fontSize: '12px'
                      }}
                      formatter={(value) => [typeof value === 'number' ? value : 0, 'כמות']}
                    />
                    <Bar dataKey="count" radius={[8, 8, 8, 8]}>
                        {funnelData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(STAGES[index].id)} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          <div className="ui-card p-8 md:p-10 h-[450px] md:h-[550px] flex flex-col text-right">
             <div className="mb-6">
                <h3 className="text-lg md:text-xl font-bold text-slate-800">מאיפה באו?</h3>
                <p className="text-slate-400 text-xs md:text-sm mt-1 font-medium">פילוח מקורות לידים</p>
             </div>
             
             <div className="flex-1 min-h-0 relative">
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={sourceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={105}
                            paddingAngle={8}
                            dataKey="value"
                            cornerRadius={10}
                            stroke="none"
                        >
                            {sourceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.08)' }} />
                    </PieChart>
                 </ResponsiveContainer>
                 
                 <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                     <span className="text-4xl md:text-5xl font-black text-slate-800 tracking-tighter">{stats.totalLeads}</span>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">סה"כ</span>
                 </div>
             </div>

             <div className="mt-6 md:mt-10 space-y-4">
                 {sourceData.slice(0, 3).map((entry, index) => (
                     <div key={index} className="flex items-center justify-between text-xs md:text-sm">
                         <div className="flex items-center gap-3">
                             <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                             <span className="text-slate-600 font-bold">{entry.name}</span>
                         </div>
                         <span className="font-mono font-bold text-slate-900">{entry.value}</span>
                     </div>
                 ))}
             </div>
          </div>
      </div>
    </div>
  );
};

export default Dashboard;
