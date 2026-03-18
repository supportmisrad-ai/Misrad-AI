'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  CheckCheck,
  CircleAlert,
  CalendarPlus,
  Check,
  CloudLightning,
  FileText,
  Globe,
  Layers,
  Link,
  Mail,
  MessageSquare,
  Mic,
  MoreVertical,
  Phone,
  Plus,
  Search,
  Send,
  Smartphone,
  Wand2,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { CommCallAnalysis, CommPhoneTab } from './comm-view';
import type {
  CommunicationActivity,
  CommunicationLead,
  CommunicationTask,
  AddToastFn,
  UseToastHook,
  QuickAsset,
  Stage,
  UseOnClickOutsideHook,
  AIDraftFn,
  CallButtonComponent,
  ChannelFilter,
  SendChannel,
} from './comm-view/types';

// Re-export all types so consumers keep importing from this file
export type {
  CommunicationActivityType,
  CommunicationActivity,
  CommunicationLead,
  CommunicationTask,
  AddToastFn,
  UseToastHook,
  QuickAsset,
  Stage,
  UseOnClickOutsideHook,
  AIDraftFn,
  CallButtonComponent,
} from './comm-view/types';

export interface CommunicationViewBaseProps {
  leads: CommunicationLead[];
  onAddActivity: (leadId: string, SquareActivity: CommunicationActivity) => void;
  onUpdateLead?: (leadId: string, updates: Partial<CommunicationLead>) => void;
  onAddTask?: (task: CommunicationTask) => void;
  initialTab?: 'phone' | 'inbox';
  user?: { id: string; phone?: string; [key: string]: unknown };

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

  type AISuggestion = { title?: string; content?: string } & Record<string, unknown>;

  const [activeTab, setActiveTab] = useState<'phone' | 'inbox'>(initialTab);

  const [activeCall, setActiveCall] = useState<CommunicationLead | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [dialNumber, setDialNumber] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const [transcript, setTranscript] = useState<{ sender: string; text: string }[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);

  const [isUploadingRecording, setIsUploadingRecording] = useState(false);

  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [selectedSendChannel, setSelectedSendChannel] = useState<SendChannel>('whatsapp');
  const [isDrafting, setIsDrafting] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<Record<string, 'sending' | 'sent' | 'delivered' | 'failed'>>({});
  const [isSending, setIsSending] = useState(false);

  useOnClickOutside(moreMenuRef as React.RefObject<HTMLElement>, () => setShowMoreMenu(false));
  useOnClickOutside(statusMenuRef as React.RefObject<HTMLElement>, () => setShowStatusMenu(false));
  useOnClickOutside(plusMenuRef as React.RefObject<HTMLElement>, () => setShowPlusMenu(false));

  const activeLead = leads.find((l) => l.id === selectedChatId);
  const currentStage = activeLead ? STAGES.find((s) => s.id === activeLead.status) : null;

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
        const isLastMsgMe = lastMsg?.direction === 'outbound';
        const hasUnread = Boolean(lead.isHot) || lead.status === 'incoming';

        return {
          id: lead.id,
          name: lead.name,
          company: lead.company,
          avatar: lead.name.charAt(0),
          source: (lastMsg?.type as string) || 'system',
          lastMsg: lastMsg?.content || 'התחיל שיחה חדשה',
          isLastMsgMe,
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
          metadata: a.metadata,
        };
      });
  }, [activeLead]);

  useEffect(() => {
    if (isCalling) {
      const interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isCalling]);


  const handleUpdateStatus = (statusId: string) => {
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
      const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (orgSlug) {
        headers['x-org-id'] = encodeURIComponent(orgSlug);
      }
      const response = await fetch('/api/telephony/call', {
        method: 'POST',
        headers,
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
        });
    } catch (error: unknown) {
      console.error('Error initiating call:', error);
      const message = error instanceof Error ? error.message : '';
      addToast(message || 'שגיאה בהפעלת השיחה', 'error');
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

  type SendMessageEvent = React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>;

  const handleSendMessage = async (e: SendMessageEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedChatId || isSending) return;

    const msgId = Date.now().toString();
    const messageText = chatInput;
    setSendingStatus((prev) => ({ ...prev, [msgId]: 'sending' }));
    setIsSending(true);
    setChatInput('');

    // Determine recipient based on channel
    const recipient = selectedSendChannel === 'email'
      ? activeLead?.email || ''
      : activeLead?.phone || '';

    if (!recipient) {
      addToast(`חסר ${selectedSendChannel === 'email' ? 'אימייל' : 'מספר טלפון'} לליד הזה`, 'error');
      setSendingStatus((prev) => ({ ...prev, [msgId]: 'failed' }));
      setIsSending(false);
      setChatInput(messageText);
      return;
    }

    try {
      const orgSlug = getWorkspaceOrgSlugFromPathname(window.location.pathname);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (orgSlug) headers['x-org-id'] = encodeURIComponent(orgSlug);

      const response = await fetch('/api/messaging/send', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: selectedSendChannel,
          to: recipient,
          message: messageText,
          ...(selectedSendChannel === 'email' ? { subject: `הודעה מ-MISRAD AI` } : {}),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'שגיאה בשליחה' }));
        throw new Error(errorData.error || 'שגיאה בשליחת הודעה');
      }

      // Success — add activity to local state
      onAddActivity(selectedChatId, {
        id: msgId,
        type: selectedSendChannel,
        content: messageText,
        timestamp: new Date(),
        direction: 'outbound',
      });
      setSendingStatus((prev) => ({ ...prev, [msgId]: 'sent' }));

      setTimeout(() => {
        setSendingStatus((prev) => ({ ...prev, [msgId]: 'delivered' }));
      }, 1500);
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      const msg = error instanceof Error ? error.message : 'שגיאה בשליחת הודעה';
      addToast(msg, 'error');
      setSendingStatus((prev) => ({ ...prev, [msgId]: 'failed' }));
      setChatInput(messageText); // Restore message on failure
    } finally {
      setIsSending(false);
    }
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 mb-2 md:mb-4 px-1 pt-2 md:pt-0">
        <div className="flex items-center gap-4 w-full md:w-auto justify-center md:justify-start">
          <h2 className="hidden md:flex text-xl font-bold text-slate-700 items-center gap-2">
            <CloudLightning className="text-primary" size={24} strokeWidth={3} />
            מרכז תקשורת
          </h2>
          <div className="hidden md:block h-6 w-px bg-slate-200 mx-2"></div>
           <div className="bg-slate-100/80 p-1 rounded-xl flex border border-slate-200/60 w-full md:w-auto shadow-sm">
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'phone' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <Phone size={16} strokeWidth={activeTab === 'phone' ? 2.5 : 2} /> 
              <span className="text-xs md:text-sm">מרכזיה</span>
            </button>
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'inbox' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              <MessageSquare size={16} strokeWidth={activeTab === 'inbox' ? 2.5 : 2} /> 
              <span className="text-xs md:text-sm">הודעות</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 relative bg-white rounded-none md:rounded-2xl border-t md:border border-slate-200 shadow-none md:shadow-sm overflow-hidden">
        {activeTab === 'inbox' && (
          <div className="flex h-full flex-col md:flex-row">
            <div
              className={`${selectedChatId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-l border-slate-100 flex-col bg-slate-50/50 h-full`}
            >
              <div className="p-4 bg-white md:bg-transparent space-y-3 sticky top-0 z-10 backdrop-blur-xl bg-white/80 md:backdrop-blur-none">
                <div className="flex items-center justify-between md:hidden mb-2">
                   <h1 className="text-2xl font-bold text-slate-800 tracking-tight">הודעות</h1>
                   <div className="bg-slate-100 rounded-full p-1 flex items-center justify-center w-8 h-8">
                      <span className="text-xs font-bold text-slate-500">{chatList.length}</span>
                   </div>
                </div>
                <div className="relative group">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                  <input
                    type="text"
                    placeholder="חיפוש שיחות..."
                    className="w-full bg-slate-100/50 border border-transparent focus:bg-white focus:border-indigo-200 rounded-full pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium placeholder:text-slate-400"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  {(
                    [
                      { id: 'all', label: 'הכל', icon: Layers },
                      { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
                      { id: 'sms', label: 'SMS', icon: Smartphone },
                      { id: 'email', label: 'Email', icon: Mail },
                    ] satisfies Array<{ id: ChannelFilter; label: string; icon: LucideIcon }>
                  ).map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setChannelFilter(filter.id)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                        channelFilter === filter.id
                          ? 'bg-slate-800 text-white shadow-md'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 border-b border-slate-200 last:border-0 ${
                      selectedChatId === chat.id ? 'bg-indigo-50/40 border-r-2 border-r-indigo-500 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]' : 'bg-transparent border-r-2 border-r-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-base shrink-0 border transition-colors ${
                            selectedChatId === chat.id ? 'border-rose-100' : 'border-slate-100'
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
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[1.2rem] text-center shadow-sm animate-pulse">
                            {chat.unread}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pl-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {chat.isLastMsgMe && <CheckCheck size={14} className="text-blue-400 shrink-0" />}
                        <p className={`text-xs truncate max-w-[180px] ${chat.unread > 0 ? 'font-bold text-slate-700' : 'text-slate-500'}`}>{chat.lastMsg}</p>
                      </div>
                      <div className="opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">{getSourceIcon(chat.source)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${!selectedChatId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efe7dd] relative h-full bg-opacity-90`}>
              {selectedChatId && activeLead ? (
                <>
                  <div className="px-4 py-3 border-b border-slate-200 bg-white flex justify-between items-center z-10 sticky top-0 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <button onClick={() => setSelectedChatId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
                        <ArrowLeft size={22} />
                      </button>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold border-2 border-white shadow-sm">
                          {activeLead.name.charAt(0)}
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 leading-tight flex items-center gap-2">
                          {activeLead.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {/* Status Badge - 1-Click Update */}
                          {currentStage && (
                            <div className="relative" ref={statusMenuRef}>
                              <button
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 hover:shadow-sm ${
                                  // Hacky class extraction for demo, ideally pass hex colors or proper Tailwind classes
                                  currentStage.accent?.includes('bg-') 
                                    ? currentStage.accent.replace('bg-', 'bg-').replace('500', '50').replace('600', '50') + ' ' + currentStage.accent.replace('bg-', 'text-').replace('500', '700').replace('600', '700') + ' ' + currentStage.accent.replace('bg-', 'border-').replace('500', '200').replace('600', '200')
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full ${currentStage.accent}`}></div>
                                {currentStage.label}
                                <ChevronDown size={10} className="opacity-50" />
                              </button>

                              {showStatusMenu && (
                                <div className="absolute top-full right-0 mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden py-1 animate-scale-in">
                                  {STAGES.map((stage) => (
                                    <button
                                      key={stage.id}
                                      onClick={() => {
                                        handleUpdateStatus(stage.id);
                                        setShowStatusMenu(false);
                                      }}
                                      className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 transition-colors"
                                    >
                                      <div className={`w-2 h-2 rounded-full ${stage.accent}`}></div>
                                      {stage.label}
                                      {stage.id === activeLead.status && <Check size={12} className="mr-auto text-slate-400" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider flex items-center gap-1">
                            • Omnichannel
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1 relative" ref={moreMenuRef}>
                      <CallButton
                        phoneNumber={activeLead.phone}
                        size="sm"
                        variant="icon"
                        className="w-9 h-9 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-indigo-600 border border-transparent hover:border-indigo-100 transition-all shadow-sm"
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
                        className={`w-9 h-9 rounded-full transition-all flex items-center justify-center border border-transparent ${
                          showMoreMenu ? 'bg-slate-100 text-slate-900' : 'bg-transparent text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                        }`}
                      >
                        <MoreVertical size={20} />
                      </button>

                      {showMoreMenu && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl z-50 p-2 animate-scale-in origin-top-left overflow-hidden ring-1 ring-slate-900/5 border border-slate-100">
                          <div className="p-3 border-b border-slate-100 mb-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">ניהול ליד</p>
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
                            <button
                              onClick={() => handleUpdateStatus('lost')}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-xs font-bold text-right"
                            >
                              <CircleAlert size={16} /> סגור כ"לא רלוונטי"
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
                    {activeMessages.map((msg, index) => {
                      const isMe = msg.sender === 'me';
                      const isNote = msg.type === 'note';
                      
                      // Date Separator Logic
                      const prevMsg = activeMessages[index - 1];
                      const currentDate = new Date(activeLead.activities.find(a => a.id === msg.id)?.timestamp || Date.now());
                      const prevDate = prevMsg 
                        ? new Date(activeLead.activities.find(a => a.id === prevMsg.id)?.timestamp || Date.now()) 
                        : null;

                      const isNewDate = !prevDate || 
                        currentDate.getDate() !== prevDate.getDate() || 
                        currentDate.getMonth() !== prevDate.getMonth() || 
                        currentDate.getFullYear() !== prevDate.getFullYear();

                      const getDateLabel = (date: Date) => {
                        const today = new Date();
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);

                        if (date.toDateString() === today.toDateString()) return 'היום';
                        if (date.toDateString() === yesterday.toDateString()) return 'אתמול';
                        return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
                      };

                      return (
                        <React.Fragment key={msg.id}>
                          {isNewDate && (
                            <div className="flex justify-center my-6 sticky top-0 z-10">
                              <span className="bg-slate-100/90 backdrop-blur-sm text-slate-500 text-[10px] font-bold px-3 py-1 rounded-full shadow-sm border border-slate-200">
                                {getDateLabel(currentDate)}
                              </span>
                            </div>
                          )}

                          {isNote ? (
                            <div className="flex justify-center my-4">
                              <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl text-amber-800 text-xs font-bold shadow-sm flex items-center gap-2">
                                <FileText size={12} />
                                הערה פנימית: {msg.text}
                              </div>
                            </div>
                          ) : (
                            <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
                              <div
                                className={`
                                                    relative overflow-hidden shadow-sm transition-all max-w-[85%] md:max-w-[70%]
                                                    ${isMe ? 'rounded-[20px] rounded-tl-none' : 'rounded-[20px] rounded-tr-none'}
                                                    ${
                                                      isMe
                                                        ? 'bg-[#dcf8c6] md:bg-emerald-100 border border-emerald-200/50'
                                                        : 'bg-white border border-slate-100'
                                                    }
                                                `}
                              >
                                <div className="px-3 py-2 md:px-4 md:py-3">
                                  {/* Email Subject - Compact */}
                                  {msg.subject && (
                                    <div className={`text-[11px] font-bold mb-1 leading-tight ${isMe ? 'text-emerald-800' : 'text-slate-800'}`}>
                                      {msg.subject}
                                    </div>
                                  )}

                                  {/* Message Body */}
                                  <p className={`text-[15px] leading-relaxed whitespace-pre-wrap font-medium ${isMe ? 'text-slate-900' : 'text-slate-800'}`}>
                                    {msg.text}
                                  </p>

                                  {String(msg.type) === 'call' ? <CommCallAnalysis metadata={msg.metadata} /> : null}

                                  {/* Footer: Time + Icon + Checks */}
                                  <div className={`text-[10px] mt-1 flex items-center justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity ${isMe ? 'text-emerald-900' : 'text-slate-500'}`}>
                                    {/* Source Icon - Minimal */}
                                    {String(msg.type) !== 'whatsapp' && (
                                      <span title={String(msg.type)}>{getSourceIcon(String(msg.type))}</span>
                                    )}
                                    
                                    <span className="font-mono text-[9px]">{msg.time}</span>
                                    
                                    {isMe && (
                                      <div className="flex items-center">
                                        {sendingStatus[msg.id] === 'sending' ? (
                                          <Skeleton className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                                        ) : sendingStatus[msg.id] === 'sent' ? (
                                          <Check size={12} className="text-slate-400" />
                                        ) : (
                                          <CheckCheck size={12} className="text-blue-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="p-3 bg-[#f0f2f5] md:bg-[#f0f2f5] border-t border-slate-200 relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                    {/* Channel Selector - Hardened Segmented Control */}
                    <div className="flex justify-center mb-2 px-4">
                       <div className="flex gap-2 w-full max-w-sm mx-auto">
                        {(
                          [
                            { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-700', active: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
                            { id: 'sms', label: 'SMS', icon: Smartphone, color: 'text-blue-700', active: 'bg-blue-50 border-blue-200 text-blue-800' },
                            { id: 'email', label: 'Mail', icon: Mail, color: 'text-amber-700', active: 'bg-amber-50 border-amber-200 text-amber-800' },
                          ] satisfies Array<{ id: SendChannel; label: string; icon: LucideIcon; color: string; active: string }>
                        ).map((channel) => (
                          <button
                            key={channel.id}
                            type="button"
                            onClick={() => setSelectedSendChannel(channel.id)}
                            className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 border ${
                              selectedSendChannel === channel.id
                                ? `${channel.active} shadow-sm`
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600'
                            }`}
                          >
                            <channel.icon size={12} strokeWidth={2.5} />
                            {channel.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleSendMessage} className="flex items-end gap-2 relative z-20">
                      <div className="flex-1 bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 rounded-[24px] flex items-end px-2 py-1 transition-all shadow-sm">
                        <textarea
                          className="flex-1 bg-transparent border-none focus:ring-0 text-base md:text-[15px] py-3 px-2 font-medium placeholder-slate-400 resize-none h-11 max-h-32 custom-scrollbar leading-relaxed"
                          placeholder="הקלד הודעה..."
                          dir="auto"
                          rows={1}
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              void handleSendMessage(e);
                            }
                          }}
                        />
                        
                        {/* Ghost Actions - Clean & Integrated */}
                        <div className="flex items-center pb-2 pl-1 gap-1">
                          <button
                            type="button"
                            onClick={() => setShowQuickLinks(!showQuickLinks)}
                            className={`p-2 rounded-full transition-all flex items-center justify-center ${
                              showQuickLinks ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            }`}
                            title="נכסים מהירים"
                          >
                            <Zap size={18} fill={showQuickLinks ? 'currentColor' : 'none'} />
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleAIDraft}
                            disabled={isDrafting}
                            className="p-2 rounded-full transition-all flex items-center justify-center text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                            title="טיוטת AI"
                          >
                            {isDrafting ? <Skeleton className="w-4 h-4 rounded-full bg-slate-300" /> : <Wand2 size={18} />}
                          </button>
                        </div>
                      </div>

                      {chatInput.trim() ? (
                        <button
                          type="submit"
                          disabled={isSending}
                          className="w-10 h-10 md:w-11 md:h-11 rounded-full shadow-md transition-all flex items-center justify-center shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Send size={18} className="ml-0.5" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToast('הקלטת הודעות קוליות תופעל בקרוב!')}
                          className="w-10 h-10 md:w-11 md:h-11 rounded-full shadow-md transition-all flex items-center justify-center shrink-0 bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200"
                        >
                          <Mic size={20} />
                        </button>
                      )}
                    </form>

                    {showQuickLinks && (
                      <div className="absolute bottom-[90%] right-4 mb-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden animate-scale-in z-20">
                        <div className="p-3 bg-slate-50/50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">נכסים מהירים לשליחה</div>
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
            <CommPhoneTab
              isCalling={isCalling}
              activeCall={activeCall}
              callDuration={callDuration}
              dialNumber={dialNumber}
              isMuted={isMuted}
              isOnHold={isOnHold}
              transcript={transcript}
              aiSuggestions={aiSuggestions}
              isUploadingRecording={isUploadingRecording}
              showUploadRecording={Boolean(onUploadRecordingAction)}
              onSetDialNumber={setDialNumber}
              onSetIsMuted={setIsMuted}
              onSetIsOnHold={setIsOnHold}
              onHangup={handleHangup}
              onCall={handleCall}
              onUploadRecording={(f) => void handleUploadRecording(f)}
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default CommunicationViewBase;
