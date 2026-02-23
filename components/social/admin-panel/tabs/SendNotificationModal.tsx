'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, Users, User, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { sendNotification } from '@/app/actions/admin-notifications';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgSlug: string;
  allUsers?: Array<{ id: string; full_name?: string; email?: string; name?: string }>;
  onSuccess?: () => void;
}

export default function SendNotificationModal({
  isOpen,
  onClose,
  orgSlug,
  allUsers = [],
  onSuccess,
}: SendNotificationModalProps) {
  const [targetType, setTargetType] = useState<'all' | 'user'>('all');
  const [targetId, setTargetId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'error' | 'success'>('info');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setTargetType('all');
      setTargetId(null);
      setTitle('');
      setMessage('');
      setType('info');
      setError(null);
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredUsers = allUsers.filter((u) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = String(u.full_name || u.name || '').toLowerCase();
    const email = String(u.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const handleSend = async () => {
    if (!title.trim()) {
      setError('חובה למלא כותרת');
      return;
    }
    if (!message.trim()) {
      setError('חובה למלא הודעה');
      return;
    }
    if (targetType === 'user' && !targetId) {
      setError('יש לבחור משתמש');
      return;
    }

    setIsSending(true);
    setError(null);
    try {
      const result = await sendNotification(
        orgSlug,
        targetType,
        targetType === 'user' ? targetId : null,
        title.trim(),
        message.trim(),
        type
      );
      if (!result.success) {
        setError(result.error || 'שגיאה בשליחה');
        return;
      }
      onSuccess?.();
      onClose();
    } catch {
      setError('שגיאה בשליחה');
    } finally {
      setIsSending(false);
    }
  };

  const selectedUser = targetId ? allUsers.find((u) => u.id === targetId) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 md:inset-auto md:top-[10%] md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-[201] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[80vh] overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-black text-slate-900">שליחת התראה</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">שלח הודעה למשתמשים בארגון</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Target Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">שלח אל</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setTargetType('all'); setTargetId(null); }}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                      targetType === 'all'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Globe size={16} />
                    כל המשתמשים
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType('user')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                      targetType === 'user'
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <User size={16} />
                    משתמש ספציפי
                  </button>
                </div>
              </div>

              {/* User picker */}
              {targetType === 'user' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-2">בחר משתמש</label>
                  {selectedUser ? (
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-xs font-black">
                          {String(selectedUser.full_name || selectedUser.name || '?').charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-slate-900">{selectedUser.full_name || selectedUser.name}</div>
                          <div className="text-[10px] text-slate-500">{selectedUser.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTargetId(null)}
                        className="p-1 rounded hover:bg-white text-slate-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="חפש לפי שם או אימייל..."
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm mb-2"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.slice(0, 20).map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => { setTargetId(u.id); setSearchQuery(''); }}
                              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 text-right transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[10px] font-black flex-shrink-0">
                                {String(u.full_name || u.name || '?').charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{u.full_name || u.name || 'ללא שם'}</div>
                                <div className="text-[10px] text-slate-500 truncate">{u.email || ''}</div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-4 text-xs text-slate-500">לא נמצאו משתמשים</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Notification Type */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-2">סוג</label>
                <div className="grid grid-cols-4 gap-2">
                  {([
                    { id: 'info', label: 'מידע', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                    { id: 'success', label: 'הצלחה', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                    { id: 'warning', label: 'אזהרה', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                    { id: 'error', label: 'שגיאה', color: 'bg-rose-100 text-rose-700 border-rose-200' },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setType(t.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all ${
                        type === t.id ? t.color : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">כותרת</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="כותרת ההתראה"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  maxLength={200}
                />
              </div>

              {/* Message */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">הודעה</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="תוכן ההתראה..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  rows={4}
                  maxLength={2000}
                />
              </div>

              {error && (
                <div className="text-sm text-rose-600 font-bold bg-rose-50 border border-rose-200 rounded-xl px-4 py-2">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <Button
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-bold"
                type="button"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !title.trim() || !message.trim()}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-2 rounded-xl font-black text-sm hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md disabled:opacity-50"
                type="button"
              >
                <Send size={14} className="ml-2" />
                {isSending ? 'שולח...' : 'שלח התראה'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
