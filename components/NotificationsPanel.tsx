
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../context/DataContext';
import { Bell, User, Info, AlertTriangle, Check, X, Trash2 } from 'lucide-react';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead, markAllNotificationsRead, dismissNotification, clearAllNotifications, openTask, currentUser } = useData();
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');
  const panelRef = useRef<HTMLDivElement>(null);
  
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  // Filter notifications for the current user
  const userNotifications = notifications.filter(n => n.recipientId === 'all' || n.recipientId === currentUser.id);

  const filteredNotifications = activeTab === 'all' 
    ? userNotifications 
    : userNotifications.filter(n => n.type === 'mention' || n.type === 'alert');

  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (notification: any) => {
      markNotificationRead(notification.id);
      if (notification.taskId) {
          openTask(notification.taskId);
          onClose(); // Close the panel so user sees the modal
      }
  };

  const visibleIds = filteredNotifications.map(n => n.id);

  const handleMarkAllVisibleRead = () => {
      markAllNotificationsRead(visibleIds);
  };

  const handleClearVisible = () => {
      clearAllNotifications(visibleIds);
  };

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen && !isMobile) {
        const trigger = document.getElementById('notification-trigger');
        if (trigger) {
            const rect = trigger.getBoundingClientRect();
            // Center panel relative to trigger, but keep within bounds
            const panelWidth = 384; // w-96
            const idealLeft = rect.left + (rect.width / 2) - (panelWidth / 2);
            
            // Adjust to keep within viewport
            const safeLeft = Math.max(16, Math.min(window.innerWidth - panelWidth - 16, idealLeft));
            
            setCoords({
                top: rect.bottom + 12,
                left: safeLeft
            });
        }
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        // Check if click is inside the panel
        if (panelRef.current && panelRef.current.contains(event.target as Node)) {
            return;
        }
        
        // Check if click is on the trigger button (by ID) to avoid toggle conflict
        const trigger = document.getElementById('notification-trigger');
        if (trigger && trigger.contains(event.target as Node)) {
            return;
        }
        
        onClose();
    };

    if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Use Portal to render outside of parent stacking context
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
            {/* Mobile Backdrop */}
            {isMobile && (
                <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }} 
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[9998]"
                    onClick={onClose}
                />
            )}

            <motion.div 
                ref={panelRef}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                style={!isMobile ? { position: 'fixed', top: coords.top, left: coords.left } : {}}
                className={isMobile 
                    ? "fixed top-24 left-4 right-4 mx-auto w-auto max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[70vh]"
                    : "w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[70vh] fixed"
                }
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900">התראות</h3>
                        {unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={handleMarkAllVisibleRead} 
                            className="text-[10px] text-blue-600 font-medium hover:underline"
                            disabled={filteredNotifications.length === 0}
                        >
                            סמן הכל כנקרא
                        </button>
                        <span className="text-gray-300">|</span>
                        <button 
                            onClick={handleClearVisible} 
                            className="text-[10px] text-red-600 font-medium hover:underline flex items-center gap-1"
                            disabled={filteredNotifications.length === 0}
                        >
                            <Trash2 size={10} /> נקה הכל
                        </button>
                    </div>
                </div>

                <div className="flex border-b border-gray-100">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'all' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        כל הפעילות
                    </button>
                    <button 
                        onClick={() => setActiveTab('mentions')}
                        className={`flex-1 py-3 text-xs font-bold transition-colors ${activeTab === 'mentions' ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        אזכורים ודחוף
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    {filteredNotifications.length > 0 ? (
                        <div className="divide-y divide-gray-50">
                            {filteredNotifications.map(notification => (
                                <div 
                                    key={notification.id} 
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative group
                                        ${notification.type === 'alert' ? 'bg-red-50/60' : !notification.read ? 'bg-blue-50/40' : ''}`}
                                >
                                    {!notification.read && (
                                        <span className={`absolute top-4 right-2 w-2 h-2 rounded-full ${notification.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                                    )}
                                    
                                    {/* Dismiss Button - Visible on Hover */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); dismissNotification(notification.id); }}
                                        className="absolute top-2 left-2 p-1 text-gray-400 hover:text-red-500 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="מחק התראה"
                                    >
                                        <X size={12} />
                                    </button>

                                    <div className="flex-shrink-0 mt-1">
                                        {notification.type === 'mention' ? (
                                            notification.actorAvatar ? (
                                                <img src={notification.actorAvatar} className="w-8 h-8 rounded-full border border-white shadow-sm" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center border border-white shadow-sm">
                                                    <User size={14} />
                                                </div>
                                            )
                                        ) : notification.type === 'alert' ? (
                                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-white shadow-sm animate-pulse">
                                                <AlertTriangle size={14} />
                                            </div>
                                        ) : notification.type === 'system' ? (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-white shadow-sm">
                                                <Info size={14} />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center border border-white shadow-sm">
                                                <Bell size={14} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm leading-snug mb-1 ${notification.type === 'alert' ? 'font-bold text-red-700' : 'text-gray-800'}`}>
                                            {notification.text}
                                        </p>
                                        <span className="text-[10px] text-gray-400 font-medium">{notification.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            <Check size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-xs">אין התראות חדשות</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
};
