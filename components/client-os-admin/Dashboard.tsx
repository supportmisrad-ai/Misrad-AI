import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  Ghost,
  Sparkles,
  ArrowRight,
  Share2,
  MessageCircle,
  Sun,
  Search,
  Command,
  X,
} from 'lucide-react';
import { MOCK_FEEDBACK, MOCK_GROUP_EVENTS } from '@/components/client-portal/constants';
import { HealthStatus, GroupEvent, ClientStatus } from '@/components/client-portal/types';
import DailyBriefing from './DailyBriefing';
import { useNexus } from '@/components/client-portal/context/ClientContext';
import { ClientsMap } from './ClientsMap';

type FeedItemType = 'RISK' | 'OPPORTUNITY' | 'OPS';

interface FeedItem {
  id: string;
  type: FeedItemType;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  clientName: string;
  clientId: string;
  message: string;
  subtext: string;
  icon: React.ElementType;
  value?: string;
}

const Dashboard: React.FC = () => {
  const { clients, modules } = useNexus();
  const [feedFilter, setFeedFilter] = useState<'ALL' | FeedItemType>('ALL');
  const [showDailyBriefing, setShowDailyBriefing] = useState(false);

  const [mapSearch, setMapSearch] = useState('');
  const [mapStatus, setMapStatus] = useState<'ALL' | 'ACTIVE' | 'PENDING'>('ALL');

  const activeClients = useMemo(() => clients.filter((c) => c.status === ClientStatus.ACTIVE), [clients]);

  const [events, setEvents] = useState<GroupEvent[]>(MOCK_GROUP_EVENTS);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventStep, setEventStep] = useState(1);
  const [newEventData, setNewEventData] = useState({ title: '', date: '', link: '', type: 'WEBINAR', description: '' });

  const [audienceMode, setAudienceMode] = useState<'TAG' | 'MANUAL'>('TAG');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');

  const allTags = Array.from(new Set(activeClients.flatMap((c) => c.tags)));

  const getSelectedCount = () => {
    if (audienceMode === 'TAG') {
      return selectedTag ? activeClients.filter((c) => c.tags.includes(selectedTag)).length : 0;
    }
    return selectedClientIds.length;
  };

  const handleCreateEventSubmit = () => {
    const newEventObj: GroupEvent = {
      id: `evt-${Date.now()}`,
      title: newEventData.title,
      type: newEventData.type as any,
      date: new Date(newEventData.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      targetSegment: audienceMode === 'TAG' ? selectedTag || 'General' : 'Custom',
      attendeesCount: getSelectedCount(),
      link: newEventData.link,
      status: 'UPCOMING',
      attendees: [],
    };

    setEvents((prev) => [newEventObj, ...prev]);
    window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: `האירוע "${newEventData.title}" נוצר!`, type: 'success' } }));
    setShowCreateEvent(false);
  };

  const totalRevenue = activeClients.reduce((acc, c) => acc + c.monthlyRetainer, 0);
  const revenueAtRisk = activeClients
    .filter((c) => c.healthStatus === HealthStatus.AT_RISK || c.healthStatus === HealthStatus.CRITICAL)
    .reduce((acc, c) => acc + c.monthlyRetainer, 0);

  const riskPercentage = totalRevenue > 0 ? (revenueAtRisk / totalRevenue) * 100 : 0;

  const filteredMapClients = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return clients
      .filter((c) => {
        if (!q) return true;
        return (c.name || '').toLowerCase().includes(q);
      })
      .filter((c) => {
        if (mapStatus === 'ALL') return true;
        if (mapStatus === 'ACTIVE') return c.status === ClientStatus.ACTIVE;
        return c.status !== ClientStatus.ACTIVE;
      });
  }, [clients, mapSearch, mapStatus]);

  const openClientDashboard = (clientId: string) => {
    window.dispatchEvent(new CustomEvent('open-client-portal', { detail: clientId }));
  };

  const triggerSearch = () => {
    window.dispatchEvent(new CustomEvent('open-nexus-command'));
  };

  const smartFeed = useMemo((): FeedItem[] => {
    const feed: FeedItem[] = [];

    activeClients.forEach((client) => {
      if (client.engagementMetrics.silentChurnDetected) {
        feed.push({
          id: `churn-${client.id}`,
          type: 'RISK',
          priority: 'CRITICAL',
          clientName: client.name,
          clientId: client.id,
          message: 'נעלמו לנו',
          subtext: `${client.engagementMetrics.daysSinceLastLogin} ימים לא התחברו`,
          icon: Ghost,
        });
      }

      const labor = client.hoursLogged * client.internalHourlyRate;
      const profit = client.monthlyRetainer - (labor + client.directExpenses);
      const margin = (profit / client.monthlyRetainer) * 100;
      if (margin < 20) {
        feed.push({
          id: `profit-${client.id}`,
          type: 'RISK',
          priority: 'HIGH',
          clientName: client.name,
          clientId: client.id,
          message: 'מפסידים כסף',
          subtext: `רווח צנח ל-${margin.toFixed(0)}%`,
          icon: TrendingDown,
        });
      }

      if (client.healthScore > 90) {
        feed.push({
          id: `referral-${client.id}`,
          type: 'OPPORTUNITY',
          priority: 'HIGH',
          clientName: client.name,
          clientId: client.id,
          message: 'לבקש הפניה',
          subtext: 'הם מתים עלינו.',
          icon: Share2,
        });
      }
    });

    MOCK_FEEDBACK.forEach((fb) => {
      if (fb.score <= 6)
        feed.push({
          id: `fb-risk-${fb.id}`,
          type: 'RISK',
          priority: 'HIGH',
          clientName: fb.clientName,
          clientId: fb.clientId,
          message: 'פידבק גרוע',
          subtext: `נתנו ${fb.score}`,
          icon: MessageCircle,
        });
    });

    const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return feed.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [activeClients]);

  const filteredFeed = feedFilter === 'ALL' ? smartFeed : smartFeed.filter((item) => item.type === feedFilter);

  return (
    <div className="space-y-6 md:space-y-8 animate-slide-up pb-12 relative">
      <DailyBriefing isOpen={showDailyBriefing} onClose={() => setShowDailyBriefing(false)} />

      {showCreateEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-nexus-primary/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-nexus-primary p-6 text-white flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                  <Sparkles size={20} className="text-nexus-accent" /> הפקת אירוע קהילה
                </h3>
              </div>
              <button onClick={() => setShowCreateEvent(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto">
              {eventStep === 1 && (
                <div className="space-y-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase">שם האירוע</label>
                  <input
                    value={newEventData.title}
                    onChange={(e) => setNewEventData({ ...newEventData, title: e.target.value })}
                    className="w-full bg-gray-50 border p-3 rounded-xl"
                  />
                  <button onClick={() => setEventStep(2)} className="w-full py-3 bg-nexus-primary text-white rounded-xl">
                    המשך
                  </button>
                </div>
              )}
              {eventStep === 2 && (
                <div className="space-y-4">
                  <h4 className="font-bold">בחר קהל יעד</h4>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag)}
                      className={`p-3 border rounded-xl w-full text-right ${selectedTag === tag ? 'bg-nexus-accent/10 border-nexus-accent' : ''}`}
                    >
                      #{tag}
                    </button>
                  ))}
                  <button onClick={handleCreateEventSubmit} className="w-full py-3 bg-green-600 text-white rounded-xl">
                    צור אירוע
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-end pb-2 gap-4">
        <div className="flex-1 w-full md:w-auto">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-nexus-primary tracking-tight mb-2">מה המצב?</h1>
          <p className="text-nexus-muted text-base font-medium">ניהול {activeClients.length} לקוחות פעילים</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-stretch sm:items-center">
          <div
            onClick={triggerSearch}
            className="flex-1 sm:w-64 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center gap-3 cursor-pointer hover:border-nexus-primary/50 transition-all shadow-sm group"
          >
            <Search size={18} className="text-gray-400 group-hover:text-nexus-primary" />
            <span className="text-sm text-gray-400 font-medium">חיפוש מהיר...</span>
            <div className="mr-auto flex items-center gap-1 opacity-50">
              <Command size={12} />
              <span className="text-[10px] font-bold">K</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowDailyBriefing(true)}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-nexus-primary text-white rounded-xl shadow-lg hover:bg-nexus-accent transition-all"
            >
              <Sun size={16} /> <span className="font-bold text-sm whitespace-nowrap">עדכון בוקר</span>
            </button>
            <div className="glass-card px-6 py-3 rounded-xl border-l-4 border-l-nexus-accent flex-1 md:flex-none">
              <span className="text-[10px] text-nexus-muted uppercase font-bold block">MRR פעיל</span>
              <span className="text-2xl font-mono font-bold">₪{totalRevenue.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card p-8 rounded-2xl">
          <span className="text-xs font-bold text-nexus-muted uppercase mb-2 block">כסף בסיכון</span>
          <div className="text-4xl font-display font-semibold text-nexus-primary">₪{revenueAtRisk.toLocaleString()}</div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-signal-danger" style={{ width: `${riskPercentage}%` }}></div>
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl">
          <span className="text-xs font-bold text-nexus-muted uppercase mb-2 block">רווח ממוצע</span>
          <div className="text-4xl font-display font-semibold text-nexus-primary">42%</div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-signal-success" style={{ width: '42%' }}></div>
          </div>
        </div>
        <div className="glass-card p-8 rounded-2xl">
          <span className="text-xs font-bold text-nexus-muted uppercase mb-2 block">מעורבות לקוחות</span>
          <div className="text-4xl font-display font-semibold text-nexus-primary">78%</div>
          <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-nexus-primary" style={{ width: '78%' }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
        <div className={`lg:col-span-${modules.cycles ? '2' : '3'} flex flex-col gap-6`}>
          <ClientsMap clients={filteredMapClients as any} onSelectClientAction={openClientDashboard} />

          {modules.cycles && (
            <div className="glass-card p-6 rounded-2xl border-l-4 border-l-nexus-accent animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg">קהילה ואירועים</h3>
                <button onClick={() => setShowCreateEvent(true)} className="px-4 py-2 bg-nexus-primary text-white text-xs font-bold rounded-xl">
                  + אירוע חדש
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {events.map((event) => (
                  <div key={event.id} className="bg-white border p-4 rounded-xl flex gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex flex-col items-center justify-center font-bold">
                      <span>{event.date.split('/')[0]}</span>
                      <span className="text-[10px]">{event.date.split('/')[1]}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{event.title}</h4>
                      <span className="text-xs text-gray-500">{event.attendeesCount} רשומים</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {modules.cycles && (
          <div className="glass-card p-0 rounded-2xl flex flex-col h-full bg-white">
            <div className="p-6">
              <h3 className="font-bold uppercase tracking-widest">חדשות ומשימות</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filteredFeed.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold">{item.clientName}</span>
                    <span className="text-[10px] text-gray-400">{item.priority}</span>
                  </div>
                  <div className="flex gap-3">
                    <item.icon size={16} className={item.type === 'RISK' ? 'text-red-500' : 'text-[color:var(--os-accent)]'} />
                    <span className="text-sm font-medium">{item.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
