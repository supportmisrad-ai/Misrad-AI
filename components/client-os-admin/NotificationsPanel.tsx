import React, { useState, useEffect } from 'react';
import { X, Bell, Check, TriangleAlert, MessageSquare, CircleCheckBig, Info, Trash2 } from 'lucide-react';
import { Notification, NotificationType } from '@/components/client-portal/types';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkAsRead: (id?: string) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onDismiss,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'UNREAD'>('ALL');

  const filteredNotifications = activeTab === 'ALL' ? notifications : notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'ALERT':
        return <TriangleAlert size={20} className="text-white" />;
      case 'SUCCESS':
        return <CircleCheckBig size={20} className="text-white" />;
      case 'MESSAGE':
        return <MessageSquare size={20} className="text-white" />;
      case 'TASK':
        return <Check size={20} className="text-white" />;
      default:
        return <Info size={20} className="text-white" />;
    }
  };

  const getStyle = (type: NotificationType) => {
    switch (type) {
      case 'ALERT':
        return 'bg-signal-danger shadow-lg shadow-signal-danger/20';
      case 'SUCCESS':
        return 'bg-signal-success shadow-lg shadow-signal-success/20';
      case 'MESSAGE':
        return 'bg-blue-500 shadow-lg shadow-blue-500/20';
      case 'TASK':
        return 'bg-nexus-accent shadow-lg shadow-nexus-accent/20';
      default:
        return 'bg-gray-500 shadow-lg shadow-gray-500/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-nexus-primary/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>

      <div className="w-full md:max-w-md h-full bg-white shadow-2xl animate-slide-in-right relative flex flex-col md:border-l border-gray-100">
        <div className="p-4 md:p-6 border-b border-gray-100 bg-white/95 backdrop-blur-md z-10 pt-safe-top">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl md:text-2xl font-display font-bold text-nexus-primary flex items-center gap-3">
              <Bell className="text-nexus-accent" /> התראות
              {notifications.filter((n) => !n.isRead).length > 0 && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold">
                  {notifications.filter((n) => !n.isRead).length} חדשות
                </span>
              )}
            </h2>
            <button
              onClick={onClose}
              className="p-3 md:p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          <div className="flex gap-2 items-center overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === 'ALL' ? 'bg-nexus-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              הכל
            </button>
            <button
              onClick={() => setActiveTab('UNREAD')}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap ${
                activeTab === 'UNREAD' ? 'bg-nexus-primary text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              לא נקראו
            </button>

            <div className="mr-auto flex items-center gap-2 pl-1">
              <button
                onClick={() => onMarkAsRead()}
                className="text-[11px] text-nexus-accent font-bold hover:text-nexus-primary transition-colors flex items-center gap-1 whitespace-nowrap"
                title="סמן הכל כנקרא"
              >
                <CircleCheckBig size={14} /> <span className="hidden sm:inline">קרא הכל</span>
              </button>
              {notifications.length > 0 && (
                <>
                  <div className="w-px h-3 bg-gray-200"></div>
                  <button
                    onClick={onClearAll}
                    className="text-[11px] text-gray-400 font-bold hover:text-red-500 transition-colors flex items-center gap-1 whitespace-nowrap"
                    title="נקה הכל"
                  >
                    <Trash2 size={14} /> <span className="hidden sm:inline">נקה הכל</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50 custom-scrollbar pb-safe-bottom">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all active:scale-[0.98] group relative
                        ${
                          notification.isRead
                            ? 'bg-white border-gray-100'
                            : 'bg-white border-l-4 border-l-nexus-accent border-y-white border-r-white shadow-sm'
                        }
                    `}
                onClick={() => onMarkAsRead(notification.id)}
              >
                <div className="flex gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStyle(
                      notification.type
                    )}`}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4
                        className={`text-sm font-bold truncate ${
                          notification.isRead ? 'text-gray-700' : 'text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap flex-shrink-0 mr-2">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">{notification.message}</p>

                    {notification.link && (
                      <button className="mt-2 text-[10px] font-bold text-nexus-accent hover:underline flex items-center gap-1">
                        צפה בפרטים
                      </button>
                    )}
                  </div>
                </div>

                <div className="absolute top-2 left-2 flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDismiss(notification.id);
                    }}
                    className="p-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="מחק התראה"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Bell size={48} className="opacity-10 mb-4" />
              <p className="text-sm font-medium">אין התראות חדשות</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPanel;
