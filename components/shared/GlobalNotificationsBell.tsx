'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  source_module?: string | null;
}

const MODULE_DOT_COLORS: Record<string, string> = {
  nexus: '#3730A3',
  system: '#A21D3C',
  social: '#7C3AED',
  finance: '#059669',
  client: '#C5A572',
  operations: '#0EA5E9',
};

const MODULE_DOT_LABELS: Record<string, string> = {
  nexus: 'Nexus',
  system: 'System',
  social: 'Social',
  finance: 'Finance',
  client: 'Client',
  operations: 'Operations',
};

function formatRelativeTime(createdAt: string): string {
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

export function GlobalNotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const items = (data as { data?: { notifications?: unknown[] } })?.data?.notifications || (data as { notifications?: unknown[] })?.notifications || [];
      if (Array.isArray(items)) {
        setNotifications(
          items.slice(0, 30).map((n: unknown) => {
            const obj = n as Record<string, unknown>;
            return {
              id: String(obj.id || ''),
              type: String(obj.type || 'SYSTEM'),
              title: String(obj.title || obj.type || ''),
              message: String(obj.message || ''),
              is_read: Boolean(obj.is_read),
              created_at: String(obj.created_at || ''),
              source_module: typeof obj.source_module === 'string' ? obj.source_module : (typeof obj.module === 'string' ? obj.module : null),
            };
          })
        );
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setIsOpen((v) => !v);
          if (!isOpen) fetchNotifications();
        }}
        className="relative w-10 h-10 inline-flex items-center justify-center rounded-full transition-colors hover:bg-white/50 text-gray-600"
        aria-label="התראות"
        type="button"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      <AnimatePresence>
        {isOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              className="absolute top-full left-0 mt-2 w-80 max-h-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[81]"
              dir="rtl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-900">התראות</h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 ? (
                    <button
                      onClick={handleMarkAllRead}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      title="סמן הכל כנקרא"
                      type="button"
                    >
                      <CheckCheck size={14} />
                    </button>
                  ) : null}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="max-h-[340px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    {loading ? 'טוען...' : 'אין התראות חדשות'}
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-slate-50 last:border-0 ${n.is_read ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                          <div
                            className={`w-2 h-2 rounded-full ${n.is_read ? 'bg-slate-300' : 'bg-blue-500'}`}
                          />
                          {n.source_module && MODULE_DOT_COLORS[n.source_module] ? (
                            <div
                              className="w-2.5 h-2.5 rounded-full border border-white shadow-sm"
                              style={{ backgroundColor: MODULE_DOT_COLORS[n.source_module] }}
                              title={MODULE_DOT_LABELS[n.source_module] || n.source_module}
                            />
                          ) : null}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{n.title || n.type}</div>
                          {n.message ? (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{n.message}</div>
                          ) : null}
                          <div className="text-[10px] text-slate-400 mt-1">{formatRelativeTime(n.created_at)}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
