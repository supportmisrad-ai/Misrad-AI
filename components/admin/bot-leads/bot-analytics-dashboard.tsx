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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">אנליטיקס לידים</h2>
          <p className="text-gray-500">סקירת ביצועים בזמן אמת</p>
        </div>
        <button
          onClick={fetchAnalytics}
          disabled={isLoading}
          className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading && 'animate-spin'}`} />
          רענן
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const ChangeIcon = stat.changeType === 'positive' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <div key={stat.title} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500">
                  {stat.title}
                </h3>
                <div className={`p-2 rounded-full ${stat.color} bg-opacity-20`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold">
                  {stat.value.toLocaleString()}
                  {stat.suffix}
                </div>
                <div className={`flex items-center text-sm ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  <ChangeIcon className="w-4 h-4 ml-1" />
                  {stat.change}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
