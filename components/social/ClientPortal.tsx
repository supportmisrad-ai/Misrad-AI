'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Upload, MessageSquare, Calendar, LogOut, Send, X, ShoppingCart, Bell, BarChart3, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialPost, PaymentOrder, AgencyServiceConfig, Invoice, ManagerRequest, ClientRequest, SocialPlatform } from '@/types/social';
import type { Invoice as FinanceInvoice } from '@/types/finance';
import PaymentCheckoutPortal from './PaymentCheckoutPortal';
import { Avatar } from '@/components/Avatar';
import { getInvoices } from '@/app/actions/payments';
import { publishPost, updatePost } from '@/app/actions/posts';
import { createClientRequest, updateManagerRequest } from '@/app/actions/requests';
import ApprovalsTab from './portal/ApprovalsTab';
import TasksTab from './portal/TasksTab';
import StoreTab from './portal/StoreTab';
import CalendarTab from './portal/CalendarTab';
import UploadTab from './portal/UploadTab';
import BillingTab from './portal/BillingTab';
import AnalyticsTab from './portal/AnalyticsTab';
import { useChat } from '@ai-sdk/react';
import { openComingSoon } from '@/components/shared/coming-soon';
import { Skeleton } from '@/components/ui/skeletons';

export default function ClientPortal() {
  const { 
    activeClient,
    posts,
    managerRequests,
    clientRequests,
    marketplaceAddons,
    setIsClientMode,
    setPosts,
    setClientRequests,
    setManagerRequests,
    addToast,
    orgSlug
  } = useApp();

  const [activeTab, setActiveTab] = useState<'approvals' | 'tasks' | 'calendar' | 'upload' | 'billing' | 'store' | 'analytics'>('approvals');
  const [uploadPrefill, setUploadPrefill] = useState<{
    key: string;
    text?: string;
    isUrgent?: boolean;
    contentType?: 'post' | 'story' | 'reel' | '';
    targetPlatforms?: SocialPlatform[];
  } | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<PaymentOrder | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  // AI Chat hook with client context - only initialized when chat is opened
  const chatConfig = {
    api: '/api/chat',
    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined,
    body: {
      clientContext: activeClient ? {
        companyName: activeClient.companyName,
        name: activeClient.name,
        brandVoice: activeClient.brandVoice,
        dna: activeClient.dna,
      } : undefined,
    },
    initialMessages: activeClient ? [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: `היי ${activeClient.name}, איך אוכל לעזור לך בניהול הסושיאל?` }],
      },
    ] : [],
  };

  const chatHelpers = useChat(chatConfig as any);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = chatHelpers as unknown as {
    messages: Array<{ id: string; role: string; parts?: Array<{ type: string; text?: string }> }>;
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isChatOpen && chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Load invoices when client changes
  useEffect(() => {
    if (activeClient?.id) {
      loadInvoices();
    }
  }, [activeClient?.id]);

  const loadInvoices = async () => {
    if (!activeClient?.id) return;
    setIsLoadingInvoices(true);
    try {
      const result = await getInvoices(activeClient.id, orgSlug || undefined);
      if (result.success && result.data) {
        const mapped: Invoice[] = (result.data as FinanceInvoice[]).map((fi) => ({
          id: fi.id,
          clientId: activeClient?.id ?? '',
          amount: fi.amount,
          date: fi.issueDate instanceof Date ? fi.issueDate.toISOString() : String(fi.issueDate ?? ''),
          status: fi.status === 'paid' ? 'paid' as const : fi.status === 'overdue' ? 'overdue' as const : 'pending' as const,
          downloadUrl: '',
        }));
        setInvoices(mapped);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };

  const handleUploadNow = (request: ManagerRequest) => {
    const text = `משימה מהמנהל: ${String(request.title || '').trim()}
${String(request.description || '').trim()}`.trim();

    const type = String(request.type || '').toLowerCase();
    const isUrgent = /דחוף|היום|מייד|מחר/i.test(text);
    const contentType = type === 'media' ? 'reel' : '';

    const platforms = Array.isArray(activeClient?.activePlatforms) ? activeClient.activePlatforms : [];

    setUploadPrefill({
      key: String(request.id),
      text,
      isUrgent,
      contentType,
      targetPlatforms: platforms,
    });
    setActiveTab('upload');
  };
  const [cart, setCart] = useState<{service: AgencyServiceConfig, qty: number}[]>([]);

  const isLockedDown = activeClient?.paymentStatus === 'overdue' && (activeClient?.businessMetrics.daysOverdue || 0) >= 5;

  interface PortalNotification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
  }
  const [notifications] = useState<PortalNotification[]>([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!activeClient) return null;

  const clientPosts = posts.filter(p => p.clientId === activeClient.id);
  const clientManagerRequests = managerRequests.filter(r => r.clientId === activeClient.id);
  const clientRequestsList = clientRequests.filter(r => r.clientId === activeClient.id);

  const startPayment = async (amount: number, description: string) => {
    try {
      const { createPaymentOrder } = await import('@/app/actions/payments');
      const result = await createPaymentOrder(activeClient.id, amount, description, 2, orgSlug || undefined);
      
      if (result.success && result.data) {
        setActivePaymentOrder(result.data);
      } else {
        addToast(result.error || 'שגיאה ביצירת הזמנת תשלום', 'error');
      }
    } catch (error) {
      console.error('Payment order creation error:', error);
      addToast('שגיאה ביצירת הזמנת תשלום', 'error');
    }
  };

  const updateCart = (service: AgencyServiceConfig, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.service.id === service.id);
      if (existing) {
        const newQty = Math.max(0, existing.qty + delta);
        if (newQty === 0) return prev.filter(i => i.service.id !== service.id);
        return prev.map(i => i.service.id === service.id ? { ...i, qty: newQty } : i);
      }
      if (delta > 0) return [...prev, { service, qty: 1 }];
      return prev;
    });
  };

  const totalCartPrice = cart.reduce((sum, item) => sum + (item.service.basePrice * item.qty), 0);

  const handleApprove = (postId: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await publishPost(String(postId), resolvedOrgSlug);
      if (!res.success) {
        addToast(res.error || 'שגיאה באישור הפוסט', 'error');
        return;
      }

      const now = new Date().toISOString();
      setPosts((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          String(p.id) === String(postId)
            ? {
                ...p,
                status: 'published',
                publishedAt: now,
              }
            : p
        )
      );

      addToast('הפוסט אושר ונשלח לשידור ✅', 'success');
    })();
  };

  const handleReject = (postId: string, note: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await updatePost(String(postId), {
        orgSlug: resolvedOrgSlug,
        status: 'internal_review',
      });
      if (!res.success) {
        addToast(res.error || 'שגיאה בשליחת הפוסט לתיקון', 'error');
        return;
      }

      setPosts((prev) =>
        (Array.isArray(prev) ? prev : []).map((p) =>
          String(p.id) === String(postId)
            ? {
                ...p,
                ...(res.data ? (res.data as SocialPost) : {}),
                status: 'internal_review',
              }
            : p
        )
      );

      addToast(note ? `נשלח לתיקון: ${note}` : 'נשלח לתיקון', 'success');
    })();
  };

  const handleUpload = (media: string, text: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }
      if (!activeClient?.id) {
        addToast('חסר לקוח פעיל', 'error');
        return;
      }

      const resolvedMedia = String(media || '').trim();
      const resolvedText = String(text || '').trim();
      if (!resolvedMedia && !resolvedText) {
        addToast('אין תוכן לשליחה', 'error');
        return;
      }

      const hasDataUrl = resolvedMedia.startsWith('data:');
      const hasHttpUrl = /^https?:\/\//i.test(resolvedMedia);

      let mediaFile: Blob | undefined;
      let mediaUrl: string | undefined;

      if (hasDataUrl) {
        try {
          mediaFile = await fetch(resolvedMedia).then((r) => r.blob());
        } catch (e) {
          console.error('[ClientPortal] failed to parse data url to blob', e);
        }
      } else if (hasHttpUrl) {
        mediaUrl = resolvedMedia;
      }

      const type = resolvedMedia ? 'media' : 'text';

      const res = await createClientRequest({
        orgSlug: resolvedOrgSlug,
        clientId: String(activeClient.id),
        type,
        content: resolvedText,
        ...(mediaFile ? { mediaFile } : {}),
        ...(mediaUrl ? { mediaUrl } : {}),
      });

      if (!res.success) {
        addToast(res.error || 'שגיאה בשליחת חומרים', 'error');
        return;
      }

      if (res.data) {
        setClientRequests((prev) => [res.data as ClientRequest, ...(Array.isArray(prev) ? prev : [])]);
      }

      const managerRequestId = String(uploadPrefill?.key || '').trim();
      if (managerRequestId) {
        try {
          const completeRes = await updateManagerRequest(managerRequestId, resolvedOrgSlug, { status: 'completed' });
          if (completeRes.success) {
            setManagerRequests((prev) =>
              (Array.isArray(prev) ? prev : []).map((r) =>
                String(r.id) === String(managerRequestId)
                  ? {
                      ...r,
                      status: 'completed',
                    }
                  : r
              )
            );
          }
        } catch (e) {
          console.error('[ClientPortal] failed to auto-complete manager request after upload', e);
        } finally {
          setUploadPrefill(null);
          setActiveTab('tasks');
        }
      }

      addToast('נשלח למנהל הסושיאל ✅', 'success');
    })();
  };

  const handleCompleteRequest = (reqId: string) => {
    void (async () => {
      const resolvedOrgSlug = String(orgSlug || '').trim();
      if (!resolvedOrgSlug) {
        addToast('חסר ארגון פעיל', 'error');
        return;
      }

      const res = await updateManagerRequest(String(reqId), resolvedOrgSlug, { status: 'completed' });
      if (!res.success) {
        addToast(res.error || 'שגיאה בעדכון משימה', 'error');
        return;
      }

      setManagerRequests((prev) =>
        (Array.isArray(prev) ? prev : []).map((r) =>
          String(r.id) === String(reqId)
            ? {
                ...r,
                status: 'completed',
              }
            : r
        )
      );

      addToast('סומן כבוצע ✅', 'success');
    })();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'approvals': return <ApprovalsTab posts={clientPosts} onApprove={handleApprove} onReject={handleReject} />;
      case 'tasks': return <TasksTab requests={clientManagerRequests} onCompleteRequest={handleCompleteRequest} onUploadNow={handleUploadNow} setActiveTab={setActiveTab as (tab: unknown) => void} />;
      case 'store': return <StoreTab marketplaceAddons={marketplaceAddons} cart={cart} updateCart={updateCart} handleCheckoutStore={() => startPayment(totalCartPrice, 'רכישת שירותים')} totalCartPrice={totalCartPrice} />;
      case 'calendar': return <CalendarTab posts={clientPosts} />;
      case 'upload':
        return (
          <UploadTab
            client={activeClient!}
            clientRequests={clientRequestsList}
            onUpload={handleUpload}
            prefill={
              uploadPrefill && uploadPrefill.key
                ? {
                    text: uploadPrefill.text,
                    isUrgent: uploadPrefill.isUrgent,
                    contentType: uploadPrefill.contentType ?? '',
                    targetPlatforms: uploadPrefill.targetPlatforms ?? [],
                  }
                : undefined
            }
          />
        );
      case 'billing': return <BillingTab client={activeClient!} invoices={invoices} onStartPayment={startPayment} />;
      case 'analytics': return <AnalyticsTab client={activeClient!} posts={clientPosts} />;
      default: return <ApprovalsTab posts={clientPosts} onApprove={handleApprove} onReject={handleReject} />;
    }
  };

  if (activePaymentOrder) {
    if (!orgSlug) return null;
    return (
      <PaymentCheckoutPortal
        order={activePaymentOrder}
        client={activeClient}
        orgSlug={orgSlug}
        onSuccess={() => setActivePaymentOrder(null)}
        onCancel={() => setActivePaymentOrder(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-20 md:pb-0" dir="rtl">
      {/* Header */}
      <header className="h-20 md:h-28 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
         <div className="flex items-center gap-3 md:gap-6">
            <Avatar
              src={String(activeClient.avatar || '')}
              name={String(activeClient.companyName || activeClient.name || '')}
              alt={String(activeClient.companyName || '')}
              size="lg"
              rounded="2xl"
              className="w-10 h-10 md:w-16 md:h-16 shadow-lg border-2 border-white"
            />
            <div className="text-right">
               <h1 className="text-base md:text-2xl font-black text-slate-800 truncate max-w-[150px] md:max-w-none">{activeClient.companyName}</h1>
               <p className="text-[8px] md:text-xs font-bold text-slate-400 uppercase tracking-widest">פורטל לקוח</p>
            </div>
         </div>
         
         <div className="flex items-center gap-2 md:gap-4 relative">
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 text-slate-400 relative">
              <Bell size={20}/>
              {unreadCount > 0 && <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>}
            </button>

            {isNotificationsOpen && (
              <div className="absolute top-full right-0 mt-3 w-[min(360px,calc(100vw-2rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl z-[60] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <p className="font-black text-slate-800 text-sm">התראות</p>
                  <button onClick={() => setIsNotificationsOpen(false)} className="p-2 text-slate-400 hover:text-slate-700">
                    <X size={18} />
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-10 px-6 text-center text-slate-400">
                    <p className="text-sm font-black">אין התראות</p>
                  </div>
                ) : (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="px-4 py-3 border-b border-slate-100">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-black text-slate-800 text-sm truncate">{n.title}</p>
                            <p className="text-xs font-bold text-slate-500 mt-1">{n.message}</p>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">{n.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => setIsClientMode(false)} className="flex items-center gap-2 px-4 md:px-8 py-2.5 md:py-4 bg-slate-100 rounded-xl md:rounded-2xl font-black text-[10px] md:text-sm text-slate-400">
                <LogOut size={16} /> <span className="hidden md:block">יציאה</span>
            </button>
         </div>
      </header>

      {/* Main Navigation - Scrollable horizontal pills on all screens */}
      <div className="sticky top-20 z-40 bg-white/80 backdrop-blur px-4 py-3 md:py-4 border-b border-slate-200">
         <div className="max-w-6xl mx-auto flex gap-2 md:gap-3 overflow-x-auto no-scrollbar py-1">
            {[
              { id: 'analytics', label: 'ביצועים', icon: BarChart3 },
              { id: 'approvals', label: `אישורים`, icon: CheckCircle2, count: clientPosts.filter(p => p.status === 'pending_approval').length },
              { id: 'tasks', label: `משימות`, icon: ShieldAlert, count: clientManagerRequests.filter(r => r.status === 'pending').length },
              { id: 'store', label: 'חנות', icon: ShoppingCart },
              { id: 'calendar', label: 'לו"ז', icon: Calendar },
              { id: 'upload', label: 'העלאה', icon: Upload },
              { id: 'billing', label: 'תשלומים', icon: FileText }
            ].map(tab => {
              const Icon = tab.icon;
              return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full font-black text-[11px] md:text-sm transition-all whitespace-nowrap relative ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
                <Icon size={14} /> {tab.label}
                {tab.count ? <span className="w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] font-black border border-white ml-1">{tab.count}</span> : null}
              </button>
            )})}
         </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col gap-6 md:gap-10">
         <AnimatePresence mode="wait">
            {renderTabContent()}
         </AnimatePresence>
      </main>

      {/* Chat Bot Button - Center bottom, always visible */}
      <button 
        onClick={() => setIsChatOpen(true)} 
        style={{ 
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)'
        }}
        className="fixed sm:bottom-8 md:bottom-12 w-16 h-16 sm:w-[72px] sm:h-[72px] md:w-20 md:h-20 bg-blue-600 text-white rounded-2xl md:rounded-3xl shadow-2xl flex items-center justify-center z-[150] hover:bg-blue-700 hover:shadow-blue-500/50 active:scale-95 transition-all"
        aria-label="פתח צ'אט תמיכה"
      >
           <MessageSquare size={26} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
      </button>

      {/* Mobile Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 md:inset-auto md:bottom-8 md:left-8 w-full md:max-w-md md:h-[600px] bg-white md:rounded-[40px] shadow-2xl z-[200] flex flex-col overflow-hidden"
          >
             <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                   <div className="w-9 h-9 sm:w-10 sm:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Sparkles size={18} className="sm:w-5 sm:h-5"/></div>
                   <p className="font-black text-sm sm:text-base">עוזר AI אישי</p>
                </div>
                <button 
                  onClick={() => setIsChatOpen(false)} 
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors active:scale-95"
                  aria-label="סגור צ'אט"
                >
                  <X size={20} className="sm:w-6 sm:h-6"/>
                </button>
             </div>
             <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 flex flex-col gap-3 sm:gap-4 bg-slate-50">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-3 sm:p-4 rounded-2xl shadow-sm font-bold text-xs sm:text-sm max-w-[90%] sm:max-w-[85%] border leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-slate-800 border-slate-200'
                      }`}
                    >
                      {message.parts?.map((part: { type: string; text?: string }, i: number) => {
                        if (part.type === 'text') {
                          return (
                            <div key={`${message.id}-${i}`} className="whitespace-pre-wrap break-words">
                              {part.text}
                            </div>
                          );
                        }
                        return null;
                      })}
                      {isLoading && messages.length > 0 && message.id === messages[messages.length - 1]?.id && message.role === 'assistant' && (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-bold">
                          <span className="animate-bounce">.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                          <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-sm font-bold text-xs sm:text-sm border border-slate-200">
                      <div className="space-y-2 w-32 sm:w-40">
                        <Skeleton className="h-2.5 sm:h-3 w-28 sm:w-32 rounded-xl animate-pulse" />
                        <Skeleton className="h-2.5 sm:h-3 w-24 sm:w-28 rounded-xl animate-pulse" />
                        <Skeleton className="h-2.5 sm:h-3 w-20 sm:w-24 rounded-xl animate-pulse" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
             </div>
             <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t border-slate-200 bg-white flex gap-2 shrink-0">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="שאל אותי משהו..."
                  className="flex-1 bg-slate-50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 font-bold text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-11 h-11 sm:w-12 sm:h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:scale-95 transition-all"
                  aria-label="שלח הודעה"
                >
                  {isLoading ? (
                    <div className="flex gap-0.5">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                    </div>
                  ) : (
                    <Send size={18} className="sm:w-5 sm:h-5 rotate-180" />
                  )}
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

