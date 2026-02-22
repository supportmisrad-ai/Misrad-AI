
import React from 'react';
import { TrendingUp, Download, Sparkles, Target, BarChart, ChevronLeft } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import { Client, MetricHistory, SuccessGoal } from '../../types';

interface PortalMetricsProps {
  performanceHistory: MetricHistory[];
  client: Client;
  aiProgressSummary: Record<string, unknown>;
  isAnalyzingMetrics: boolean;
  onAnalyzeGoal: (goal: SuccessGoal) => void;
}

export const PortalMetrics: React.FC<PortalMetricsProps> = ({
  performanceHistory, client, aiProgressSummary, isAnalyzingMetrics, onAnalyzeGoal
}) => {
  const growthPct = performanceHistory.length >= 2
    ? Math.round((performanceHistory[performanceHistory.length - 1]?.value || 0) - (performanceHistory[0]?.value || 0))
    : 0;

  return (
    <div className="animate-slide-up space-y-12 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-nexus-accent mb-2">
            <TrendingUp size={18} />
            <span className="text-[10px] font-black uppercase tracking-widest">Real-time Performance</span>
          </div>
          <h2 className="text-4xl font-display font-bold text-slate-900">ביצועים ומדדים</h2>
          <p className="text-slate-500 mt-2 text-lg">שקיפות מלאה על כל מה שקובע הצלחה.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-50 transition-all">
            <Download size={14} /> הורד דוח PDF
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-[48px] p-8 md:p-12 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-nexus-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 mb-1">מגמת צמיחה</h3>
              <p className="text-slate-400 text-sm">{performanceHistory.length ? `שינוי של ${growthPct}% בתקופה האחרונה.` : '—'}</p>
            </div>
            <div className="text-left">
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{performanceHistory.length ? `${growthPct >= 0 ? '+' : ''}${growthPct}%` : '—'}</span>
              <span className="text-[10px] font-bold text-green-500 uppercase block">ציון צמיחה</span>
            </div>
          </div>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceHistory}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C5A572" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#C5A572" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', padding: '20px' }}
                  itemStyle={{ color: '#0F172A', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#C5A572" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="monotone" dataKey="baseline" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-[40px] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-nexus-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="w-20 h-20 bg-nexus-accent/20 rounded-3xl flex items-center justify-center text-nexus-accent shadow-glow-gold">
            <Sparkles size={40} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-nexus-accent uppercase tracking-widest">Nexus AI Insight</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <h4 className="text-2xl font-bold italic leading-relaxed">
              "קצב ההתקדמות הנוכחי מראה שנגיע ליעד 'הגדלת כמות לידים' כשבועיים לפני הדדליין. מומלץ להתחיל לתכנן את שלב ה-Scale-up כבר עכשיו."
            </h4>
            <div className="flex gap-4">
              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">תחזית הצלחה</span>
                <span className="text-sm font-bold text-green-400">—</span>
              </div>
              <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">מלכודות פוטנציאליות</span>
                <span className="text-sm font-bold text-[color:var(--os-accent)]">—</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <Target size={24} className="text-nexus-accent" /> פירוט יעדים אסטרטגיים
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {client.successGoals.map((goal: SuccessGoal) => {
            const summary = aiProgressSummary[goal.id];
            return (
              <div key={goal.id} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:border-nexus-accent/40 transition-all flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-slate-50 rounded-2xl text-nexus-primary">
                    <BarChart size={24} />
                  </div>
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-full border ${
                    goal.status === 'ACHIEVED' ? 'bg-green-50 text-green-600 border-green-100' : 
                    goal.status === 'AT_RISK' ? 'bg-red-50 text-red-600 border-red-100' : 
                    'bg-blue-50 text-blue-600 border-blue-100'
                  }`}>
                    {goal.status === 'ACHIEVED' ? 'הושג' : goal.status === 'AT_RISK' ? 'בסיכון' : 'בתהליך'}
                  </span>
                </div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">{goal.title}</h4>
                <div className="flex items-end gap-2 mb-6">
                  <span className="text-4xl font-black text-slate-900">{goal.metricCurrent}{goal.unit}</span>
                  <span className="text-slate-400 text-sm mb-1.5">מתוך {goal.metricTarget}{goal.unit}</span>
                </div>
                
                <div className="w-full h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
                  <div className="h-full bg-nexus-accent rounded-full transition-all duration-1000" style={{ width: `${(goal.metricCurrent/goal.metricTarget)*100}%` }}></div>
                </div>

                {summary ? (
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 animate-fade-in mb-6 flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={14} className="text-nexus-accent" />
                      <span className="text-[10px] font-black uppercase text-slate-400">AI Analysis</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mb-4">"{String((summary as Record<string, unknown>).summary || '')}"</p>
                    <div className="text-[10px] font-bold text-nexus-primary bg-nexus-accent/10 p-2 rounded-lg inline-block">
                      תחזית: {String((summary as Record<string, unknown>).forecast || '')}
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => onAnalyzeGoal(goal)}
                    disabled={isAnalyzingMetrics}
                    className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold text-sm hover:border-nexus-accent hover:text-nexus-accent transition-all flex items-center justify-center gap-2 mb-6"
                  >
                    {isAnalyzingMetrics ? 'מנתח...' : <><Sparkles size={16} /> נתח התקדמות עם AI</>}
                  </button>
                )}

                <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>דדליין: {goal.deadline}</span>
                  <span className="flex items-center gap-1 text-nexus-accent hover:underline cursor-pointer">
                    צפה בפירוט מלא <ChevronLeft size={14} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
