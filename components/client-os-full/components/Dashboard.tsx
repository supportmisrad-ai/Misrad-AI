import React, { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, Activity, Ghost, Clock, Zap, ShieldAlert, Sparkles, ArrowRight, Filter, AlertTriangle, Share2, MessageCircle, Star, Sun, Users, Video, Calendar, X, Check, Search, Mail, Plus, Layers, UserCheck, CheckSquare, Square, Smartphone, FileText } from 'lucide-react';
import { HealthStatus, GroupEvent, ClientStatus } from '../types';
import DailyBriefing from './DailyBriefing';
import { useNexus } from '../context/ClientContext';
import { getClientDashboardData } from '@/app/actions/client-portal-clinic';

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
  const { clients } = useNexus();
  const [feedFilter, setFeedFilter] = useState<'ALL' | FeedItemType>('ALL');
  const [showDailyBriefing, setShowDailyBriefing] = useState(false);

  const [mapSearch, setMapSearch] = useState('');
  const [mapStatus, setMapStatus] = useState<'ALL' | 'ACTIVE' | 'LEAD'>('ALL');

  const [dashboardData, setDashboardData] = useState<null | {
    totalMRR: number;
    revenueAtRisk: number;
    activeClientsCount: number;
    overdueInvoicesCount: number;
    openClientTasksCount: number;
    openAgencyTasksCount: number;
  }>(null);
  
  // Filter only active clients for the dashboard
  const activeClients = useMemo(() => clients.filter(c => c.status === ClientStatus.ACTIVE), [clients]);

  const mapClients = useMemo(
    () => clients.filter((c) => c.status === ClientStatus.ACTIVE || c.status === ClientStatus.LEAD),
    [clients]
  );

  // Event Management State
  const [events, setEvents] = useState<GroupEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);

  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [eventStep, setEventStep] = useState(1);
  const [newEventData, setNewEventData] = useState({ title: '', date: '', link: '', type: 'WEBINAR', description: '' });
  
  const [audienceMode, setAudienceMode] = useState<'TAG' | 'MANUAL'>('TAG');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [audienceSearch, setAudienceSearch] = useState('');

  const [distributionChannels, setDistributionChannels] = useState({ email: true, calendar: true, whatsapp: false });
  const [inviteMessage, setInviteMessage] = useState({ subject: '', body: '' });

  const allTags = Array.from(new Set(activeClients.flatMap(c => c.tags)));
  
  const filteredManualClients = useMemo(() => {
      return activeClients.filter(c => 
          c.name.toLowerCase().includes(audienceSearch.toLowerCase()) ||
          c.mainContact.toLowerCase().includes(audienceSearch.toLowerCase())
      );
  }, [audienceSearch, activeClients]);

  const getSelectedCount = () => {
      if (audienceMode === 'TAG') {
          return selectedTag ? activeClients.filter(c => c.tags.includes(selectedTag)).length : 0;
      }
      return selectedClientIds.length;
  };

  const toggleClientId = (id: string) => {
      setSelectedClientIds(prev => prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]);
  };

  const handleCreateEventSubmit = () => {
      const newEventObj: GroupEvent = {
          id: `evt-${Date.now()}`,
          title: newEventData.title,
          type: newEventData.type as any,
          date: new Date(newEventData.date).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          targetSegment: audienceMode === 'TAG' ? (selectedTag || 'General') : 'Custom',
          attendeesCount: getSelectedCount(),
          link: newEventData.link,
          status: 'UPCOMING',
          attendees: []
      };
      setEvents(prev => [newEventObj, ...prev]);
      window.dispatchEvent(new CustomEvent('nexus-toast', { detail: { message: `האירוע "${newEventData.title}" נוצר!`, type: 'success' } }));
      setShowCreateEvent(false);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const userData = (window as any)?.__CLIENT_OS_USER__ as { organizationId?: string | null } | undefined;
        const orgId = userData?.organizationId;
        if (!orgId) return;

        const data = await getClientDashboardData(orgId);
        if (!mounted) return;
        setDashboardData({
          totalMRR: data.totalMRR,
          revenueAtRisk: data.revenueAtRisk,
          activeClientsCount: data.activeClientsCount,
          overdueInvoicesCount: data.overdueInvoicesCount,
          openClientTasksCount: data.openClientTasksCount,
          openAgencyTasksCount: data.openAgencyTasksCount,
        });
      } catch {
        // keep local computed values
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const onCreateEvent = () => setShowCreateEvent(true);
    window.addEventListener('client-os:create-event', onCreateEvent);
    return () => window.removeEventListener('client-os:create-event', onCreateEvent);
  }, []);

  const totalRevenue = dashboardData?.totalMRR ?? activeClients.reduce((acc, c) => acc + c.monthlyRetainer, 0);
  const revenueAtRisk =
    dashboardData?.revenueAtRisk ??
    activeClients
      .filter(c => c.healthStatus === HealthStatus.AT_RISK || c.healthStatus === HealthStatus.CRITICAL)
      .reduce((acc, c) => acc + c.monthlyRetainer, 0);
  
  const riskPercentage = totalRevenue > 0 ? (revenueAtRisk / totalRevenue) * 100 : 0;

  const overdueInvoicesCount = dashboardData?.overdueInvoicesCount ?? 0;
  const openClientTasksCount = dashboardData?.openClientTasksCount ?? 0;
  const openAgencyTasksCount = dashboardData?.openAgencyTasksCount ?? 0;

  const filteredMapClients = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();

    return mapClients.filter((c) => {
      if (mapStatus === 'ACTIVE' && c.status !== ClientStatus.ACTIVE) return false;
      if (mapStatus === 'LEAD' && c.status !== ClientStatus.LEAD) return false;

      if (!q) return true;
      return (c.name || '').toLowerCase().includes(q);
    });
  }, [mapClients, mapSearch, mapStatus]);

  const openClientDashboard = (clientId: string) => {
    window.dispatchEvent(new CustomEvent('open-client-portal', { detail: clientId }));
  };

  const smartFeed = useMemo((): FeedItem[] => {
    const feed: FeedItem[] = [];
    activeClients.forEach(client => {
        if (client.engagementMetrics.silentChurnDetected) {
            feed.push({ id: `churn-${client.id}`, type: 'RISK', priority: 'CRITICAL', clientName: client.name, clientId: client.id, message: 'נעלמו לנו', subtext: `${client.engagementMetrics.daysSinceLastLogin} ימים לא התחברו`, icon: Ghost });
        }
        const labor = client.hoursLogged * client.internalHourlyRate;
        const profit = client.monthlyRetainer - (labor + client.directExpenses);
        const margin = (profit / client.monthlyRetainer) * 100;
        if (margin < 20) {
            feed.push({ id: `profit-${client.id}`, type: 'RISK', priority: 'HIGH', clientName: client.name, clientId: client.id, message: 'מפסידים כסף', subtext: `רווח צנח ל-${margin.toFixed(0)}%`, icon: TrendingDown });
        }
        if (client.healthScore > 90) {
             feed.push({ id: `referral-${client.id}`, type: 'OPPORTUNITY', priority: 'HIGH', clientName: client.name, clientId: client.id, message: 'לבקש הפניה', subtext: 'הם מתים עלינו.', icon: Share2 });
        }
    });
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    return feed.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [activeClients]);

  const filteredFeed = feedFilter === 'ALL' ? smartFeed : smartFeed.filter(item => item.type === feedFilter);

  return (
    <div className="space-y-6 md:space-y-8 animate-slide-up pb-12 relative">
      <DailyBriefing isOpen={showDailyBriefing} onClose={() => setShowDailyBriefing(false)} />

      {showCreateEvent && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-nexus-primary/60 backdrop-blur-md animate-fade-in">
              <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-nexus-primary p-6 text-white flex justify-between items-start shrink-0">
                      <div><h3 className="text-xl font-display font-bold flex items-center gap-2"><Sparkles size={20} className="text-nexus-accent" /> הפקת אירוע קהילה</h3></div>
                      <button onClick={() => setShowCreateEvent(false)}><X size={20}/></button>
                  </div>
                  <div className="p-8 flex-1 overflow-y-auto">
                      {eventStep === 1 && (
                          <div className="space-y-4">
                              <label className="block text-xs font-bold text-gray-500 uppercase">שם האירוע</label>
                              <input value={newEventData.title} onChange={(e) => setNewEventData({...newEventData, title: e.target.value})} className="w-full bg-gray-50 border p-3 rounded-xl" />
                              <button onClick={() => setEventStep(2)} className="w-full py-3 bg-nexus-primary text-white rounded-xl">המשך</button>
                          </div>
                      )}
                      {eventStep === 2 && (
                          <div className="space-y-4">
                              <h4 className="font-bold">בחר קהל יעד</h4>
                              {allTags.map(tag => (
                                  <button key={tag} onClick={() => setSelectedTag(tag)} className={`p-3 border rounded-xl w-full text-right ${selectedTag === tag ? 'bg-nexus-accent/10 border-nexus-accent' : ''}`}>#{tag}</button>
                              ))}
                              <button onClick={handleCreateEventSubmit} className="w-full py-3 bg-green-600 text-white rounded-xl">צור אירוע</button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full items-stretch sm:items-center justify-end pb-2">
        <button
          onClick={() => setShowDailyBriefing(true)}
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-[color:var(--os-accent)] text-white rounded-2xl shadow-lg ring-1 ring-[color:var(--theme-border)] hover:opacity-95 transition-all"
          type="button"
        >
          <Sun size={16} />
          <span className="font-bold text-sm whitespace-nowrap">עדכון בוקר</span>
        </button>

        <div className="ui-card px-6 py-3 flex-1 md:flex-none">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">MRR פעיל</span>
          <span className="text-2xl font-mono font-black text-slate-900">₪{totalRevenue.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="ui-card p-7 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-signal-danger/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase">כסף בסיכון</span>
              <AlertTriangle size={18} className="text-signal-danger" />
            </div>
            <div className="mt-3 text-3xl md:text-4xl font-black text-slate-900">₪{revenueAtRisk.toLocaleString()}</div>
            <div className="mt-4 w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-signal-danger" style={{ width: `${riskPercentage}%` }} />
            </div>
          </div>
        </div>

        <div className="ui-card p-7 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-signal-warning/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase">חשבוניות באיחור</span>
              <FileText size={18} className="text-signal-warning" />
            </div>
            <div className="mt-3 text-3xl md:text-4xl font-black text-slate-900">{overdueInvoicesCount}</div>
            <div className="mt-4 w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
              <div className="h-full bg-signal-warning" style={{ width: `${Math.min(100, overdueInvoicesCount * 10)}%` }} />
            </div>
          </div>
        </div>

        <div className="ui-card p-7 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[color:var(--os-accent)]/12 via-transparent to-transparent" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-500 uppercase">משימות פתוחות</span>
              <CheckSquare size={18} className="text-[color:var(--os-accent)]" />
            </div>
            <div className="mt-3 text-3xl md:text-4xl font-black text-slate-900">{openClientTasksCount + openAgencyTasksCount}</div>
            <div className="mt-4 w-full bg-gray-200/80 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[color:var(--os-accent)]"
                style={{ width: `${Math.min(100, (openClientTasksCount + openAgencyTasksCount) * 5)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
        <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="glass-card p-8 rounded-2xl flex flex-col min-h-[400px]">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <h3 className="text-xl font-display font-semibold">מפת הלקוחות</h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                    <div className="relative flex-1 lg:w-72">
                      <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={mapSearch}
                        onChange={(e) => setMapSearch(e.target.value)}
                        placeholder="חיפוש לפי שם..."
                        className="w-full pr-9 pl-3 py-2.5 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-nexus-primary/30"
                      />
                    </div>
                    <div className="flex-1 sm:flex-none sm:w-44">
                      <select
                        value={mapStatus}
                        onChange={(e) => setMapStatus(e.target.value as any)}
                        className="w-full py-2.5 px-3 bg-white/50 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 outline-none focus:border-nexus-primary/30"
                      >
                        <option value="ALL">כל הסטטוסים</option>
                        <option value="ACTIVE">פעיל</option>
                        <option value="LEAD">בהמתנה</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-nexus-muted font-medium">{filteredMapClients.length} לקוחות</div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredMapClients.map((client) => {
                    const isActive = client.status === ClientStatus.ACTIVE;
                    const statusLabel = isActive ? 'פעיל' : 'בהמתנה';
                    const statusClass = isActive
                      ? 'bg-signal-success/10 text-signal-success border-signal-success/20'
                      : 'bg-signal-warning/10 text-signal-warning border-signal-warning/20';

                    return (
                      <div
                        key={client.id}
                        className="rounded-2xl p-5 bg-white/5 backdrop-blur-md border border-white/10 shadow-sm hover:bg-white/10 transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-2xl bg-white/50 border border-gray-200 flex items-center justify-center font-black text-gray-800">
                              {(client as any).logoInitials || client.name?.slice(0, 2) || 'CL'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 truncate">{client.name}</div>
                              <div className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold mt-1 ${statusClass}`}>
                                {statusLabel}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <button
                            onClick={() => openClientDashboard(client.id)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-nexus-primary/30 hover:bg-white/70 transition-all"
                          >
                            <span>דשבורד</span>
                            <ArrowRight size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="glass-card p-6 rounded-2xl border-l-4 border-l-nexus-accent">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">קהילה ואירועים</h3>
                    <button onClick={() => setShowCreateEvent(true)} className="px-4 py-2 bg-nexus-primary text-white text-xs font-bold rounded-xl">+ אירוע חדש</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map(event => (
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
        </div>

        <div className="glass-card p-0 rounded-2xl flex flex-col h-full bg-white">
           <div className="p-6"><h3 className="font-bold uppercase tracking-widest">חדשות ומשימות</h3></div>
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
      </div>
    </div>
  );
};

export default Dashboard;
