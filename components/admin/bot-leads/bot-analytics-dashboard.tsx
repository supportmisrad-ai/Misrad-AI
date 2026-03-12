'use client';

import { useEffect, useState } from 'react';
import { getBotLeadsAnalytics } from '@/app/actions/bot-leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Target,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
      toast.error('שגיאה בטעינת נתונים');
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
          <Card key={i} className="animate-pulse">
            <CardContent className="h-32" />
          </Card>
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
          <p className="text-muted-foreground">סקירת ביצועים בזמן אמת</p>
        </div>
        <Button
          variant="outline"
          onClick={fetchAnalytics}
          disabled={isLoading}
        >
          <RefreshCw className={cn('w-4 h-4 ml-2', isLoading && 'animate-spin')} />
          רענן
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const ChangeIcon = stat.changeType === 'positive' ? ArrowUpRight : ArrowDownRight;
          
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn('p-2 rounded-full', stat.color, 'bg-opacity-20')}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-bold">
                    {stat.value.toLocaleString()}
                    {stat.suffix}
                  </div>
                  <div className={cn(
                    'flex items-center text-sm',
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  )}>
                    <ChangeIcon className="w-4 h-4 ml-1" />
                    {stat.change}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
