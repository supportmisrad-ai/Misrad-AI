import React, { useState } from 'react';
import { 
  Sparkles,
  CheckCircle,
  RefreshCw,
  History,
  Target,
  ShieldAlert,
  Lightbulb,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { openComingSoon } from '@/components/shared/coming-soon';
import type { Lead } from '../types';
import type { FieldAgent, AIReport } from '@/components/system/types';

interface AIAnalyticsViewProps {
  leads: Lead[];
  agents: FieldAgent[];
}

const AIAnalyticsView: React.FC<AIAnalyticsViewProps> = ({ leads, agents }) => {
  const { user } = useAuth();
  const [isGenerating] = useState(false);
  const [report] = useState<AIReport | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  void leads;
  void agents;

  const generateReport = () => {
    openComingSoon();
  };

  return (
    <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
      <div className="ui-card p-10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none group-hover:bg-indigo-100/50 transition-colors duration-700"></div>
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <div>
                  <div className="flex items-center gap-2 text-indigo-600 font-mono text-xs font-bold uppercase tracking-widest mb-3"><Sparkles size={16} /> ניתוח נתונים ומשוב</div>
                  <h2 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">{user?.role === 'admin' ? 'ניתוח נתונים מתקדם' : 'מדדי הצלחה אישיים'}</h2>
                  <p className="text-slate-500 max-w-2xl text-lg leading-relaxed font-medium">המערכת מנתחת הצלחות, כשלונות, החזרים וביטולים כדי לייצר עבורך תובנות אופרטיביות לשיפור הרווח הנקי.</p>
              </div>
              <div className="flex gap-4">
                  <button onClick={() => setShowHistory(!showHistory)} className="px-6 py-3.5 bg-white text-slate-600 border border-slate-200 hover:border-slate-300 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-sm"><History size={18} /> היסטוריה</button>
                  <button onClick={generateReport} disabled={isGenerating} className="px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-3 disabled:opacity-70">{isGenerating ? <RefreshCw size={20} className="opacity-70" /> : <Sparkles size={20} className="text-yellow-300 fill-yellow-300" />}{isGenerating ? 'מעבד...' : 'הפעל ניתוח מלא'}</button>
              </div>
          </div>
      </div>

      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
            <div className="lg:col-span-8 space-y-8">
                <div className="ui-card p-8 flex flex-col md:flex-row items-center gap-8 bg-white">
                    <div className="relative w-32 h-32 shrink-0">
                         <svg className="w-full h-full transform -rotate-90">
                            <circle cx="64" cy="64" r="56" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                            <circle cx="64" cy="64" r="56" stroke={report.score > 80 ? '#10b981' : '#f59e0b'} strokeWidth="12" fill="transparent" strokeDasharray="351" strokeDashoffset={351 - (351 * report.score) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-slate-800">{report.score}</span><span className="text-[10px] font-bold text-slate-400 uppercase">ציון בריאות</span></div>
                    </div>
                    <div className="flex-1 text-right">
                        <div className="flex items-center gap-2 mb-2"><h3 className="text-xl font-bold text-slate-800">סיכום בינה מלאכותית</h3></div>
                        <p className="text-slate-600 leading-relaxed font-medium">{report.summary}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {report.metrics?.map((m, i) => (
                        <div key={i} className="ui-card p-6 text-center">
                            <div className="text-xs text-slate-500 font-bold uppercase mb-2">{m.label}</div>
                            <div className={`text-3xl font-black ${m.label.includes('נטישה') || m.label.includes('החזר') ? 'text-red-500' : 'text-slate-800'}`}>
                                {m.label.includes('₪') ? '₪' : ''}{m.value.toLocaleString()}{m.unit}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
                <div className="ui-card overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Lightbulb size={18} className="text-amber-500 fill-amber-500" /> תובנות מניעת ביטולים</h3></div>
                    <div className="divide-y divide-slate-100">
                        {report.insights.map((insight, idx) => (
                            <div key={idx} className="p-6 hover:bg-slate-50 transition-colors">
                                <div className="flex items-start gap-3 mb-2">
                                    {insight.severity === 'critical' ? <ShieldAlert className="text-red-500" size={18} /> : <CheckCircle className="text-emerald-500" size={18} />}
                                    <h4 className="font-bold text-sm text-slate-800">{insight.title}</h4>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3">{insight.description}</p>
                                {insight.actionItem && <div className="bg-slate-900 text-white p-3 rounded-xl text-[10px] font-bold flex items-center gap-2"><Target size={14} className="text-rose-400" /> {insight.actionItem}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AIAnalyticsView;