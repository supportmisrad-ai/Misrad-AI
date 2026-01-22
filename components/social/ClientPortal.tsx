'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CheckCircle2, Upload, MessageSquare, Calendar, LogOut, Send, X, ShoppingCart, Bell, BarChart3, FileText, ShieldAlert, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { SocialPost, PaymentOrder, AgencyServiceConfig, Invoice } from '@/types/social';
import PaymentCheckoutPortal from './PaymentCheckoutPortal';
import { Avatar } from '@/components/Avatar';
import { getInvoices } from '@/app/actions/payments';
import ApprovalsTab from './portal/ApprovalsTab';
import TasksTab from './portal/TasksTab';
import StoreTab from './portal/StoreTab';
import CalendarTab from './portal/CalendarTab';
import UploadTab from './portal/UploadTab';
import BillingTab from './portal/BillingTab';
import AnalyticsTab from './portal/AnalyticsTab';
import { useChat } from '@ai-sdk/react';
import { openComingSoon } from '@/components/shared/ComingSoonPortal';
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
    addToast 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'approvals' | 'tasks' | 'calendar' | 'upload' | 'billing' | 'store' | 'analytics'>('approvals');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activePaymentOrder, setActivePaymentOrder] = useState<PaymentOrder | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoadingInvoices, setIsLoadingInvoices] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  const activeOrgId = (activeClient as any)?.organizationId;

  // AI Chat hook with client context
  const { messages, input, handleInputChange, handleSubmit, isLoading } = (useChat as any)({
    api: '/api/chat',
    headers: activeOrgId ? { 'x-org-id': activeOrgId } : undefined,
    body: {
      clientContext: activeClient ? {
        companyName: activeClient.companyName,
        name: activeClient.name,
        brandVoice: activeClient.brandVoice,
        dna: activeClient.dna,
        organizationId: activeOrgId,
      } : undefined,
    },
    initialMessages: activeClient ? [
      {
        id: 'welcome',
        role: 'assistant',
        parts: [{ type: 'text', text: `היי ${activeClient.name}, איך אוכל לעזור לך בניהול הסושיאל?` }],
      },
    ] : [],
  });

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
      const result = await getInvoices(activeClient.id);
      if (result.success && result.data) {
        setInvoices(result.data as any);
      }
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setIsLoadingInvoices(false);
    }
  };
  const [cart, setCart] = useState<{service: AgencyServiceConfig, qty: number}[]>([]);

  const isLockedDown = activeClient?.paymentStatus === 'overdue' && (activeClient?.businessMetrics.daysOverdue || 0) >= 5;

  const [notifications] = useState<any[]>([]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (!activeClient) return null;

  const clientPosts = posts.filter(p => p.clientId === activeClient.id);
  const clientManagerRequests = managerRequests.filter(r => r.clientId === activeClient.id);
  const clientRequestsList = clientRequests.filter(r => r.clientId === activeClient.id);

  const startPayment = async (amount: number, description: string) => {
    try {
      const { createPaymentOrder } = await import('@/app/actions/payments');
      const result = await createPaymentOrder(activeClient.id, amount, description, 2);
      
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
    openComingSoon();
  };

  const handleReject = (postId: string, note: string) => {
    openComingSoon();
  };

  const handleUpload = (media: string, text: string) => {
    openComingSoon();
  };

  const handleCompleteRequest = (reqId: string) => {
    openComingSoon();
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'approvals': return <ApprovalsTab posts={clientPosts} onApprove={handleApprove} onReject={handleReject} />;
      case 'tasks': return <TasksTab requests={clientManagerRequests} onCompleteRequest={handleCompleteRequest} setActiveTab={setActiveTab} />;
      case 'store': return <StoreTab marketplaceAddons={marketplaceAddons} cart={cart} updateCart={updateCart} handleCheckoutStore={() => startPayment(totalCartPrice, 'רכישת שירותים')} totalCartPrice={totalCartPrice} />;
      case 'calendar': return <CalendarTab posts={clientPosts} />;
      case 'upload': return <UploadTab client={activeClient as any} clientRequests={clientRequestsList} onUpload={handleUpload} />;
      case 'billing': return <BillingTab client={activeClient as any} invoices={invoices as any} onStartPayment={startPayment} />;
      case 'analytics': return <AnalyticsTab client={activeClient as any} posts={clientPosts} />;
      default: return <ApprovalsTab posts={clientPosts} onApprove={handleApprove} onReject={handleReject} />;
    }
  };

  if (activePaymentOrder) {
    return <PaymentCheckoutPortal order={activePaymentOrder} client={activeClient} onSuccess={() => setActivePaymentOrder(null)} onCancel={() => setActivePaymentOrder(null)} />;
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
                    {notifications.map((n: any) => (
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
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-full font-black text-[11px] md:text-sm transition-all whitespace-nowrap relative ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border border-slate-200'}`}>
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

      {/* Chat Bot Button - Optimized for mobile position */}
      <button onClick={() => setIsChatOpen(true)} className="fixed bottom-6 left-6 md:bottom-10 md:left-10 w-16 h-16 md:w-20 md:h-20 bg-blue-600 text-white rounded-2xl md:rounded-[32px] shadow-2xl flex items-center justify-center z-[150] shadow-blue-200">
           <MessageSquare size={28} />
      </button>

      {/* Mobile Chat Overlay */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="fixed inset-0 md:inset-auto md:bottom-8 md:left-8 w-full md:max-w-sm bg-white md:rounded-[40px] shadow-2xl z-[200] flex flex-col overflow-hidden">
             <div className="p-6 bg-slate-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Sparkles size={20}/></div>
                   <p className="font-black">עוזר AI אישי</p>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="p-2"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-slate-50">
                {messages.map((message: any) => (
                  <div
                    key={message.id}
                    className={`flex flex-col gap-2 ${
                      message.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div
                      className={`p-4 rounded-2xl shadow-sm font-bold text-sm max-w-[85%] border leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white border-blue-700'
                          : 'bg-white text-slate-800 border-slate-200'
                      }`}
                    >
                      {message.parts?.map((part: any, i: number) => {
                        if (part.type === 'text') {
                          return (
                            <div key={`${message.id}-${i}`} className="whitespace-pre-wrap">
                              {part.text}
                            </div>
                          );
                        }
                        return null;
                      })}
                      {isLoading && message.id === messages[messages.length - 1]?.id && message.role === 'assistant' && (
                        <span className="inline-block mr-1 text-slate-400 font-bold">...</span>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex items-start gap-2">
                    <div className="bg-white p-4 rounded-2xl shadow-sm font-bold text-sm border border-slate-200">
                      <div className="space-y-2 w-40">
                        <Skeleton className="h-3 w-32 rounded-xl" />
                        <Skeleton className="h-3 w-28 rounded-xl" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatMessagesEndRef} />
             </div>
             <form onSubmit={handleSubmit} className="p-4 border-t border-slate-200 bg-white flex gap-2">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="שאל אותי משהו..."
                  className="flex-1 bg-slate-50 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  {isLoading ? (
                    <span className="text-xs font-black">...</span>
                  ) : (
                    <Send size={20} className="rotate-180" />
                  )}
                </button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

