'use client';

import React, { useState, useMemo } from 'react';
import { Lead } from './types';
import { Target, TrendingUp, Calendar, Trophy, CircleAlert } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

interface SystemTargetsViewProps {
  leads: Lead[];
}

const SystemTargetsView: React.FC<SystemTargetsViewProps> = ({ leads }) => {
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // Mock Targets (usually would come from settings/DB)
  const TARGETS = {
      month: 250000,
      quarter: 750000,
      year: 3000000
  };

  // Calculate actuals based on WON leads
  const actualRevenue = useMemo(() => {
      // In a real app, filter by date based on 'period'. 
      // For this demo, we'll just sum all won leads or mock it slightly for visuals.
      return leads
        .filter(l => l.status === 'won')
        .reduce((sum, l) => sum + l.value, 0);
  }, [leads]);

  const progress = Math.min((actualRevenue / TARGETS[period]) * 100, 100);
  const isOnTrack = progress >= 75;

  const chartData = [
      { name: 'ינואר', target: TARGETS.month, actual: actualRevenue * 0.3 },
      { name: 'פברואר', target: TARGETS.month, actual: actualRevenue * 0.4 },
      { name: 'מרץ', target: TARGETS.month, actual: actualRevenue * 0.3 },
  ];

  return (
    <div className="h-full p-4 md:p-8 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 mb-2">יעדים ומטרות</h1>
                <p className="text-slate-600">מעקב אחר ביצועים מול יעדים</p>
            </div>
            <div className="flex gap-2">
                {(['month', 'quarter', 'year'] as const).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                            period === p
                                ? 'bg-primary text-white shadow-lg'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        {p === 'month' ? 'חודשי' : p === 'quarter' ? 'רבעוני' : 'שנתי'}
                    </button>
                ))}
            </div>
        </div>

        {/* Progress Cards */}
        <div className="grid md:grid-cols-3 gap-6">
            {/* Revenue Progress */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <Target className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-600">יעד הכנסות</p>
                            <p className="text-2xl font-black text-slate-900">
                                ₪{TARGETS[period].toLocaleString('he-IL')}
                            </p>
                        </div>
                    </div>
                    {isOnTrack ? (
                        <Trophy className="text-emerald-500" size={24} />
                    ) : (
                        <CircleAlert className="text-amber-500" size={24} />
                    )}
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">הושג:</span>
                        <span className="font-bold text-slate-900">
                            ₪{actualRevenue.toLocaleString('he-IL')}
                        </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                                isOnTrack ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-slate-500">
                        {progress.toFixed(1)}% מהיעד
                    </p>
                </div>
            </div>

            {/* Leads Progress */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-600">לידים חדשים</p>
                        <p className="text-2xl font-black text-slate-900">
                            {leads.filter(l => l.status === 'חדש').length}
                        </p>
                    </div>
                </div>
                <div className="text-xs text-slate-500">
                    לידים חדשים החודש
                </div>
            </div>

            {/* Conversion Rate */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center">
                        <Calendar className="text-rose-600" size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-600">שיעור המרה</p>
                        <p className="text-2xl font-black text-slate-900">
                            {leads.length > 0 
                                ? ((leads.filter(l => l.status === 'won').length / leads.length) * 100).toFixed(1)
                                : '0'
                            }%
                        </p>
                    </div>
                </div>
                <div className="text-xs text-slate-500">
                    עסקאות סגורות / לידים
                </div>
            </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <h2 className="text-xl font-black text-slate-900 mb-6">מגמת ביצועים</h2>
            <div style={{ width: '100%', height: '300px', minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip 
                            contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="target" fill="#cbd5e1" name="יעד" />
                        <Bar dataKey="actual" fill="#10b981" name="ביצוע" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default SystemTargetsView;

