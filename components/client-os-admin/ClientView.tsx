'use client';

import React, { useEffect, useState } from 'react';
import { MOCK_MEETINGS, MOCK_FEEDBACK } from '@/components/client-portal/constants';
import {
  AssignedForm,
  Client,
  ClientStatus,
  HealthStatus,
  JourneyStage,
  Meeting,
  Opportunity,
  ROIRecord,
  SuccessGoal,
} from '@/components/client-portal/types';
import {
  Activity,
  Archive,
  ArrowLeft,
  Ban,
  Briefcase as BriefcaseIcon,
  Calendar,
  CreditCard,
  ExternalLink,
  Globe,
  ListTodo,
  Map,
  MessageCircleHeart,
  RotateCcw,
  Search,
  Split,
  Target,
  Users,
  X,
} from 'lucide-react';
import { RoomSwitcher } from '@/components/shared/RoomSwitcher';
import { useNexus } from '@/components/client-portal/context/ClientContext';
import { ClientFeedbackTab } from './client-tabs/ClientFeedbackTab';
import { ClientJourneyTab } from './client-tabs/ClientJourneyTab';
import { ClientMeetingsTab } from './client-tabs/ClientMeetingsTab';
import { ClientPulseTab } from './client-tabs/ClientPulseTab';
import { ClientStakeholdersTab } from './client-tabs/ClientStakeholdersTab';
import { ClientStrategyTab } from './client-tabs/ClientStrategyTab';
import { ClientTasksTab } from './client-tabs/ClientTasksTab';
import { ClientTransformTab } from './client-tabs/ClientTransformTab';
import { ClientWorkTab } from './client-tabs/ClientWorkTab';
import { PortalManagementTab } from './client-tabs/PortalManagementTab';

const ClientView: React.FC = () => {
  const { clients: contextClients, modules } = useNexus();

  const [clients, setClients] = useState<Client[]>(contextClients);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'pulse' | 'strategy' | 'tasks' | 'journey' | 'meetings' | 'work' | 'feedback' | 'transform' | 'stakeholders' | 'portal'
  >('strategy');
  const [searchTerm, setSearchTerm] = useState('');

  const [showChurnModal, setShowChurnModal] = useState(false);
  const [churnReason, setChurnReason] = useState('');
  const [churnNote, setChurnNote] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundData, setRefundData] = useState({ amount: '', reason: '' });

  const client = clients.find((c) => c.id === selectedClientId);

  const [clientMeetings, setClientMeetings] = useState<Meeting[]>([]);
  const [journeyData, setJourneyData] = useState<JourneyStage[]>([]);
  const [successGoals, setSuccessGoals] = useState<SuccessGoal[]>([]);
  const [assignedForms, setAssignedForms] = useState<AssignedForm[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);

  const [expandedMeetingId, setExpandedMeetingId] = useState<string | null>(null);
  const [meetingNotes, setMeetingNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setClients(contextClients);
  }, [contextClients]);

  useEffect(() => {
    if (!client) return;

    setJourneyData(JSON.parse(JSON.stringify(client.journey || [])));
    setSuccessGoals(JSON.parse(JSON.stringify(client.successGoals || [])));
    setAssignedForms(JSON.parse(JSON.stringify(client.assignedForms || [])));
    setOpportunities(JSON.parse(JSON.stringify(client.opportunities || [])));
    setClientMeetings(MOCK_MEETINGS.filter((m) => m.clientId === client.id));
  }, [client, selectedClientId]);

  useEffect(() => {
    const handler = (e: any) => {
      const id = String(e.detail);
      setSelectedClientId(id);
      setViewMode('DETAIL');
    };

    window.addEventListener('nexus-client-select', handler);
    return () => window.removeEventListener('nexus-client-select', handler);
  }, []);

  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.CRITICAL:
        return 'text-signal-danger bg-signal-danger/10 border-signal-danger/20';
      case HealthStatus.AT_RISK:
        return 'text-signal-warning bg-signal-warning/10 border-signal-warning/20';
      case HealthStatus.STABLE:
        return 'text-gray-600 bg-gray-100 border-gray-200';
      case HealthStatus.THRIVING:
        return 'text-signal-success bg-signal-success/10 border-signal-success/20';
    }
  };

  const getStatusLabel = (status: HealthStatus) => {
    switch (status) {
      case HealthStatus.CRITICAL:
        return 'חייב טיפול';
      case HealthStatus.AT_RISK:
        return 'טעון שיפור';
      case HealthStatus.STABLE:
        return 'הכל טוב';
      case HealthStatus.THRIVING:
        return 'לקוח זהב';
    }
  };

  const openPublicPortal = () => {
    if (!client) return;
    window.dispatchEvent(new CustomEvent('open-client-portal', { detail: client.id }));
  };

  const confirmChurn = () => {
    if (!client) return;

    setClients((prev) =>
      prev.map((c) =>
        c.id === client.id
          ? {
              ...c,
              status: ClientStatus.CHURNED,
              cancellationDate: new Date().toLocaleDateString('he-IL'),
              cancellationReason: churnReason,
              cancellationNote: churnNote,
            }
          : c
      )
    );

    const exitFeedback: any = {
      id: `exit-${Date.now()}`,
      clientId: client.id,
      clientName: client.name,
      score: 0,
      comment: `סיבת עזיבה: ${churnReason}. הערות: ${churnNote}`,
      date: new Date().toLocaleDateString('he-IL'),
      keywords: [churnReason, 'עזיבה'],
      sentiment: 'NEGATIVE',
      source: 'EXIT_INTERVIEW',
    };

    (MOCK_FEEDBACK as any).push(exitFeedback);
    window.dispatchEvent(
      new CustomEvent('nexus-toast', {
        detail: { message: `הלקוח ${client.name} הועבר לארכיון נטישה.`, type: 'info' },
      })
    );

    setShowChurnModal(false);
    setViewMode('LIST');
    setSelectedClientId(null);
  };

  const handleRefund = () => {
    if (!client || !refundData.amount) return;
    const amount = parseFloat(refundData.amount);

    const newRefund: ROIRecord = {
      id: `ref-${Date.now()}`,
      date: new Date().toLocaleDateString('he-IL'),
      value: -amount,
      description: `החזר כספי: ${refundData.reason}`,
      category: 'REFUND',
    };

    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, roiHistory: [newRefund, ...c.roiHistory] } : c)));
    window.dispatchEvent(
      new CustomEvent('nexus-toast', {
        detail: { message: `החזר על סך ₪${amount} תועד בהצלחה.`, type: 'error' },
      })
    );

    setShowRefundModal(false);
    setRefundData({ amount: '', reason: '' });
  };

  const filteredClients = clients.filter((c) => {
    if (showArchived) {
      if (c.status !== ClientStatus.ARCHIVED && c.status !== ClientStatus.LOST && c.status !== ClientStatus.CHURNED) return false;
    } else {
      if (c.status === ClientStatus.ARCHIVED || c.status === ClientStatus.LOST || c.status === ClientStatus.CHURNED) return false;
    }

    return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.industry.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (viewMode === 'LIST') {
    return (
      <div className="space-y-8 animate-fade-in pb-12 pt-safe">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-display font-bold text-nexus-primary tracking-tight mb-2">{showArchived ? 'ארכיון לקוחות' : 'תיקי לקוחות'}</h1>
            <p className="text-nexus-muted text-base tracking-wide font-medium">ניהול הפורטפוליו.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto items-stretch sm:items-center">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="חיפוש לקוח או תעשייה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 outline-none transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <RoomSwitcher />
            </div>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all whitespace-nowrap ${
                showArchived
                  ? 'bg-nexus-primary text-white border-nexus-primary'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-nexus-primary hover:text-nexus-primary'
              }`}
            >
              {showArchived ? <RotateCcw size={14} /> : <Archive size={14} />} {showArchived ? 'חזרה לתיקים פעילים' : 'צפה בארכיון'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredClients.map((c) => (
            <div
              key={c.id}
              onClick={() => {
                setSelectedClientId(c.id);
                setViewMode('DETAIL');
              }}
              className="glass-card p-6 rounded-2xl cursor-pointer hover:scale-[1.03] active:scale-[0.98] transition-all flex flex-col h-full border border-transparent"
            >
              <div className="flex justify-between mb-4">
                <div className="w-10 h-10 bg-nexus-primary text-white rounded-lg flex items-center justify-center font-bold shadow-sm">{c.logoInitials}</div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${getStatusColor(c.healthStatus)}`}>{getStatusLabel(c.healthStatus)}</span>
              </div>
              <h3 className="font-bold text-lg text-nexus-primary">{c.name}</h3>
              <p className="text-xs text-gray-500 mb-4">{c.industry}</p>

              <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">MRR</span>
                  <span className="text-sm font-mono font-bold">₪{c.monthlyRetainer.toLocaleString()}</span>
                </div>
                <div className="text-right flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">בריאות</span>
                  <span className="text-sm font-mono font-bold">{c.healthScore}%</span>
                </div>
              </div>

              {c.status === ClientStatus.CHURNED && (
                <div className="mt-4 text-[10px] font-bold text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                  <Ban size={12} /> נטש: {c.cancellationReason}
                </div>
              )}
            </div>
          ))}

          {filteredClients.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-gray-400 bg-white/50 rounded-3xl border-2 border-dashed border-gray-200">
              <Search size={48} className="mb-4 opacity-10" />
              <p className="text-lg font-medium italic">לא נמצאו לקוחות שתואמים לחיפוש "{searchTerm}"</p>
              <button onClick={() => setSearchTerm('')} className="mt-4 text-nexus-primary font-bold hover:underline">
                נקה חיפוש
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!client) return null;

  const availableTabs = [
    { id: 'strategy', icon: Target, label: 'אסטרטגיה & ROI', module: null },
    { id: 'portal', icon: Globe, label: 'ניהול פורטל', module: 'portals' },
    { id: 'pulse', icon: Activity, label: 'בריאות התיק', module: null },
    { id: 'stakeholders', icon: Users, label: 'אנשי קשר', module: null },
    { id: 'tasks', icon: ListTodo, label: 'משימות', module: null },
    { id: 'journey', icon: Map, label: 'תהליך', module: 'workflows' },
    { id: 'meetings', icon: Calendar, label: 'פגישות', module: null },
    { id: 'work', icon: BriefcaseIcon, label: 'עבודות', module: null },
    { id: 'transform', icon: Split, label: 'לפני / אחרי', module: 'portals' },
    { id: 'feedback', icon: MessageCircleHeart, label: 'משובים', module: 'feedback' },
  ].filter((tab) => !tab.module || modules[tab.module as keyof typeof modules]);

  return (
    <div className="h-full flex flex-col gap-6 animate-slide-up relative pb-24 pt-safe">
      {showChurnModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-nexus-primary/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-red-600 p-6 text-white flex items-center gap-3">
              <Ban size={24} />
              <div>
                <h3 className="text-xl font-bold">פרוטוקול נטישה: {client.name}</h3>
                <p className="text-white/70 text-sm">למה הם עוזבים אותנו?</p>
              </div>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">סיבת עזיבה עיקרית</label>
                <select
                  value={churnReason}
                  onChange={(e) => setChurnReason(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-red-500"
                >
                  <option value="">בחר סיבה...</option>
                  <option value="מחיר">יקר מדי / חוסר תקציב</option>
                  <option value="ביצועים">חוסר שביעות רצון מהתוצאות</option>
                  <option value="יחסים">קשר אישי לקוי</option>
                  <option value="מעבר פנימי">הפסיקו את הפעילות כליל</option>
                  <option value="מתחרה">עברו למתחרה</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">הערות לסיום</label>
                <textarea
                  value={churnNote}
                  onChange={(e) => setChurnNote(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl h-24 resize-none outline-none focus:border-red-500"
                  placeholder="מה אפשר ללמוד מזה?"
                />
              </div>
              <div className="flex gap-4">
                <button onClick={() => setShowChurnModal(false)} className="flex-1 py-3 text-gray-500 font-bold">
                  ביטול
                </button>
                <button
                  onClick={confirmChurn}
                  disabled={!churnReason}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50"
                >
                  אשר נטישה
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRefundModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-nexus-primary/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="bg-nexus-primary p-6 text-white flex items-center gap-3">
              <CreditCard size={24} />
              <div>
                <h3 className="text-xl font-bold">תיעוד החזר כספי</h3>
                <p className="text-white/70 text-sm">הפחתה מהרווח ומה-ROI</p>
              </div>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">סכום ההחזר (₪)</label>
                <input
                  type="number"
                  value={refundData.amount}
                  onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xl outline-none focus:border-nexus-primary"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase block mb-2">סיבת ההחזר</label>
                <input
                  type="text"
                  value={refundData.reason}
                  onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-nexus-primary"
                  placeholder="למשל: פיצוי על איחור בלו״ז"
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button onClick={() => setShowRefundModal(false)} className="flex-1 py-3 text-gray-500 font-bold">
                  בטל
                </button>
                <button
                  onClick={handleRefund}
                  disabled={!refundData.amount}
                  className="flex-1 py-3 bg-nexus-primary text-white rounded-xl font-bold"
                >
                  בצע החזר
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setViewMode('LIST');
              setSelectedClientId(null);
            }}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-gray-500 text-sm font-medium">חזרה לרשימה</h2>
        </div>

        {modules.portals && (
          <button
            onClick={openPublicPortal}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-nexus-accent text-nexus-accent rounded-xl text-xs font-bold hover:bg-nexus-accent hover:text-white transition-all shadow-sm"
          >
            <ExternalLink size={14} /> פורטל לקוח (לינק חיצוני)
          </button>
        )}
      </div>

      <div className="glass-card p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center relative overflow-hidden">
        <div className="flex items-center gap-8 relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-nexus-primary text-white flex items-center justify-center text-3xl font-display font-bold shadow-xl">
            {client.logoInitials}
          </div>
          <div>
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-display font-bold text-gray-900">{client.name}</h1>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRefundModal(true)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg border border-red-100"
                  title="בצע החזר כספי"
                >
                  <CreditCard size={18} />
                </button>
                <button
                  onClick={() => setShowChurnModal(true)}
                  className="p-2 text-gray-400 hover:text-red-600 rounded-lg border border-gray-200"
                  title="סיום התקשרות (נטישה)"
                >
                  <Ban size={18} />
                </button>
              </div>
            </div>
            <div className="flex gap-3 mt-2">
              <span className={`text-xs px-3 py-1 rounded-full font-bold ${getStatusColor(client.healthStatus)}`}>{getStatusLabel(client.healthStatus)}</span>
              <span className="text-xs text-gray-500 py-1">{client.industry}</span>
            </div>
          </div>
        </div>
        <div className="text-left mt-6 md:mt-0">
          <span className="text-xs text-gray-400 font-bold uppercase block mb-1">רווח נקי משוער</span>
          <span className="text-4xl font-display font-bold text-nexus-primary">
            ₪{(client.monthlyRetainer - client.hoursLogged * client.internalHourlyRate - client.directExpenses).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200/60 overflow-x-auto no-scrollbar scroll-smooth">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-6 py-4 text-sm font-bold transition-all relative rounded-t-xl flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id ? 'text-nexus-primary bg-white shadow-sm ring-1 ring-gray-200' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-10 custom-scrollbar">
        {activeTab === 'strategy' && <ClientStrategyTab client={client} opportunities={opportunities} onAddOpportunity={() => {}} />}
        {activeTab === 'portal' && <PortalManagementTab client={client} />}
        {activeTab === 'pulse' && (
          <ClientPulseTab client={client} aiInsight={null} isInsightLoading={false} onGenerateInsight={() => {}} />
        )}
        {activeTab === 'stakeholders' && <ClientStakeholdersTab client={client} />}
        {activeTab === 'tasks' && (
          <ClientTasksTab client={client} assignedForms={assignedForms} onAssignForm={() => {}} activeSequences={[]} scheduledAutomations={[]} />
        )}
        {activeTab === 'journey' && <ClientJourneyTab journeyData={journeyData} />}
        {activeTab === 'meetings' && (
          <ClientMeetingsTab
            meetings={clientMeetings}
            expandedMeetingId={expandedMeetingId}
            onToggleExpand={setExpandedMeetingId}
            meetingNotes={meetingNotes}
            onNoteChange={(id, val) => setMeetingNotes({ ...meetingNotes, [id]: val })}
            onSaveNote={() => {}}
            onToggleTask={() => {}}
          />
        )}
        {activeTab === 'work' && <ClientWorkTab client={client} />}
        {activeTab === 'transform' && <ClientTransformTab client={client} />}
        {activeTab === 'feedback' && <ClientFeedbackTab feedback={MOCK_FEEDBACK.filter((f) => f.clientId === client.id)} />}
      </div>
    </div>
  );
};

export default ClientView;
