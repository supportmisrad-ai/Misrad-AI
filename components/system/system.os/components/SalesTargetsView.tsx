
import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { Target, TrendingUp, Calendar, Trophy, CircleAlert } from 'lucide-react';

interface SystemTargetsViewProps {
  leads: Lead[];
}

const SystemTargetsView: React.FC<SystemTargetsViewProps> = ({ leads }) => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const now = new Date();
  const monthLabel = now.toLocaleDateString('he-IL', { month: 'long' });
  const quarterNumber = Math.floor(now.getMonth() / 3) + 1;
  const yearNumber = now.getFullYear();
  const periodLabel = period === 'month'
    ? monthLabel
    : period === 'quarter'
      ? `רבעון ${quarterNumber}`
      : String(yearNumber);

  // Calculate actuals based on WON leads
  const actualRevenue = useMemo(() => {
      // In a real app, filter by date based on 'period'. 
      // For this demo, we'll just sum all won leads or mock it slightly for visuals.
      return leads
        .filter(l => l.status === 'won')
        .reduce((sum, l) => sum + l.value, 0);
  }, [leads, period]);

  return (
    <div className="p-4 md:p-8 h-full overflow-y-auto custom-scrollbar animate-fade-in pb-20">
        
        <div className="flex justify-between items-center mb-8">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Target className="text-primary" />
                    יעדים
                </h2>
                <p className="text-slate-500 text-sm">מעקב אחר ביצועים מול יעדי החברה.</p>
            </div>
            
            <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200">
                {(['month', 'quarter', 'year'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            period === p ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {p === 'month' ? 'חודשי' : p === 'quarter' ? 'רבעוני' : 'שנתי'}
                    </button>
                ))}
            </div>
        </div>

        {/* Main Gauge / Progress */}
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden mb-8">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-8">
                <div>
                    <div className="text-red-300 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                        <TrendingUp size={14} /> מצב ({periodLabel})
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl md:text-6xl font-black tracking-tight">
                            ₪{actualRevenue.toLocaleString()}
                        </span>
                    </div>
                </div>
                
                <div className="w-full md:w-1/3">
                    <div className="text-xs font-bold mb-2 text-slate-300">אין יעד מוגדר להצגה</div>
                </div>
            </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <Trophy size={14} className="text-yellow-500" /> סגירות החודש
                </div>
                <div className="text-3xl font-bold text-slate-800">
                    {leads.filter(l => l.status === 'won').length}
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <Calendar size={14} className="text-indigo-500" /> קצב סגירה ממוצע
                </div>
                <div className="text-3xl font-bold text-slate-800">
                    —
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="text-slate-400 text-xs font-bold uppercase mb-2 flex items-center gap-2">
                    <CircleAlert size={14} className="text-rose-500" /> פער מהיעד
                </div>
                <div className="text-3xl font-bold text-rose-600">
                    —
                </div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
            <h3 className="font-bold text-slate-800 mb-6">ביצועים מול יעד (שבועי)</h3>
            <div className="flex-1 w-full flex items-center justify-center text-slate-400 text-sm">
                אין נתונים להצגה.
            </div>
        </div>

    </div>
  );
};

export default SystemTargetsView;
