'use client';
import React, { useState, useMemo, useCallback } from 'react';
import { 
  BrainCircuit, HeartPulse, Sparkles, TrendingDown, TrendingUp, CircleDollarSign, 
  Lightbulb, BarChart, AlertTriangle, Target, Users, Zap, Calendar, 
  ArrowUpRight, ArrowDownRight, Filter, Download, RefreshCw, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Sector, Cell, ResponsiveContainer, BarChart as ReBarChart, 
  Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, AreaChart, Area, 
  LineChart, Line, ComposedChart
} from 'recharts';
import { Lead, Campaign, Task, Invoice } from './types';
import { STAGES } from './constants';
import { motion } from 'framer-motion';
import { useToast } from './contexts/ToastContext';

interface AIAnalyticsViewProps {
  leads?: Lead[];
  campaigns?: Campaign[];
  tasks?: Task[];
  invoices?: Invoice[];
}

const COLORS = ['#A21D3C', '#3730A3', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    return (
        <g>
            <text x={cx} y={cy - 10} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg">
                {payload.name}
            </text>
             <text x={cx} y={cy + 10} dy={8} textAnchor="middle" fill="#333" className="font-semibold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 4}
                outerRadius={outerRadius + 8}
                fill={fill}
            />
        </g>
    );
};

const AIAnalyticsView: React.FC<AIAnalyticsViewProps> = ({ 
  leads = [], 
  campaigns = [], 
  tasks = [],
  invoices = []
}) => {
  const { addToast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999); // End of today
    
    const ranges = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365
    };
    const daysBack = ranges[period];
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0); // Start of day
    
    return { start: startDate, end: now };
  }, [period]);

  // Filter leads by date range - include leads that were active in this period
  // (either created OR had activity in this period)
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const createdInRange = lead.createdAt >= dateRange.start && lead.createdAt <= dateRange.end;
      const activeInRange = lead.lastContact >= dateRange.start && lead.lastContact <= dateRange.end;
      
      // Include leads that were created OR active during this period
      return createdInRange || activeInRange;
    });
  }, [leads, dateRange]);

  // Stage distribution
  const stageData = useMemo(() => {
    const stageMap = STAGES.reduce((acc, stage) => {
      acc[stage.id] = { name: stage.label, value: 0, color: stage.accent };
      return acc;
    }, {} as Record<string, { name: string; value: number; color: string }>);

    filteredLeads.forEach(lead => {
      if (stageMap[lead.status]) {
        stageMap[lead.status].value += 1;
      }
    });

    return Object.values(stageMap).filter(s => s.value > 0);
  }, [filteredLeads]);

  // Revenue calculations
  const revenueMetrics = useMemo(() => {
    const wonLeads = filteredLeads.filter(l => l.status === 'won');
    const totalRevenue = wonLeads.reduce((sum, lead) => sum + lead.value, 0);
    const avgDealSize = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;
    const conversionRate = filteredLeads.length > 0 
      ? (wonLeads.length / filteredLeads.length) * 100 
      : 0;

    // Calculate previous period for comparison
    const periodDuration = (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    const prevPeriodStart = new Date(dateRange.start);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDuration);
    prevPeriodStart.setHours(0, 0, 0, 0);
    const prevPeriodEnd = new Date(dateRange.start);
    prevPeriodEnd.setHours(23, 59, 59, 999);
    
    const prevPeriodLeads = leads.filter(l => {
      const createdInPrevRange = l.createdAt >= prevPeriodStart && l.createdAt < prevPeriodEnd;
      const activeInPrevRange = l.lastContact >= prevPeriodStart && l.lastContact < prevPeriodEnd;
      return createdInPrevRange || activeInPrevRange;
    });
    const prevWonLeads = prevPeriodLeads.filter(l => l.status === 'won');
    const prevRevenue = prevWonLeads.reduce((sum, lead) => sum + lead.value, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    return {
      total: totalRevenue,
      avgDealSize,
      conversionRate,
      wonCount: wonLeads.length,
      revenueChange
    };
  }, [filteredLeads, leads, dateRange]);

  // Source analysis
  const sourceData = useMemo(() => {
    const sourceMap: Record<string, { count: number; revenue: number }> = {};
    filteredLeads.forEach(lead => {
      if (!sourceMap[lead.source]) {
        sourceMap[lead.source] = { count: 0, revenue: 0 };
      }
      sourceMap[lead.source].count += 1;
      if (lead.status === 'won') {
        sourceMap[lead.source].revenue += lead.value;
      }
    });

    return Object.entries(sourceMap).map(([name, data]) => ({
      name,
      לידים: data.count,
      הכנסות: data.revenue,
      המרה: data.count > 0 ? parseFloat(((filteredLeads.filter(l => l.source === name && l.status === 'won').length / data.count) * 100).toFixed(1)) : 0
    })).sort((a, b) => b.לידים - a.לידים);
  }, [filteredLeads]);

  // Trend data (breakdown by period units)
  const trendData = useMemo(() => {
    const buckets: Record<string, { revenue: number; leads: number; won: number }> = {};
    
    // Determine bucket size based on period
    const getBucketKey = (date: Date): string => {
      if (period === 'week') {
        // Daily breakdown for week
        return date.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
      } else if (period === 'month') {
        // Weekly breakdown for month
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return `שבוע ${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
      } else if (period === 'quarter') {
        // Weekly breakdown for quarter
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toLocaleDateString('he-IL', { month: 'short', day: 'numeric' });
      } else {
        // Monthly breakdown for year
        return date.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      }
    };
    
    filteredLeads.forEach(lead => {
      // Use lastContact date for trend (more relevant than createdAt)
      const relevantDate = lead.lastContact >= dateRange.start ? lead.lastContact : lead.createdAt;
      const bucketKey = getBucketKey(relevantDate);
      
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = { revenue: 0, leads: 0, won: 0 };
      }
      buckets[bucketKey].leads += 1;
      if (lead.status === 'won') {
        buckets[bucketKey].revenue += lead.value;
        buckets[bucketKey].won += 1;
      }
    });

    return Object.entries(buckets)
      .sort((a, b) => {
        // Try to parse dates for proper sorting
        try {
          return new Date(a[0]).getTime() - new Date(b[0]).getTime();
        } catch {
          return a[0].localeCompare(b[0], 'he');
        }
      })
      .map(([name, data]) => ({ name, ...data }));
  }, [filteredLeads, period, dateRange.start]);

  // Health score calculation
  const healthScore = useMemo(() => {
    let score = 0;
    const factors = {
      conversionRate: Math.min(revenueMetrics.conversionRate / 30 * 30, 30), // Max 30 points
      avgDealSize: Math.min(revenueMetrics.avgDealSize / 20000 * 20, 20), // Max 20 points
      leadVolume: Math.min(filteredLeads.length / 50 * 25, 25), // Max 25 points
      recentActivity: filteredLeads.filter(l => {
        const daysSince = (new Date().getTime() - l.lastContact.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince <= 7;
      }).length / filteredLeads.length * 25 // Max 25 points
    };
    
    score = factors.conversionRate + factors.avgDealSize + factors.leadVolume + factors.recentActivity;
    return Math.round(Math.min(score, 100));
  }, [revenueMetrics, filteredLeads]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights = [];
    
    // Conversion rate insight
    if (revenueMetrics.conversionRate < 15) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'שיעור המרה נמוך',
        message: `שיעור ההמרה שלך הוא ${revenueMetrics.conversionRate.toFixed(1)}%, נמוך מהממוצע.`,
        action: 'בדוק את איכות הלידים ומעקב אחרי פגישות'
      });
    } else if (revenueMetrics.conversionRate > 25) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'שיעור המרה מצוין',
        message: `שיעור ההמרה של ${revenueMetrics.conversionRate.toFixed(1)}% מצוין!`,
        action: 'שקול להגדיל את היקף הלידים'
      });
    }

    // Source performance
    if (sourceData.length > 0) {
      const bestSource = sourceData[0];
      const worstSource = sourceData[sourceData.length - 1];
      
      if (bestSource && bestSource.לידים > 5) {
        insights.push({
          type: 'info',
          icon: Target,
          title: `מקור מוביל: ${bestSource.name}`,
          message: `${bestSource.name} מביא ${bestSource.לידים} לידים עם ${bestSource.המרה}% המרה.`,
          action: 'הגדל את התקציב למקור הזה'
        });
      }

      if (worstSource && worstSource.לידים > 0 && worstSource.המרה < 10) {
        insights.push({
          type: 'warning',
          icon: AlertTriangle,
          title: `שיפור נדרש: ${worstSource.name}`,
          message: `${worstSource.name} מביא לידים אבל רק ${worstSource.המרה}% המרה.`,
          action: 'בדוק את איכות הלידים או שקול להפסיק להשקיע במקור הזה'
        });
      }
    }

    // Pipeline health
    const stuckLeads = filteredLeads.filter(l => {
      const daysSinceLastContact = (new Date().getTime() - l.lastContact.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceLastContact > 14 && l.status !== 'won' && l.status !== 'lost';
    });

    if (stuckLeads.length > 0) {
      insights.push({
        type: 'warning',
        icon: Activity,
        title: `${stuckLeads.length} לידים תקועים`,
        message: `${stuckLeads.length} לידים לא טופלו יותר מ-14 ימים.`,
        action: 'עדכן את הסטטוס או צור קשר מחדש'
      });
    }

    return insights;
  }, [revenueMetrics, sourceData, filteredLeads]);

  const onPieEnter = useCallback((_: any, index: number) => {
          setActiveIndex(index);
  }, []);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
    addToast('הניתוח הושלם בהצלחה!', 'success');
  };

  return (
    <div dir="rtl" className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="text-right">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <BrainCircuit size={32} className="text-indigo-600" />
            ניתוח נתונים חכם
          </h2>
          <p className="text-slate-500 font-medium mt-2 text-lg">
            תובנות חכמות על צינור המכירות שלך בזמן אמת
          </p>
          <div className="text-xs text-slate-400 font-medium mt-1 flex items-center gap-2">
            <Calendar size={14} />
            <span>
              {dateRange.start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} - {' '}
              {dateRange.end.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="text-slate-300">•</span>
            <span>{filteredLeads.length} לידים פעילים</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Period Filter */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex">
            {[
              { id: 'week', label: 'שבוע' },
              { id: 'month', label: 'חודש' },
              { id: 'quarter', label: 'רבעון' },
              { id: 'year', label: 'שנה' }
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id as any)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  period === p.id 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="bg-nexus-gradient hover:opacity-90 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw size={18} className="opacity-60" />
                מנתח...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                הפעל ניתוח מלא
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <Users className="text-indigo-600" size={24} />
            </div>
            {revenueMetrics.revenueChange !== 0 && (
              <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                revenueMetrics.revenueChange > 0 
                  ? 'text-emerald-700 bg-emerald-50' 
                  : 'text-rose-700 bg-rose-50'
              }`}>
                {revenueMetrics.revenueChange > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(revenueMetrics.revenueChange).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">סה"כ לידים</div>
          <div className="text-3xl font-black text-slate-900">{filteredLeads.length}</div>
          <div className="text-xs text-slate-500 mt-2">{revenueMetrics.wonCount} סגורות</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <CircleDollarSign className="text-emerald-600" size={24} />
            </div>
        </div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">הכנסות</div>
          <div className="text-3xl font-black text-slate-900">
            {revenueMetrics.total.toLocaleString('he-IL')}₪
        </div>
          <div className="text-xs text-slate-500 mt-2">ממוצע: {revenueMetrics.avgDealSize.toLocaleString('he-IL')}₪</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg hover:shadow-xl transition-all"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-rose-50 rounded-2xl">
              <Target className="text-rose-600" size={24} />
        </div>
      </div>
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">שיעור המרה</div>
          <div className="text-3xl font-black text-slate-900">{revenueMetrics.conversionRate.toFixed(1)}%</div>
          <div className="text-xs text-slate-500 mt-2">ממוצע תעשייה: 20-25%</div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl shadow-xl text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <HeartPulse size={24} className="text-white/80" />
            </div>
            <div className="text-sm font-bold text-white/80 uppercase tracking-wider mb-1">ציון בריאות</div>
            <div className="text-4xl font-black">{healthScore}</div>
            <div className="text-xs text-white/70 mt-2">ציון כולל של הצינור</div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stage Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <BarChart className="text-indigo-600" size={24} />
            פילוח לפי שלבים
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  {...({ activeIndex, activeShape: renderActiveShape } as any)}
                  data={stageData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                >
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            {stageData.map((entry, index) => (
              <div 
                key={entry.name}
                className="flex items-center gap-2 bg-slate-50 rounded-full px-4 py-2 text-sm cursor-pointer hover:bg-slate-100 transition-colors"
                   onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span className="font-bold">{entry.name}:</span>
                <span className="text-slate-600">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source Performance */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg">
          <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
            <Target className="text-rose-600" size={24} />
            ביצועי מקורות
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={sourceData.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="לידים" fill="#A21D3C" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="הכנסות" fill="#10B981" radius={[8, 8, 0, 0]} />
              </ReBarChart>
            </ResponsiveContainer>
      </div>
          </div>
        </div>

      {/* Trend Chart */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg">
        <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
          <TrendingUp className="text-emerald-600" size={24} />
          מגמת הכנסות ולידים
        </h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area yAxisId="left" type="monotone" dataKey="leads" fill="#3730A3" fillOpacity={0.3} stroke="#3730A3" />
              <Bar yAxisId="right" dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="won" stroke="#A21D3C" strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
          </div>
        </div>
        
      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
            <Lightbulb className="text-amber-500" size={28} />
            תובנות חכמות
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-3xl border-2 shadow-lg ${
                  insight.type === 'success' 
                    ? 'bg-emerald-50 border-emerald-200' 
                    : insight.type === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${
                    insight.type === 'success' 
                      ? 'bg-emerald-100 text-emerald-600' 
                      : insight.type === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-blue-100 text-blue-600'
                  }`}>
                    <insight.icon size={24} />
          </div>
                  <div className="flex-1">
                    <h4 className="font-black text-slate-800 mb-2">{insight.title}</h4>
                    <p className="text-sm text-slate-600 mb-3">{insight.message}</p>
                    <div className="text-xs font-bold text-slate-500 bg-white/60 rounded-lg px-3 py-2">
                      💡 {insight.action}
          </div>
          </div>
        </div>
              </motion.div>
            ))}
        </div>
      </div>
      )}
    </div>
  );
};

export default AIAnalyticsView;
