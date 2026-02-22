'use client';

import React, { useState, useCallback } from 'react';
import {
  CircleCheckBig,
  Clock,
  Calendar,
  ShieldCheck,
  MessageSquare,
  Send,
  Check,
  Tag,
  Building2,
  Loader2,
} from 'lucide-react';

interface GuestMessage {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
  type?: 'user' | 'system' | 'guest';
}

interface GuestTaskData {
  title: string;
  description: string;
  status: string;
  statusLabel: string;
  progress: number;
  priority: string;
  createdAt: string;
  dueDate: string | null;
  approvalStatus: string | null;
  messages: GuestMessage[];
  tags: string[];
  department: string | null;
}

interface GuestOrganization {
  name: string;
  logo: string | null;
}

interface GuestTaskViewProps {
  token: string;
  task: GuestTaskData;
  organization: GuestOrganization;
}

export function GuestTaskView({ token, task: initialTask, organization }: GuestTaskViewProps) {
  const [task, setTask] = useState(initialTask);
  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalDone, setApprovalDone] = useState(false);

  const handleSendComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || isSendingComment) return;

    setIsSendingComment(true);
    try {
      const res = await fetch(`/api/guest/task/${token}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error('Failed to send comment');

      const data = await res.json();
      if (data.ok && data.message) {
        setTask(prev => ({
          ...prev,
          messages: [...prev.messages, data.message],
        }));
        setCommentText('');
      }
    } catch {
      // Silently fail — user can retry
    } finally {
      setIsSendingComment(false);
    }
  }, [commentText, isSendingComment, token]);

  const handleApprove = useCallback(async () => {
    if (isApproving || approvalDone) return;
    setIsApproving(true);
    try {
      const res = await fetch(`/api/guest/task/${token}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) throw new Error('Failed to approve');

      const data = await res.json();
      if (data.ok) {
        setTask(prev => ({
          ...prev,
          approvalStatus: 'approved',
          messages: [
            ...prev.messages,
            {
              id: `system-approval-${Date.now()}`,
              text: '✅ המשימה אושרה על ידי הלקוח/אורח',
              senderId: 'system',
              createdAt: new Date().toISOString(),
              type: 'system' as const,
            },
          ],
        }));
        setApprovalDone(true);
      }
    } catch {
      // Silently fail
    } finally {
      setIsApproving(false);
    }
  }, [isApproving, approvalDone, token]);

  const priorityColors: Record<string, string> = {
    Low: 'bg-gray-100 text-gray-600',
    Medium: 'bg-blue-50 text-blue-600',
    High: 'bg-orange-50 text-orange-600',
    Urgent: 'bg-red-50 text-red-600',
  };

  const canApprove = task.status === 'Waiting for Review' && !approvalDone && task.approvalStatus !== 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 font-sans" dir="rtl">
      {/* Header */}
      <header className="h-16 md:h-20 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 md:px-12 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {organization.logo ? (
            <img src={organization.logo} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 size={18} className="text-white" />
            </div>
          )}
          <div>
            <span className="font-bold text-base md:text-lg tracking-tight text-gray-900 block leading-none">{organization.name}</span>
            <span className="text-[10px] text-gray-400 font-bold tracking-widest uppercase">פורטל משימות</span>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 border border-green-100">
            <ShieldCheck size={14} /> חיבור מאובטח
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-12">
        {/* Title Section */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {task.statusLabel}
            </span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${priorityColors[task.priority] ?? priorityColors.Low}`}>
              {task.priority === 'Urgent' ? 'דחוף' : task.priority === 'High' ? 'גבוה' : task.priority === 'Medium' ? 'בינוני' : 'רגיל'}
            </span>
            {task.department && (
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {task.department}
              </span>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <h1 className="text-2xl md:text-4xl font-black text-gray-900 leading-tight">{task.title}</h1>
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="bg-green-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 shrink-0 disabled:opacity-60"
              >
                {isApproving ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                אשר שלב זה
              </button>
            )}
            {approvalDone && (
              <div className="bg-green-50 text-green-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 border border-green-200">
                <CircleCheckBig size={20} /> אושר בהצלחה!
              </div>
            )}
          </div>

          {task.description && (
            <p className="text-base md:text-lg text-gray-500 max-w-2xl leading-relaxed mt-4 whitespace-pre-line">{task.description}</p>
          )}

          {/* Tags */}
          {task.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {task.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-8 md:mb-12 relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

          <div className="p-5 md:p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">התקדמות כללית</span>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-2">
                  {task.progress}%
                  {task.progress === 100 && <CircleCheckBig className="text-green-500" size={28} />}
                </div>
              </div>
              <div className="flex items-center gap-4 md:gap-6 text-sm font-medium text-gray-500">
                {task.dueDate && (
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span>יעד: <span className="text-gray-900">{new Date(task.dueDate).toLocaleDateString('he-IL')}</span></span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span>נוצר: <span className="text-gray-900">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span></span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-3 md:h-4 bg-gray-100 rounded-full overflow-hidden mb-8 md:mb-10 shadow-inner">
              <div
                className={`h-full transition-all duration-1000 ease-out rounded-full relative overflow-hidden ${task.progress === 100 ? 'bg-green-500' : 'bg-gray-900'}`}
                style={{ width: `${task.progress}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12" />
              </div>
            </div>

            {/* Chat / Timeline */}
            <div className="bg-gray-50 rounded-xl md:rounded-2xl p-4 md:p-8 border border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                <MessageSquare size={16} /> עדכונים ותגובות
              </h3>

              <div className="space-y-4 md:space-y-6 mb-6 md:mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {/* Start Point */}
                <div className="relative flex gap-3 md:gap-4">
                  <div className="relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 font-bold text-xs">
                    <Check size={14} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">משימה נוצרה</p>
                    <span className="text-xs text-gray-400 font-mono mt-1 block">{new Date(task.createdAt).toLocaleDateString('he-IL')}</span>
                  </div>
                </div>

                {task.messages.map((msg) => (
                  <div key={msg.id} className={`relative flex gap-3 md:gap-4 ${msg.senderId === 'guest' ? 'flex-row-reverse' : ''}`}>
                    <div className={`relative z-10 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 font-bold text-xs
                      ${msg.senderId === 'guest' ? 'bg-blue-600 text-white' : msg.type === 'system' ? 'bg-amber-100 text-amber-600' : 'bg-gray-200 text-gray-600'}
                    `}>
                      {msg.senderId === 'guest' ? 'אני' : msg.type === 'system' ? '⚡' : '✦'}
                    </div>
                    <div className={`flex-1 ${msg.senderId === 'guest' ? 'text-left' : ''}`}>
                      <div className={`p-3 rounded-2xl inline-block max-w-[85%] text-sm ${
                        msg.senderId === 'guest'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : msg.type === 'system'
                            ? 'bg-amber-50 border border-amber-100 rounded-tl-none text-gray-800'
                            : 'bg-white border border-gray-200 rounded-tl-none text-gray-800'
                      }`}>
                        {msg.text}
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1 px-1">
                        {msg.createdAt ? formatDate(msg.createdAt) : ''}
                      </span>
                    </div>
                  </div>
                ))}

                {task.messages.length === 0 && (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    אין עדכונים עדיין. שלח הודעה לצוות!
                  </div>
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendComment} className="flex gap-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="כתוב תגובה או הערה לצוות..."
                  className="flex-1 p-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none text-sm bg-white"
                  maxLength={2000}
                  disabled={isSendingComment}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSendingComment}
                  className="bg-gray-900 text-white p-3 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {isSendingComment ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center border-t border-gray-100 pt-6 pb-8">
          <p className="text-sm text-gray-400">
            מופעל על ידי <a href="https://misrad-ai.com" target="_blank" rel="noopener noreferrer" className="font-bold text-gray-600 hover:text-gray-900 transition-colors">MISRAD AI</a>
          </p>
        </div>
      </main>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}
