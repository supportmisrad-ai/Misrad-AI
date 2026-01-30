'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  AlertCircle,
  CalendarPlus,
  Check,
  CheckCheck,
  Clock,
  CloudLightning,
  Delete,
  FileText,
  Globe,
  GripHorizontal,
  Layers,
  Link,
  Mail,
  MessageSquare,
  Mic,
  MicOff,
  MoreVertical,
  Paperclip,
  Pause,
  Phone,
  PhoneOff,
  Play,
  Search,
  Send,
  Share2,
  ShieldAlert,
  Smartphone,
  Sparkles,
  User,
  UserPlus,
  Wand2,
  X,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

export type CommunicationActivityType = 'whatsapp' | 'sms' | 'email' | 'note' | 'call' | string;

export interface CommunicationActivity {
  id: string;
  type: CommunicationActivityType;
  content: string;
  timestamp: any;
  direction?: 'outbound' | 'inbound' | string;
  metadata?: any;
}

export interface CommunicationLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  company?: string;
  status: string;
  value?: number;
  createdAt: any;
  isHot?: boolean;
  activities: CommunicationActivity[];
  productInterest?: string;
  [key: string]: any;
}

export interface CommunicationTask {
  id: string;
  title: string;
  assigneeId?: string;
  dueDate?: any;
  priority?: any;
  status?: any;
  tags?: any;
  [key: string]: any;
}

export type AddToastFn = (message: string, type?: any) => void;

export type UseToastHook = () => { addToast: AddToastFn };

export interface QuickAsset {
  id: string;
  label: string;
  value: string;
}

export interface Stage {
  id: string;
  label: string;
  accent?: string;
}

export type UseOnClickOutsideHook = (
  ref: React.RefObject<HTMLElement>,
  handler: (event: MouseEvent | TouchEvent) => void
) => void;

export type AIDraftFn = (ctx: {
  activeLead: CommunicationLead;
  selectedSendChannel: 'whatsapp' | 'sms' | 'email';
}) => Promise<string | null>;

export type CallButtonComponent = React.ComponentType<{
  phoneNumber: string;
  size?: any;
  variant?: any;
  className?: string;
  user?: any;
  onToast?: AddToastFn;
  onCallInitiated?: (phone: string) => void;
}>;

export interface CommunicationViewBaseProps {
  leads: CommunicationLead[];
  onAddActivity: (leadId: string, activity: CommunicationActivity) => void;
  onUpdateLead?: (leadId: string, updates: Partial<CommunicationLead>) => void;
  onAddTask?: (task: CommunicationTask) => void;
  initialTab?: 'phone' | 'inbox';
  user?: { id: string; phone?: string; [key: string]: any };

  onUploadRecordingAction?: (params: { leadId: string; file: File }) => Promise<void> | void;

  useToast: UseToastHook;
  useOnClickOutside: UseOnClickOutsideHook;
  CallButton: CallButtonComponent;

  QUICK_ASSETS: QuickAsset[];
  STAGES: Stage[];

  aiDraft: AIDraftFn;
}

const CommunicationViewBase: React.FC<CommunicationViewBaseProps> = ({
  leads,
  onAddActivity,
  onUpdateLead,
  onAddTask,
  initialTab = 'inbox',
  user,
  onUploadRecordingAction,
  useToast,
  useOnClickOutside,
  CallButton,
  QUICK_ASSETS,
  STAGES,
  aiDraft,
}) => {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'phone' | 'inbox'>(initialTab);

  const [activeCall, setActiveCall] = useState<CommunicationLead | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [transcript, setTranscript] = useState<{ sender: string; text: string }[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const [isUploadingRecording, setIsUploadingRecording] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'sms' | 'email'>('all');
  const [selectedSendChannel, setSelectedSendChannel] = useState<'whatsapp' | 'sms' | 'email'>('whatsapp');
  const [isDrafting, setIsDrafting] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'sending' | 'sent' | 'delivered'>>({});

  useOnClickOutside(moreMenuRef as any, () => setShowMoreMenu(false));

  const activeLead = leads.find((l) => l.id === selectedChatId);

  const handleAIDraft = async () => {
    if (!activeLead) return;
    setIsDrafting(true);
    try {
      const text = await aiDraft({ activeLead, selectedSendChannel });
      if (text && String(text).trim()) {
        setChatInput(String(text).trim());
        addToast('הטיוטה מוכנה!', 'success');
      } else {
        addToast('לא התקבלה טיוטה מהשרת', 'warning');
      }
    } catch (err) {
      console.error(err);
      addToast('שגיאה בייצור טיוטה', 'error');
    } finally {
      setIsDrafting(false);
    }
  };

  const handleUploadRecording = async (file: File) => {
    if (!onUploadRecordingAction) return;
    if (!selectedChatId) {
      addToast('בחר לקוח/ליד כדי לשייך אליו את ההקלטה', 'warning');
      return;
    }
    setIsUploadingRecording(true);
    try {
      await onUploadRecordingAction({ leadId: String(selectedChatId), file });
    } finally {
      setIsUploadingRecording(false);
    }
  };

  const chatList = useMemo(() => {
    return leads
      .filter((l) => {
        const matchesSearch =
          l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.company?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchesSearch) return false;

        if (channelFilter === 'all') return true;
        return l.activities.some((a) => a.type === channelFilter);
      })
      .map((lead) => {
        const lastMsg = [...lead.activities].reverse().find((a) => ['whatsapp', 'sms', 'email', 'note'].includes(String(a.type)));
        const hasUnread = Boolean(lead.isHot) || lead.status === 'incoming';

        return {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          avatar: lead.name.charAt(0),
          source: (lastMsg?.type as string) || 'system',
          lastMsg: lastMsg?.content || 'התחיל שיחה חדשה',
          time: lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          timestamp: lastMsg ? new Date(lastMsg.timestamp).getTime() : new Date(lead.createdAt).getTime(),
          unread: hasUnread ? 1 : 0,
          color: lead.status === 'won' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600',
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [channelFilter, leads, searchTerm]);

  useEffect(() => {
    if (!selectedChatId && chatList.length > 0) {
      setSelectedChatId(chatList[0].id);
    }
  }, [chatList, selectedChatId]);

  const activeMessages = useMemo(() => {
    if (!activeLead) return [];
    return activeLead.activities
      .filter((a) => ['whatsapp', 'sms', 'email', 'note', 'call'].includes(String(a.type)))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map((a) => {
        const isMe = a.direction === 'outbound' || a.type === 'note';

        return {
          id: a.id,
          sender: isMe ? 'me' : 'client',
          text: a.content,
          time: new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: a.type,
          subject: a.type === 'email' ? 'תגובה לפנייה שלכם' : undefined,
          metadata: (a as any)?.metadata,
        };
      });
  }, [activeLead]);

  const renderCallAnalysisActivity = (metadata: any) => {
    const ca = metadata?.callAnalysis;
    if (!ca) return null;

    const audio = ca?.audio || {};
    const audioSrc = String(audio?.signedUrl || audio?.url || '').trim();
    const analysis = ca?.analysis || {};
    const score = Number.isFinite(Number(analysis?.score)) ? Number(analysis.score) : null;
    const summary = String(analysis?.summary || '').trim();
    const tasks = Array.isArray(analysis?.topics?.tasks) ? analysis.topics.tasks : [];
    const promises = Array.isArray(analysis?.topics?.promises) ? analysis.topics.promises : [];
    const objections = Array.isArray(analysis?.objections) ? analysis.objections : [];
    const transcript = Array.isArray(analysis?.transcript) ? analysis.transcript : [];

    return (
      <div className="mt-3 space-y-3">
        {audioSrc ? (
          <audio controls className="w-full">
            <source src={audioSrc} />
          </audio>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">ציון</div>
            <div className="text-lg font-black text-slate-900">{score == null ? '—' : score}</div>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 md:col-span-2">
            <div className="text-[11px] font-black text-slate-500">סיכום</div>
            <div className="text-sm font-bold text-slate-800 whitespace-pre-wrap">{summary || '—'}</div>
          </div>
        </div>

        {promises.length || tasks.length ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-black text-slate-500">התחייבויות</div>
              <div className="mt-2 space-y-1">
                {(promises.length ? promises : ['—']).slice(0, 8).map((p: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-slate-800">{String(p)}</div>
                ))}
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-[11px] font-black text-slate-500">משימות</div>
              <div className="mt-2 space-y-1">
                {(tasks.length ? tasks : ['—']).slice(0, 10).map((t: any, idx: number) => (
                  <div key={idx} className="text-sm font-bold text-slate-800">{String(t)}</div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {objections.length ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">התנגדויות</div>
            <div className="mt-2 space-y-2">
              {objections.slice(0, 6).map((o: any, idx: number) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-xs font-black text-slate-900">{String(o?.objection || '')}</div>
                  <div className="text-sm font-bold text-slate-700 mt-1 whitespace-pre-wrap">{String(o?.reply || '')}</div>
                  {o?.next_question ? (
                    <div className="text-xs font-bold text-slate-500 mt-2">שאלה הבאה: {String(o.next_question)}</div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {transcript.length ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-3">
            <div className="text-[11px] font-black text-slate-500">תמלול (דוגמית)</div>
            <div className="mt-2 space-y-2">
              {transcript.slice(0, 10).map((t: any, idx: number) => (
                <div key={idx} className="text-sm font-bold text-slate-800">
                  <span className="text-slate-500">{String(t?.speaker || '')}:</span> {String(t?.text || '')}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    if (isCalling) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCalling]);

  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcript]);

  const handleUpdateStatus = (statusId: any) => {
    if (selectedChatId && onUpdateLead) {
      onUpdateLead(selectedChatId, { status: statusId });
      addToast(`הסטטוס עודכן ל-${STAGES.find((s) => s.id === statusId)?.label}`, 'success');
      setShowMoreMenu(false);
    }
  };

  const handleQuickTask = () => {
    if (selectedChatId && activeLead && onAddTask) {
      const newTask: CommunicationTask = {
        id: `task_${Date.now()}`,
        title: `חזור ל-${activeLead.name} לגבי השיחה האחרונה`,
        assigneeId: 'current',
        dueDate: new Date(Date.now() + 86400000),
        priority: 'medium',
        status: 'todo',
        tags: ['Communication', 'Follow Up'],
      };
      onAddTask(newTask);
      addToast('נוצרה משימת פולואפ למחר', 'success');
      setShowMoreMenu(false);
    }
  };

  const handleCall = async (numberToDial?: string) => {
    const targetNumber = numberToDial || dialNumber;
    if (!targetNumber) return;

    const callerNumber = user?.phone;
    if (!callerNumber) {
      addToast('מספר טלפון לא זמין למשתמש הנוכחי', 'error');
      return;
    }

    try {
      const response = await fetch('/api/telephony/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: targetNumber,
          from: callerNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'שגיאה בהפעלת השיחה' }));
        throw new Error(errorData.error || 'שגיאה בהפעלת השיחה');
      }

      await response.json().catch(() => ({}));

      addToast('שיחה הופעלה בהצלחה', 'success');

      setActiveTab('phone');
      setIsCalling(true);
      setCallDuration(0);
      const foundLead = leads.find((l) => l.phone.includes(targetNumber) || targetNumber.includes(l.phone));
      if (foundLead) setActiveCall(foundLead);
      else
        setActiveCall({
          id: 'temp',
          name: 'מספר לא מזוהה',
          phone: targetNumber,
          email: '',
          source: 'Dialer',
          status: 'incoming',
          value: 0,
          lastContact: new Date(),
          createdAt: new Date(),
          isHot: false,
          activities: [],
          company: 'Unknown',
          score: 0,
        } as any);
    } catch (error: any) {
      console.error('Error initiating call:', error);
      addToast(error.message || 'שגיאה בהפעלת השיחה', 'error');
    }
  };

  const handleHangup = () => {
    if (activeCall && activeCall.id !== 'temp') {
      onAddActivity(activeCall.id, {
        id: Date.now().toString(),
        type: 'call',
        content: `שיחה יוצאת (משך: ${Math.floor(callDuration / 60)}:${(callDuration % 60).toString().padStart(2, '0')})`,
        timestamp: new Date(),
        direction: 'outbound',
      });
    }
    setIsCalling(false);
    setActiveCall(null);
    setDialNumber('');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChatId) return;

    const msgId = Date.now().toString();
    setSendingStatus((prev) => ({ ...prev, [msgId]: 'sending' }));

    setTimeout(() => {
      onAddActivity(selectedChatId, {
        id: msgId,
        type: selectedSendChannel,
        content: chatInput,
        timestamp: new Date(),
        direction: 'outbound',
      });
      setSendingStatus((prev) => ({ ...prev, [msgId]: 'sent' }));

      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, [msgId]: 'delivered' }));
      }, 1500);
    }, 600);

    setChatInput('');
  };

  const handleQuickLinkSelect = (value: string) => {
    setChatInput((prev) => `${prev} ${value}`.trim());
    setShowQuickLinks(false);
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'whatsapp':
        return <MessageSquare size={12} className="text-emerald-500" />;
      case 'sms':
        return <Smartphone size={12} className="text-blue-500" />;
      case 'email':
        return <Mail size={12} className="text-amber-500" />;
      case 'call':
        return <Phone size={12} className="text-rose-500" />;
      default:
        return <MessageSquare size={12} />;
    }
  };

  return (
    <div className="p-0 md:p-8 max-w-[1920px] mx-auto h-full flex flex-col animate-fade-in pb-20 md:pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 mb-6 px-4 md:px-0 pt-4 md:pt-0">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <CloudLightning className="text-primary" strokeWidth={2.5} />
            מרכז תקשורת
          </h2>
        </div>

        <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200/50 shadow-inner w-full md:w-auto">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm md:text-base font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'inbox' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare size={18} /> Inbox אחוד
          </button>
          <button
            onClick={() => setActiveTab('phone')}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-lg text-sm md:text-base font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'phone' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Phone size={18} /> מרכזיה
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative bg-white rounded-none md:rounded-3xl border-t md:border border-slate-200 shadow-none md:shadow-xl overflow-hidden">
        {activeTab === 'inbox' && (
          <div className="flex h-full flex-col md:flex-row">
            <div
              className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-l border-slate-100 flex-col bg-slate-50/50 h-full`}
            >
              <div className="p-4 border-b border-slate-100 bg-white md:bg-transparent space-y-3">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="חיפוש שיחות..."
                    className="w-full bg-slate-50 md:bg-white border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-200 transition-all font-medium shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  {[
                    { id: 'all', label: 'הכל', icon: Layers },
                    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                    { id: 'sms', label: 'SMS', icon: Smartphone },
                    { id: 'email', label: 'Email', icon: Mail },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setChannelFilter(filter.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all whitespace-nowrap border ${
                        channelFilter === filter.id
                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <filter.icon size={12} />
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {chatList.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-white group ${
                      selectedChatId === chat.id ? 'bg-white border-l-4 border-l-primary shadow-sm' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 border transition-colors ${
                            selectedChatId === chat.id ? 'border-rose-100' : 'border-slate-200'
                          } ${chat.color}`}
                        >
                          {chat.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-sm truncate">{chat.name}</div>
                          <div className="text-xs text-slate-400 truncate">{chat.company || 'לקוח פרטי'}</div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] text-slate-400">{chat.time}</span>
                        {chat.unread > 0 && (
                          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm animate-pulse">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pl-1">
                      <p className={`text-xs truncate max-w-[200px] ${chat.unread > 0 ? 'font-bold text-slate-700' : 'text-slate-500'}`}>{chat.lastMsg}</p>
                      <div className="p-1 rounded bg-slate-50 shadow-sm border border-slate-100">{getSourceIcon(chat.source)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#e5ddd5]/30 relative h-full`}>
              {selectedChatId && activeLead ? (
                <>
                  <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10 sticky top-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 -mr-2 text-slate-400">
                        <ArrowLeft size={20} />
                      </button>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200">
                        {activeLead.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{activeLead.name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          מחובר • Omnichannel
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 relative" ref={moreMenuRef}>
                      <CallButton
                        phoneNumber={activeLead.phone}
                        size="sm"
                        variant="icon"
                        className="border border-transparent hover:border-slate-100"
                        user={user}
                        onToast={addToast}
                        onCallInitiated={(phone) => {
                          setActiveTab('phone');
                          setIsCalling(true);
                          setCallDuration(0);
                          const foundLead = leads.find((l) => l.phone.includes(phone) || phone.includes(l.phone));
                          if (foundLead) setActiveCall(foundLead);
                        }}
                      />

                      <button
                        onClick={() => setShowMoreMenu(!showMoreMenu)}
                        className={`p-2 rounded-full transition-all border border-transparent ${
                          showMoreMenu ? 'bg-slate-100 text-primary' : 'text-slate-400 hover:text-primary hover:bg-slate-50 hover:border-slate-100'
                        }`}
                      >
                        <MoreVertical size={20} />
                      </button>

                      {showMoreMenu && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl z-50 p-2 animate-scale-in origin-top-left overflow-hidden ring-1 ring-slate-900/5 border border-slate-200">
                          <div className="p-3 border-b border-slate-100 mb-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ניהול ליד מהיר</p>
                            <p className="font-bold text-slate-800 text-sm truncate">{activeLead.name}</p>
                          </div>

                          <div className="space-y-1">
                            <button
                              onClick={handleQuickTask}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-indigo-50 text-indigo-700 transition-colors text-xs font-bold text-right"
                            >
                              <CalendarPlus size={16} /> תזכיר לי על זה מחר
                            </button>
                            <button
                              onClick={() => {
                                addToast('הלינק נשלח ללקוח');
                                setShowMoreMenu(false);
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-700 transition-colors text-xs font-bold text-right"
                            >
                              <Globe size={16} /> שלח לינק לפורטל לקוח
                            </button>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <p className="px-3 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-right">שנה סטטוס עסקה</p>
                            <div className="grid grid-cols-2 gap-1 px-1">
                              {STAGES.filter((s) => s.id !== activeLead.status)
                                .slice(0, 4)
                                .map((stage) => (
                                  <button
                                    key={stage.id}
                                    onClick={() => handleUpdateStatus(stage.id)}
                                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 text-[10px] font-bold text-slate-600 transition-colors border border-transparent hover:border-slate-100 text-right"
                                  >
                                    <div className={`w-1.5 h-1.5 rounded-full ${stage.accent}`}></div>
                                    {stage.label}
                                  </button>
                                ))}
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleUpdateStatus('lost')}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-xs font-bold text-right"
                            >
                              <AlertCircle size={16} /> סגור כ"לא רלוונטי"
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                    {activeMessages.map((msg) => {
                      const isMe = msg.sender === 'me';
                      const isNote = msg.type === 'note';

                      if (isNote) {
                        return (
                          <div key={msg.id} className="flex justify-center my-4">
                            <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl text-amber-800 text-xs font-bold shadow-sm flex items-center gap-2">
                              <FileText size={12} />
                              הערה פנימית: {msg.text}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'} animate-fade-in`}>
                          <div
                            className={`
                                                relative group overflow-hidden border shadow-sm transition-all
                                                ${isMe ? 'rounded-[24px] rounded-tr-none' : 'rounded-[24px] rounded-tl-none'}
                                                ${
                                                  isMe
                                                    ? 'bg-onyx-900 border-onyx-800 text-white w-[85%] md:w-[70%]'
                                                    : 'bg-white border-slate-200 text-slate-800 w-[85%] md:w-[70%]'
                                                }
                                            `}
                          >
                            <div
                              className={`px-4 py-1.5 flex items-center justify-between border-b ${
                                isMe ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {getSourceIcon(String(msg.type))}
                                <span className={`text-[9px] font-black uppercase tracking-wider ${isMe ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {msg.type} • {isMe ? 'נשלח ממך' : 'התקבל'}
                                </span>
                              </div>
                              {msg.subject && (
                                <span className={`text-[10px] font-bold truncate max-w-[150px] italic ${isMe ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                  {msg.subject}
                                </span>
                              )}
                            </div>

                            <div className="p-4">
                              <p className={`text-sm leading-relaxed whitespace-pre-wrap font-medium ${isMe ? 'text-white' : 'text-slate-700'}`}>{msg.text}</p>

                              {String(msg.type) === 'call' ? renderCallAnalysisActivity((msg as any)?.metadata) : null}

                              <div className={`text-[10px] mt-2 flex items-center justify-end gap-1.5 ${isMe ? 'text-slate-400' : 'text-slate-400'}`}>
                                <span className="font-mono">{msg.time}</span>
                                {isMe && (
                                  <div className="flex items-center">
                                    {sendingStatus[msg.id] === 'sending' ? (
                                      <Skeleton className="w-2.5 h-2.5 rounded-full" />
                                    ) : sendingStatus[msg.id] === 'sent' ? (
                                      <Check size={12} />
                                    ) : (
                                      <CheckCheck size={12} className="text-blue-400" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3 md:p-4 bg-white border-t border-slate-200 relative">
                    <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit mx-auto md:mx-0">
                      {[
                        { id: 'whatsapp', label: 'WA', icon: MessageSquare, color: 'text-emerald-600', active: 'bg-white shadow-sm border-emerald-100' },
                        { id: 'sms', label: 'SMS', icon: Smartphone, color: 'text-blue-600', active: 'bg-white shadow-sm border-blue-100' },
                        { id: 'email', label: 'Mail', icon: Mail, color: 'text-amber-600', active: 'bg-white shadow-sm border-amber-100' },
                      ].map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          onClick={() => setSelectedSendChannel(channel.id as any)}
                          className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all border border-transparent ${
                            selectedSendChannel === channel.id
                              ? `${channel.active} ${channel.color}`
                              : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                          }`}
                        >
                          <channel.icon size={12} />
                          {channel.label}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setShowQuickLinks(!showQuickLinks)}
                          className={`p-3 rounded-2xl transition-all border ${
                            showQuickLinks ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                          }`}
                          title="נכסים מהירים"
                        >
                          <Zap size={20} className={showQuickLinks ? 'fill-current' : ''} />
                        </button>
                        <button
                          type="button"
                          onClick={handleAIDraft}
                          disabled={isDrafting}
                          className="p-3 rounded-2xl bg-onyx-900 text-white hover:bg-black transition-all shadow-xl active:scale-95 disabled:opacity-50"
                          title="טיוטת AI"
                        >
                          {isDrafting ? <Skeleton className="w-5 h-5 rounded-full bg-white/30" /> : <Wand2 size={20} />}
                        </button>
                      </div>

                      <div
                        className={`flex-1 border-2 rounded-[28px] flex flex-col px-5 py-3 transition-all ${
                          selectedSendChannel === 'whatsapp'
                            ? 'bg-emerald-50/20 border-emerald-100 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-50'
                            : selectedSendChannel === 'sms'
                              ? 'bg-blue-50/20 border-blue-100 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50'
                              : 'bg-amber-50/20 border-amber-100 focus-within:border-amber-500 focus-within:ring-4 focus-within:ring-amber-50'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            שולח ב:{' '}
                            <span
                              className={`font-black ${
                                selectedSendChannel === 'whatsapp'
                                  ? 'text-emerald-600'
                                  : selectedSendChannel === 'sms'
                                    ? 'text-blue-600'
                                    : 'text-amber-600'
                              }`}
                            >
                              {selectedSendChannel}
                            </span>
                          </span>
                        </div>
                        <textarea
                          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-1 font-medium placeholder-slate-300 resize-none h-16 custom-scrollbar"
                          placeholder={`כתוב הודעת ${selectedSendChannel === 'whatsapp' ? 'WhatsApp' : selectedSendChannel === 'sms' ? 'SMS' : 'Email'}...`}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage(e as any);
                            }
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={!chatInput.trim()}
                        className={`w-14 h-14 text-white rounded-[24px] shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                          selectedSendChannel === 'whatsapp'
                            ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                            : selectedSendChannel === 'sms'
                              ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                              : 'bg-amber-600 hover:bg-amber-700 shadow-amber-200'
                        }`}
                      >
                        <Send size={24} />
                      </button>
                    </form>

                    {showQuickLinks && (
                      <div className="absolute bottom-[90%] right-4 mb-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-in z-20">
                        <div className="p-4 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">נכסים מהירים לשליחה</div>
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {QUICK_ASSETS.map((asset) => (
                            <button
                              key={asset.id}
                              onClick={() => handleQuickLinkSelect(asset.value)}
                              className="w-full text-right px-4 py-3 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors flex items-center gap-3 group"
                            >
                              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <Link size={14} />
                              </div>
                              <span className="truncate font-bold text-slate-700">{asset.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-300">
                  <MessageSquare size={48} className="mb-4 opacity-20" />
                  <p className="font-bold">בחר לקוח מהרשימה כדי לצפות בשיחות</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'phone' && (
          <div className="flex h-full">
            {isCalling && activeCall ? (
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 p-4 md:p-8 gap-8 overflow-y-auto">
                <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl border border-slate-200 p-8 shadow-inner">
                  <div
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-full flex items-center justify-center text-4xl font-bold mb-6 shadow-xl border-4 border-white ${
                      isOnHold ? 'bg-amber-100 text-amber-500 animate-pulse' : 'bg-onyx-900 text-white'
                    }`}
                  >
                    {activeCall.name.charAt(0)}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1 text-center">{activeCall.name}</h2>
                  <p className="text-slate-500 font-mono text-lg mb-6">{activeCall.phone}</p>
                  <div className="inline-flex items-center gap-2 bg-white px-4 py-1.5 rounded-full text-sm font-bold text-primary shadow-sm mb-12">
                    <Clock size={16} /> {Math.floor(callDuration / 60)}:{(callDuration % 60).toString().padStart(2, '0')}
                  </div>

                  <div className="grid grid-cols-3 gap-4 w-full max-w-sm">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                        isMuted ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                      <span className="text-xs font-bold mt-2">השתק</span>
                    </button>
                    <button
                      onClick={() => setIsOnHold(!isOnHold)}
                      className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
                        isOnHold ? 'bg-amber-500 text-white' : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      {isOnHold ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
                      <span className="text-xs font-bold mt-2">המתנה</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 transition-all">
                      <GripHorizontal size={24} />
                      <span className="text-xs font-bold mt-2">מקשים</span>
                    </button>
                  </div>

                  <button
                    onClick={handleHangup}
                    className="mt-8 w-full max-w-sm bg-red-500 text-white font-bold py-4 rounded-2xl hover:bg-red-600 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    <PhoneOff size={24} fill="currentColor" /> נתק שיחה
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex-1 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <MessageSquare size={18} className="text-primary" /> תמלול AI בזמן אמת
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 bg-slate-50 p-4 rounded-xl">
                      {transcript.map((line, i) => (
                        <div key={i} className={`flex ${line.sender === 'agent' ? 'justify-start' : 'justify-end'}`}>
                          <div
                            className={`max-w-[90%] p-3 rounded-xl text-xs leading-relaxed font-medium ${
                              line.sender === 'agent' ? 'bg-onyx-800 text-white' : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                            }`}
                          >
                            <span className="font-black block mb-1 opacity-70 text-[9px] uppercase tracking-wider">{line.sender === 'agent' ? 'אני (סוכן)' : 'לקוח'}</span>
                            {line.text}
                          </div>
                        </div>
                      ))}
                      <div ref={transcriptEndRef}></div>
                    </div>
                  </div>

                  <div className="h-1/3 bg-gradient-to-br from-rose-50 to-white border border-rose-100 rounded-3xl p-6 shadow-sm overflow-y-auto min-h-[150px]">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Zap size={18} className="text-primary" /> המלצות טקטיות (Nexus AI)
                    </h3>
                    <div className="space-y-2">
                      {aiSuggestions.map((s, i) => (
                        <div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm flex gap-3 animate-scale-in">
                          <div className="mt-0.5 text-amber-500">
                            <ShieldAlert size={16} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">{s.title}</div>
                            <div className="text-xs text-slate-600 mt-1 font-medium">{s.content}</div>
                          </div>
                        </div>
                      ))}
                      {aiSuggestions.length === 0 && <p className="text-xs text-slate-400 text-center mt-4 font-bold">המערכת מאזינה ומנתחת התנגדויות...</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 bg-slate-50/30">
                <div className="w-full max-w-sm bg-white p-8 rounded-[3rem] shadow-2xl border border-slate-200">
                  {onUploadRecordingAction ? (
                    <div className="mb-5 flex justify-center">
                      <label
                        className={`px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-900 text-sm font-black cursor-pointer ${
                          isUploadingRecording ? 'opacity-60 pointer-events-none' : ''
                        }`}
                      >
                        {isUploadingRecording ? (
                          <>
                            <Skeleton className="inline-block ml-2 w-4 h-4 rounded-full" /> מעבד...
                          </>
                        ) : (
                          <>
                            <Paperclip size={16} className="inline-block ml-2" /> העלה הקלטה
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="audio/*"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.currentTarget.value = '';
                            if (!f) return;
                            void handleUploadRecording(f);
                          }}
                        />
                      </label>
                    </div>
                  ) : null}
                  <div className="mb-8 relative">
                    <input
                      type="text"
                      readOnly
                      value={dialNumber}
                      placeholder="חייג מספר..."
                      dir="ltr"
                      className="w-full text-4xl font-mono text-center bg-transparent focus:outline-none text-slate-800 placeholder:text-slate-200 h-16 font-black tracking-wider"
                    />
                    {dialNumber && (
                      <button
                        onClick={() => setDialNumber((prev) => prev.slice(0, -1))}
                        className="absolute right-0 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Delete size={24} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((d) => (
                      <button
                        key={d}
                        onClick={() => setDialNumber((prev) => prev + d)}
                        className="h-16 rounded-full bg-slate-50 shadow-sm border border-slate-100 text-2xl font-bold text-slate-700 hover:bg-white hover:border-rose-200 hover:text-primary active:scale-95 transition-all flex items-center justify-center"
                      >
                        {d}
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-center">
                    <button
                      onClick={() => handleCall()}
                      disabled={!dialNumber}
                      className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform hover:scale-105 active:scale-95 ${
                        dialNumber ? 'bg-emerald-50 hover:bg-emerald-600 shadow-emerald-200' : 'bg-slate-200 cursor-not-allowed'
                      }`}
                    >
                      <Phone size={32} fill="currentColor" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunicationViewBase;
