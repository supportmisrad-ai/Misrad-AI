'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, User, Info, TriangleAlert, Check, X, Trash2 } from 'lucide-react';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

interface Notification {
  id: string;
  type: string;
  title?: string;
  message?: string;
  text?: string;
  is_read: boolean;
  read?: boolean;
  created_at: string;
  time?: string;
  source_module?: string | null;
  recipientId?: string;
  actorName?: string;
  actorAvatar?: string;
  actor_name?: string;
  actor_avatar?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

const MODULE_COLORS: Record<string, string> = {
  nexus: '#3730A3',
  system: '#A21D3C',
  social: '#7C3AED',
  finance: '#059669',
  client: '#C5A572',
  operations: '#0EA5E9',
};

const MODULE_LABELS: Record<string, string> = {
  nexus: 'Nexus',
  system: 'System',
  social: 'Social',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
};

function formatTime(createdAt: string): string {
  const now = new Date();
  const date = new Date(createdAt);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));
  if (diffMin < 1) return 'כרגע';
  if (diffMin < 60) return `לפני ${diffMin} דק'`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'אתמול';
  return `לפני ${diffDays} ימים`;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

interface UnifiedNotificationsBellProps {
  onNotificationClick?: (notification: Notification) => void;
  currentUserId?: string;
}

export function UnifiedNotificationsBell({
  onNotificationClick,
  currentUserId,
}: UnifiedNotificationsBellProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'mentions'>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    setIsMobile(typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
    if (!orgSlug) {
      setNotifications([]);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        cache: 'no-store',
        headers: {
          'x-org-id': orgSlug,
        },
      });
      if (!res.ok) return;
      const data: unknown = await res.json();

      // Handle different response shapes
      const dataObj = asObject(data) ?? {};
      const items =
        (dataObj.data as { notifications?: unknown[] })?.notifications ??
        (dataObj.notifications as unknown[]) ??
        (Array.isArray(data) ? data : []);

      if (Array.isArray(items)) {
        const mapped: Notification[] = items.map((n: unknown) => {
          const obj = asObject(n) ?? {};
          const metadataObj = asObject(obj.metadata) ?? {};
          const createdAtValue = obj.created_at ?? obj.createdAt;
          const time = createdAtValue
            ? new Date(String(createdAtValue)).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
            : new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

          return {
            id: String(obj.id || ''),
            type: String(obj.type || 'SYSTEM'),
            title: typeof obj.title === 'string' ? obj.title : undefined,
            message: typeof obj.message === 'string' ? obj.message : undefined,
            text: typeof obj.text === 'string' ? obj.text : typeof obj.message === 'string' ? obj.message : '',
            is_read: Boolean(obj.is_read ?? obj.isRead ?? obj.read ?? false),
            read: Boolean(obj.is_read ?? obj.isRead ?? obj.read ?? false),
            created_at: String(createdAtValue || new Date().toISOString()),
            time,
            source_module:
              typeof obj.source_module === 'string'
                ? obj.source_module
                : typeof obj.module === 'string'
                  ? obj.module
                  : null,
            recipientId: String(obj.recipient_id ?? obj.recipientId ?? currentUserId ?? 'all'),
            actorName: typeof obj.actor_name === 'string' ? obj.actor_name : typeof obj.actorName === 'string' ? obj.actorName : undefined,
            actorAvatar: typeof obj.actor_avatar === 'string' ? obj.actor_avatar : typeof obj.actorAvatar === 'string' ? obj.actorAvatar : undefined,
            actor_name: typeof obj.actor_name === 'string' ? obj.actor_name : undefined,
            actor_avatar: typeof obj.actor_avatar === 'string' ? obj.actor_avatar : undefined,
            taskId: obj.taskId == null ? undefined : String(obj.taskId),
            metadata: metadataObj,
          };
        });
        setNotifications(mapped);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Position panel when opened
  useEffect(() => {
    if (isOpen && !isMobile && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = 384; // w-96
      const idealLeft = rect.left + rect.width / 2 - panelWidth / 2;
      const safeLeft = Math.max(16, Math.min(window.innerWidth - panelWidth - 16, idealLeft));
      setCoords({
        top: rect.bottom + 12,
        left: safeLeft,
      });
    }
  }, [isOpen, isMobile]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      if (triggerRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const userNotifications = currentUserId
    ? notifications.filter((n) => n.recipientId === 'all' || n.recipientId === currentUserId)
    : notifications;

  const filteredNotifications = activeTab === 'all'
    ? userNotifications
    : userNotifications.filter((n) => n.type === 'mention' || n.type === 'alert');

  const visibleIds = filteredNotifications.map((n) => n.id);

  const handleMarkAllRead = useCallback(async () => {
    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
    if (!orgSlug) return;

    try {
      await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'x-org-id': orgSlug },
      });
      setNotifications((prev) => prev.map((n) => (visibleIds.includes(n.id) ? { ...n, is_read: true, read: true } : n)));
    } catch {
      // ignore
    }
  }, [visibleIds]);

  const handleDismiss = useCallback(async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
    if (!orgSlug) return;

    try {
      await fetch(`/api/notifications/${id}/dismiss`, {
        method: 'POST',
        headers: { 'x-org-id': orgSlug },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Optimistic remove anyway
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
    if (!orgSlug) return;

    try {
      await fetch('/api/notifications/clear-all', {
        method: 'POST',
        headers: { 'x-org-id': orgSlug },
      });
      setNotifications((prev) => prev.filter((n) => !visibleIds.includes(n.id)));
    } catch {
      setNotifications((prev) => prev.filter((n) => !visibleIds.includes(n.id)));
    }
  }, [visibleIds]);

  const handleNotificationClick = useCallback(
    (notification: Notification) => {
      // Mark as read
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true, read: true } : n))
      );

      // Call custom handler if provided
      if (onNotificationClick) {
        onNotificationClick(notification);
      }

      setIsOpen(false);
    },
    [onNotificationClick]
  );

  const getNotificationIcon = (notification: Notification) => {
    const { type, actorAvatar, actor_avatar, source_module } = notification;
    const avatar = actorAvatar || actor_avatar;

    if (type === 'mention') {
      return avatar ? (
        <img src={avatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" alt="" />
      ) : (
        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center border border-white shadow-sm">
          <User size={14} />
        </div>
      );
    }

    if (type === 'alert') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center border border-white shadow-sm animate-pulse">
          <TriangleAlert size={14} />
        </div>
      );
    }

    if (type === 'system' || type === 'SYSTEM') {
      return (
        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-white shadow-sm">
          <Info size={14} />
        </div>
      );
    }

    // Module-colored icon for other types
    const moduleColor = source_module ? MODULE_COLORS[source_module] : undefined;
    if (moduleColor) {
      return (
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center border border-white shadow-sm"
          style={{ backgroundColor: `${moduleColor}20`, color: moduleColor }}
        >
          <Bell size={14} />
        </div>
      );
    }

    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center border border-white shadow-sm">
        <Bell size={14} />
      </div>
    );
  };

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors ${
          isOpen ? 'bg-black text-white' : 'hover:bg-white/50 text-gray-600'
        }`}
        aria-label={unreadCount > 0 ? 'התראות - יש התראות חדשות' : 'התראות'}
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {mounted && portalTarget &&
        createPortal(
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
                    onClick={() => setIsOpen(false)}
                  />
                )}

                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  style={!isMobile ? { position: 'fixed', top: coords.top, left: coords.left } : undefined}
                  className={
                    isMobile
                      ? 'fixed top-24 left-4 right-4 mx-auto w-auto max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[70vh]'
                      : 'w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-[9999] overflow-hidden flex flex-col max-h-[70vh] fixed'
                  }
                  dir="rtl"
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">התראות</h3>
                      {unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-blue-600 font-medium hover:underline"
                        disabled={filteredNotifications.length === 0}
                      >
                        סמן הכל כנקרא
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={handleClearAll}
                        className="text-[10px] text-red-600 font-medium hover:underline flex items-center gap-1"
                        disabled={filteredNotifications.length === 0}
                      >
                        <Trash2 size={10} /> נקה הכל
                      </button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${
                        activeTab === 'all'
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      כל הפעילות
                    </button>
                    <button
                      onClick={() => setActiveTab('mentions')}
                      className={`flex-1 py-3 text-xs font-bold transition-colors ${
                        activeTab === 'mentions'
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      אזכורים ודחוף
                    </button>
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
                    {filteredNotifications.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {filteredNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors cursor-pointer relative group
                              ${notification.type === 'alert' ? 'bg-red-50/60' : !notification.is_read ? 'bg-blue-50/40' : ''}`}
                          >
                            {/* Unread indicator */}
                            {!notification.is_read && (
                              <span
                                className={`absolute top-4 right-2 w-2 h-2 rounded-full ${
                                  notification.type === 'alert' ? 'bg-red-500' : 'bg-blue-500'
                                }`}
                              />
                            )}

                            {/* Module indicator */}
                            {notification.source_module && MODULE_COLORS[notification.source_module] && (
                              <div
                                className="absolute top-4 right-5 w-2 h-2 rounded-full border border-white"
                                style={{ backgroundColor: MODULE_COLORS[notification.source_module] }}
                                title={MODULE_LABELS[notification.source_module] || notification.source_module}
                              />
                            )}

                            {/* Dismiss Button - Visible on Hover */}
                            <button
                              onClick={(e) => handleDismiss(notification.id, e)}
                              className="absolute top-2 left-2 p-1 text-gray-400 hover:text-red-500 hover:bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              title="מחק התראה"
                            >
                              <X size={12} />
                            </button>

                            {/* Icon */}
                            <div className="flex-shrink-0 mt-1">{getNotificationIcon(notification)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className={`text-sm leading-snug mb-1 ${
                                  notification.type === 'alert' ? 'font-bold text-red-700' : 'text-gray-800'
                                }`}
                              >
                                {notification.text || notification.message || notification.title || ''}
                              </p>
                              <span className="text-[10px] text-gray-400 font-medium">
                                {notification.time || formatTime(notification.created_at)}
                              </span>
                              {notification.source_module && (
                                <span
                                  className="text-[10px] mr-2 px-1.5 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${MODULE_COLORS[notification.source_module]}15`,
                                    color: MODULE_COLORS[notification.source_module],
                                  }}
                                >
                                  {MODULE_LABELS[notification.source_module] || notification.source_module}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Check size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs">{loading ? 'טוען...' : 'אין התראות חדשות'}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </>
  );
}

export default UnifiedNotificationsBell;
