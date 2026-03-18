'use client';

import { useEffect, useState } from 'react';
import { getBotLeadsAnalytics } from '@/app/actions/bot-leads';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface AnalyticsData {
  totalLeads: number;
  newLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  totalConversations: number;
  avgLeadScore: number;
}

export function BotAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const data = await getBotLeadsAnalytics();
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (isLoading || !analytics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-200 rounded-lg h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'סה"כ לידים',
      value: analytics.totalLeads,
      icon: Users,
      change: '+12%',
      changeType: 'positive',
      color: 'bg-blue-500',
    },
    {
      title: 'לידים חדשים',
      value: analytics.newLeads,
      icon: Target,
      change: '+5%',
      changeType: 'positive',
      color: 'bg-green-500',
    },
    {
      title: 'לידים מועמדים',
      value: analytics.qualifiedLeads,
      icon: TrendingUp,
      change: '+8%',
      changeType: 'positive',
      color: 'bg-purple-500',
    },
    {
      title: 'לקוחות שנרשמו',
      value: analytics.convertedLeads,
      icon: Users,
      change: '+15%',
      changeType: 'positive',
      color: 'bg-emerald-500',
    },
    {
      title: 'סה"כ שיחות',
      value: analytics.totalConversations,
      icon: MessageSquare,
      change: '+22%',
      changeType: 'positive',
      color: 'bg-orange-500',
    },
    {
      title: 'ציון ממוצע',
      value: analytics.avgLeadScore,
      icon: TrendingUp,
      suffix: '/100',
      change: '+3',
      changeType: 'positive',
      color: 'bg-cyan-500',
    },
  ];

    return (
    <div className="space-y-8 font-sans text-slate-900" dir="rtl">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">אנליטיקס לידים</h2>
          <p className="text-slate-500 font-medium mt-1">סקירת ביצועים ומגמות בזמן אמת</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading && 'animate-spin'}`} />
          {isLoading ? 'מרענן...' : 'רענון נתונים'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          
          return (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10 text-white group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stat.changeType === 'positive' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {stat.changeType === 'positive' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {stat.change}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {stat.title}
                </h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-slate-900 tracking-tight">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </span>
                  {stat.suffix && <span className="text-sm font-bold text-slate-400">{stat.suffix}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
