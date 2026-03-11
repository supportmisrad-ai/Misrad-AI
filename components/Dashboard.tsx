
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
import { Lead, DashboardStats, PipelineStage } from './system/types';
import { STAGES } from './system/constants';
import { CircleAlert, TrendingUp, DollarSign, Users, ArrowUpRight, Target, SquareActivity, Zap, Layers, PieChart as PieChartIcon, Calendar, Megaphone, Wallet, Play, PhoneCall } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
      const timer = setTimeout(() => setLoading(false), 600);
      return () => clearTimeout(timer);
  }, []);

  if (loading) return <DashboardSkeleton />;

  const stats: DashboardStats = {
    totalValue: leads.reduce((sum, lead) => lead.status !== 'lost' ? sum + lead.value : sum, 0),
    totalLeads: leads.length,
    conversionRate: Math.round((leads.filter(l => l.status === 'won').length / leads.length) * 100) || 0,
    leadsNeedingAttention: leads.filter(l => {
        const diffTime = Math.abs(new Date().getTime() - new Date(l.lastContact).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 3 && l.status !== 'won' && l.status !== 'lost';
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
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* --- LAUNCHPAD: Pill Shaped Buttons --- */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[
              { id: 'sales_mgmt', icon: Zap, label: 'ניהול שוטף', color: 'text-slate-700', bg: 'bg-slate-100' },
              { id: 'pipeline', icon: Layers, label: 'צנרת עסקאות', color: 'text-indigo-700', bg: 'bg-indigo-50' },
              { id: 'comms', icon: PhoneCall, label: 'מרכזיה', color: 'text-rose-700', bg: 'bg-rose-50' },
              { id: 'calendar', icon: Calendar, label: 'אירועים', color: 'text-slate-700', bg: 'bg-slate-100' },
              { id: 'marketing', icon: Megaphone, label: 'קמפיינים', color: 'text-slate-700', bg: 'bg-slate-100' },
              { id: 'finance', icon: Wallet, label: 'כספים', color: 'text-emerald-700', bg: 'bg-emerald-50' },
          ].map((item) => (
              <button 
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200/60 rounded-[32px] hover:bg-slate-50 hover:shadow-float transition-all group hover:-translate-y-1 active:scale-95"
              >
                  <div className={`w-10 h-10 rounded-full ${item.bg} ${item.color} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                      <item.icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 text-center leading-tight">{item.label}</span>
              </button>
          ))}

          <button 
            onClick={() => onQuickAction && onQuickAction('lead')}
            className="flex flex-col items-center justify-center p-4 bg-nexus-gradient border border-transparent rounded-[32px] hover:opacity-95 hover:shadow-float transition-all group hover:-translate-y-1 active:scale-95"
          >
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center mb-2 group-hover:scale-110 transition-transform backdrop-blur-sm">
                  <Play size={20} fill="currentColor" />
              </div>
              <span className="text-xs font-bold text-white text-center leading-tight">הוסף ליד</span>
          </button>
      </div>

      {/* KPI Cards Row - Using .ui-card class */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="col-span-2 md:col-span-1 ui-card p-6 md:p-8 flex flex-col justify-between h-44 relative overflow-hidden group">
              <div className="flex justify-between items-start z-10">
                  <div className="p-3 bg-slate-100 text-slate-800 rounded-full shadow-sm"><DollarSign size={20} /></div>
                  <span className="text-emerald-700 text-[10px] md:text-xs font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">+12%</span>
              </div>
              <div className="z-10">
                  <div className="text-2xl md:text-3xl font-mono font-black tracking-tight text-slate-900">₪{stats.totalValue.toLocaleString()}</div>
                  <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">כסף בקנה</div>
              </div>
          </div>

          <div className="ui-card p-6 md:p-8 flex flex-col justify-between h-44 relative overflow-hidden group">
              <div className="flex justify-between items-start z-10">
                  <div className="p-3 bg-indigo-50 text-indigo-800 rounded-full shadow-sm"><Layers size={20} /></div>
              </div>
              <div className="z-10">
                  <div className="text-2xl md:text-3xl font-mono font-black tracking-tight text-slate-900">{stats.totalLeads}</div>
                  <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">אנשים מחכים</div>
              </div>
          </div>

          <div className="ui-card p-6 md:p-8 flex flex-col justify-between h-44 relative overflow-hidden group">
              <div className="flex justify-between items-start z-10">
                  <div className="p-3 bg-slate-100 text-slate-800 rounded-full shadow-sm"><Target size={20} /></div>
              </div>
              <div className="z-10">
                  <div className="text-2xl md:text-3xl font-mono font-black tracking-tight text-slate-900">{stats.conversionRate}%</div>
                  <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">כמה סוגרים</div>
              </div>
          </div>

          <div className="ui-card p-6 md:p-8 flex flex-col justify-between h-44 relative overflow-hidden group bg-red-50/20 border-red-100/50">
              <div className="flex justify-between items-start z-10">
                  <div className="p-3 bg-white rounded-full text-red-700 shadow-sm border border-red-100"><CircleAlert size={20} /></div>
              </div>
              <div className="z-10">
                  <div className="text-2xl md:text-3xl font-mono font-black tracking-tight text-red-800">{stats.leadsNeedingAttention}</div>
                  <div className="text-red-600/60 text-[10px] md:text-xs font-bold uppercase tracking-wider mt-1">שים לב אליהם</div>
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
