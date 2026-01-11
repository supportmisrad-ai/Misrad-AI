'use client';

import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertCircle, X, Info, DollarSign, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { getUpdatesWithStatus, AppUpdate } from '@/app/actions/updates';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

export default function NotificationCenter() {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isNotificationCenterOpen, 
    setIsNotificationCenterOpen, 
    clients,
    setSettingsSubView,
  } = useApp();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [updates, setUpdates] = useState<AppUpdate[]>([]);

  useEffect(() => {
    loadNotifications();
  }, [isNotificationCenterOpen]);

  const loadNotifications = async () => {
    // Load regular notifications from database
    const regularNotifications: any[] = [];

    // Load unread updates
    try {
      const result = await getUpdatesWithStatus();
      if (result.success && result.data) {
        const unreadUpdates = result.data.filter(u => !u.isViewed);
        setUpdates(unreadUpdates);
        
        // Convert updates to notifications
        const updateNotifications = unreadUpdates.slice(0, 3).map((update, index) => ({
          id: `update-${update.id}`,
          title: `עדכון חדש: ${update.title}`,
          body: update.description.substring(0, 100) + (update.description.length > 100 ? '...' : ''),
          type: 'update' as const,
          time: new Date(update.publishedAt).toLocaleDateString('he-IL'),
          updateId: update.id,
          version: update.version,
        }));

        setNotifications([...updateNotifications, ...regularNotifications]);
      } else {
        setNotifications(regularNotifications);
      }
    } catch (error: any) {
      // Silently handle network errors (common during dev server restarts)
      // Only log if it's not a network/fetch error
      if (error?.message && !error.message.includes('Failed to fetch') && !error.message.includes('fetch')) {
        console.error('Error loading updates:', error);
      }
      setNotifications(regularNotifications);
    }
  };

  const handleWhatsAppReminder = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client && client.phone) {
      const message = encodeURIComponent(`היי ${client.name}, רצינו להזכיר שהתשלום עבור שירותי הסושיאל מדיה טרם הוסדר. נשמח אם תוכל להסדיר זאת בהקדם בקישור ששלחנו לך. תודה!`);
      const url = `https://wa.me/972${client.phone.substring(1)}?text=${message}`;
      window.open(url, '_blank');
    }
  };

  const handleUpdateClick = (updateId: string) => {
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/settings'));
    setSettingsSubView('updates');
    setIsNotificationCenterOpen(false);
  };

  const deleteNotification = (id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <AnimatePresence>
      {isNotificationCenterOpen && (
        <>
          <div className="fixed inset-0 z-[150] bg-black/20 backdrop-blur-sm" onClick={() => setIsNotificationCenterOpen(false)} />
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ 
              type: 'spring', 
              damping: 25, 
              stiffness: 200,
              mass: 0.8
            }}
            className="fixed top-20 left-0 h-[calc(100vh-5rem)] w-full md:w-[420px] bg-white z-[160] shadow-2xl flex flex-col text-right"
            dir="rtl"
          >
            <div className="px-8 pt-6 pb-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg">
                  <Bell size={24}/>
                </div>
                <div>
                  <h2 className="text-2xl font-black">התראות</h2>
                  {updates.length > 0 && (
                    <p className="text-xs font-bold text-blue-600 mt-1">
                      {updates.length} עדכון{updates.length > 1 ? 'ים' : ''} חדש{updates.length > 1 ? 'ים' : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button 
                    onClick={clearAll} 
                    className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1.5 rounded-xl hover:bg-red-100 transition-all ml-2"
                  >
                    נקה הכל
                  </button>
                )}
                <button onClick={() => setIsNotificationCenterOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                  <X size={24}/>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <AnimatePresence mode="popLayout">
                {notifications.length > 0 ? notifications.map(n => (
                  <motion.div 
                    key={n.id} 
                    layout
                    initial={{ opacity: 0, x: -20, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, x: -30 }}
                    transition={{ 
                      type: 'spring', 
                      damping: 20, 
                      stiffness: 300,
                      mass: 0.5
                    }}
                    className={`p-6 rounded-3xl border transition-all flex gap-4 group relative overflow-hidden cursor-pointer ${
                      n.type === 'payment' ? 'bg-red-50 border-red-100 ring-2 ring-red-500/10' : 
                      n.type === 'update' ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' :
                      'border border-slate-100 hover:bg-slate-50'
                    }`}
                    onClick={() => n.type === 'update' && n.updateId && handleUpdateClick(n.updateId)}
                  >
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="absolute top-2 left-2 p-2 text-slate-300 hover:text-slate-900 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <X size={14} />
                    </button>

                    <div className={`w-12 h-12 rounded-2xl shrink-0 flex items-center justify-center ${
                      n.type === 'success' ? 'bg-green-50 text-green-600' : 
                      n.type === 'error' ? 'bg-red-50 text-red-600' : 
                      n.type === 'payment' ? 'bg-red-600 text-white shadow-lg' :
                      n.type === 'update' ? 'bg-blue-600 text-white shadow-lg' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {n.type === 'success' ? <CheckCircle2 size={24}/> : 
                        n.type === 'error' ? <AlertCircle size={24}/> : 
                        n.type === 'update' ? <Sparkles size={24}/> :
                        <Info size={24}/>}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-black text-slate-900 text-sm leading-tight">{n.title}</h3>
                        {n.type === 'update' && n.version && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-white/50 text-blue-700 shrink-0">
                            v{n.version}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed mb-2">{n.body}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">{n.time}</span>
                        {n.type === 'update' && (
                          <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                            לחץ לפרטים
                          </span>
                        )}
                        {n.type === 'payment' && n.clientId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleWhatsAppReminder(n.clientId);
                            }}
                            className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all"
                          >
                            שלח WhatsApp
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Bell className="text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-bold">אין התראות חדשות</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
