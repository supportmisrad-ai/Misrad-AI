'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '@/context/DataContext';

type Message = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl: string | null;
  attachmentType: string | null;
  createdAt: string;
};

type SendAction = (params: {
  orgSlug: string;
  workOrderId: string;
  authorId: string;
  authorName: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
}) => Promise<{ success: boolean; id?: string; error?: string }>;

type UpdateAction = (params: {
  orgSlug: string;
  messageId: string;
  authorId: string;
  content: string;
}) => Promise<{ success: boolean; error?: string }>;

type DeleteAction = (params: {
  orgSlug: string;
  messageId: string;
  authorId: string;
}) => Promise<{ success: boolean; error?: string }>;

const avatarColors = [
  'text-red-600', 'text-orange-600', 'text-amber-600',
  'text-green-600', 'text-emerald-600', 'text-teal-600',
  'text-cyan-600', 'text-blue-600', 'text-indigo-600',
  'text-violet-600', 'text-purple-600', 'text-rose-600',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('he-IL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export default function WorkOrderChat({
  orgSlug,
  workOrderId,
  currentUserId,
  currentUserName,
  initialMessages,
  sendMessageAction,
  updateMessageAction,
  deleteMessageAction,
}: {
  orgSlug: string;
  workOrderId: string;
  currentUserId: string;
  currentUserName: string;
  initialMessages: Message[];
  sendMessageAction: SendAction;
  updateMessageAction: UpdateAction;
  deleteMessageAction: DeleteAction;
}) {
  const { organization } = useData();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Context menu
  const [menuId, setMenuId] = useState<string | null>(null);

  // Voice recording
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length, scrollToBottom]);

  // Close menu on outside click
  useEffect(() => {
    if (!menuId) return;
    const handler = () => setMenuId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuId]);

  const msgCount = useMemo(() => messages.length, [messages.length]);

  // ──── Send text message ────
  async function handleSend(e?: React.FormEvent) {
    e?.preventDefault();
    const content = text.trim();
    if (!content || isSending) return;

    setText('');
    setError(null);
    setIsSending(true);

    // Optimistic
    const tmpId = `tmp-${Date.now()}`;
    setMessages(prev => [...prev, {
      id: tmpId, authorId: currentUserId, authorName: currentUserName,
      content, attachmentUrl: null, attachmentType: null,
      createdAt: new Date().toISOString(),
    }]);
    scrollToBottom();

    const res = await sendMessageAction({ orgSlug, workOrderId, authorId: currentUserId, authorName: currentUserName, content });
    setIsSending(false);

    if (!res.success) {
      setError(res.error || 'שגיאה בשליחת הודעה');
      setMessages(prev => prev.filter(m => m.id !== tmpId));
      return;
    }

    setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, id: res.id || tmpId } : m));
  }

  // ──── File upload ────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setError(null);
    setIsSending(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'attachments');
      formData.append('folder', 'operations');
      formData.append('organizationId', organization?.id || '');

      const response = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok || !data.success) throw new Error(data.error || 'Upload failed');

      const attachmentUrl = String(data?.url || data?.id || '');
      const attachmentType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';

      const tmpId = `tmp-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: tmpId, authorId: currentUserId, authorName: currentUserName,
        content: '', attachmentUrl, attachmentType,
        createdAt: new Date().toISOString(),
      }]);
      scrollToBottom();

      const res = await sendMessageAction({
        orgSlug, workOrderId, authorId: currentUserId, authorName: currentUserName,
        content: '', attachmentUrl, attachmentType,
      });

      if (!res.success) {
        setMessages(prev => prev.filter(m => m.id !== tmpId));
        setError(res.error || 'שגיאה בשליחת קובץ');
      } else {
        setMessages(prev => prev.map(m => m.id === tmpId ? { ...m, id: res.id || tmpId } : m));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה בהעלאת קובץ');
    } finally {
      setIsSending(false);
    }
  }

  // ──── Voice recording ────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      setError('לא ניתן לגשת למיקרופון. בדוק הרשאות.');
    }
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  }

  async function stopAndTranscribe() {
    if (!mediaRecorderRef.current || !isRecording) return;

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    mediaRecorderRef.current.onstop = async () => {
      setIsTranscribing(true);
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

      try {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/ai/transcribe`, {
          method: 'POST', body: formData,
        });
        const json = await res.json().catch(() => null as unknown) as Record<string, unknown> | null;

        const transcriptText = String((json?.data as Record<string, unknown>)?.transcriptText || '').trim();
        if (transcriptText) {
          setText(prev => prev + (prev ? ' ' : '') + transcriptText);
        } else {
          setText(prev => prev + (prev ? ' ' : '') + '[הודעה קולית]');
        }
      } catch {
        setText(prev => prev + (prev ? ' ' : '') + '[הודעה קולית]');
      } finally {
        setIsTranscribing(false);
        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
      }
    };
  }

  // ──── Edit / Delete ────
  async function handleSaveEdit(msgId: string) {
    const content = editText.trim();
    if (!content) return;
    setEditingId(null);

    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content } : m));
    const res = await updateMessageAction({ orgSlug, messageId: msgId, authorId: currentUserId, content });
    if (!res.success) setError(res.error || 'שגיאה בעדכון');
  }

  async function handleDelete(msgId: string) {
    setMenuId(null);
    setMessages(prev => prev.filter(m => m.id !== msgId));
    const res = await deleteMessageAction({ orgSlug, messageId: msgId, authorId: currentUserId });
    if (!res.success) setError(res.error || 'שגיאה במחיקה');
  }

  function handleCopy(content: string) {
    navigator.clipboard.writeText(content);
    setMenuId(null);
  }

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="rounded-2xl border border-white/20 overflow-hidden flex flex-col bg-slate-900/5 relative" style={{ maxHeight: '520px' }}>
      {/* Background with Bloom and Grain */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      <div className="absolute top-0 left-0 w-64 h-64 bg-sky-500/10 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2 pointer-events-none" />

      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/40 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <span className="text-sm font-black text-slate-800 block leading-tight">הערות ועדכונים</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{msgCount} הודעות</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 no-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="bg-white/60 backdrop-blur-md p-5 rounded-3xl mb-4 shadow-xl shadow-black/5 border border-white">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm font-black text-slate-700">ממתינים לעדכון ראשון</p>
            <p className="text-[11px] mt-1.5 font-bold text-slate-400">שלח הודעה, קובץ, או הקלטה קולית</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.authorId === currentUserId;
            const isOptimistic = m.id.startsWith('tmp-');
            const isEditing = editingId === m.id;
            const isMenuOpen = menuId === m.id;

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} group relative`}>
                <div
                  className={`relative p-3 shadow-xl backdrop-blur-md text-sm min-w-[120px] max-w-[88%] border transition-all
                    ${isMe
                      ? 'bg-sky-500 text-white rounded-2xl rounded-tl-none border-sky-400/30 shadow-sky-500/20'
                      : 'bg-white/80 text-slate-900 rounded-2xl rounded-tr-none border-white shadow-black/5'
                    } ${isOptimistic ? 'opacity-60' : ''}`}
                >
                  {isEditing ? (
                    <div className="space-y-3 min-w-[220px]">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-white/20 border border-white/30 rounded-xl p-3 text-sm outline-none resize-none min-h-[70px] text-white placeholder:text-white/60 font-bold"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 text-[11px] font-black transition-colors">ביטול</button>
                        <button onClick={() => handleSaveEdit(m.id)} className="px-3 py-1.5 rounded-lg bg-white text-sky-600 hover:bg-sky-50 text-[11px] font-black shadow-lg transition-colors">שמור</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isMe && (
                        <div className={`text-[10px] font-black mb-1 uppercase tracking-wider ${getAvatarColor(m.authorName)}`}>{m.authorName}</div>
                      )}

                      {/* Attachment */}
                      {m.attachmentUrl && !m.attachmentUrl.startsWith('sb://') ? (
                        <div className="mb-2 group/attachment">
                          {m.attachmentType === 'image' ? (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="block relative overflow-hidden rounded-xl border border-black/5 shadow-inner">
                              <img src={m.attachmentUrl} alt="" className="rounded-xl max-h-56 object-cover transition-transform duration-500 group-hover/attachment:scale-105" />
                              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/attachment:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-3 rounded-xl border text-xs font-black transition-all ${isMe ? 'bg-white/10 border-white/20 hover:bg-white/20' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm text-[10px] font-black ${isMe ? 'bg-white text-sky-600' : 'bg-white text-slate-500 border border-slate-100'}`}>PDF</div>
                              <span className="truncate">קובץ מצורף</span>
                            </a>
                          )}
                        </div>
                      ) : null}

                      {m.content ? <span className="whitespace-pre-wrap break-words block text-[13.5px] font-bold leading-relaxed">{m.content}</span> : null}

                      <div className="flex justify-end items-center gap-1.5 mt-1.5 opacity-70">
                        <span className="text-[9px] font-black uppercase tracking-tight">{isOptimistic ? 'שולח...' : formatTime(m.createdAt)}</span>
                        {isMe && !isOptimistic ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : null}
                      </div>

                      {/* Context menu trigger */}
                      {!isOptimistic ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : m.id); }}
                          className={`absolute -top-2 ${isMe ? '-right-2' : '-left-2'} w-6 h-6 flex items-center justify-center bg-white rounded-full shadow-lg text-slate-500 hover:text-sky-600 transition-all scale-0 group-hover:scale-100 z-20 ${isMenuOpen ? 'scale-100 ring-2 ring-sky-100' : ''}`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      ) : null}
                    </>
                  )}

                  {/* Context menu */}
                  {isMenuOpen && !isEditing ? (
                    <div className={`absolute top-6 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-2xl shadow-2xl border border-slate-100 py-1.5 z-50 min-w-[140px] animate-in fade-in zoom-in duration-200`}>
                      <button onClick={() => handleCopy(m.content)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 w-full text-right transition-colors">
                        העתק טקסט
                      </button>
                      {isMe ? (
                        <button onClick={() => { setEditingId(m.id); setEditText(m.content); setMenuId(null); }} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold hover:bg-slate-50 text-slate-700 w-full text-right transition-colors">
                          ערוך הודעה
                        </button>
                      ) : null}
                      {isMe ? (
                        <button onClick={() => handleDelete(m.id)} className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-black hover:bg-rose-50 text-rose-600 w-full text-right border-t border-slate-50 mt-1 transition-colors">
                          מחק הודעה
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 py-2.5 bg-rose-500 text-white text-[11px] font-black text-center z-20"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="bg-white/60 backdrop-blur-xl px-4 py-3.5 border-t border-white/40 z-10">
        {isTranscribing ? (
          <div className="flex items-center justify-center gap-3 p-3.5 text-sky-600 bg-sky-500/5 rounded-2xl border border-sky-100 animate-pulse shadow-sm">
            <div className="w-3 h-3 rounded-full bg-sky-500 animate-bounce" />
            <span className="text-xs font-black">AI מעבד הקלטה קולית...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-rose-500 text-white rounded-2xl px-5 py-3 flex items-center gap-4 shadow-xl shadow-rose-500/20 border border-rose-400/30">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
              <span className="font-mono font-black text-base">{formatDuration(recordingSeconds)}</span>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80">מקליט...</span>
            </div>
            <button onClick={stopAndTranscribe} className="w-12 h-12 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-90" title="סיים והוסף תמלול">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button onClick={cancelRecording} className="w-12 h-12 flex items-center justify-center bg-white text-slate-500 rounded-full hover:bg-slate-50 transition-all shadow-md active:scale-90 border border-slate-200" title="ביטול">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2.5">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,video/*" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-sky-500/5 rounded-2xl transition-all shrink-0 active:scale-90" title="צרף קובץ">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <div className="flex-1 bg-white rounded-2xl flex items-center border border-slate-200 focus-within:border-sky-500 focus-within:ring-4 focus-within:ring-sky-500/10 px-4 py-2.5 shadow-sm transition-all group/input">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="הקלד עדכון מהשטח..."
                className="flex-1 outline-none text-sm bg-transparent font-bold text-slate-900 placeholder:text-slate-400"
                dir="rtl"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
            </div>
            {text.trim() ? (
              <button type="submit" disabled={isSending} className="w-12 h-12 flex items-center justify-center bg-sky-500 text-white rounded-2xl hover:bg-sky-600 transition-all shadow-lg shadow-sky-500/20 shrink-0 disabled:opacity-50 active:scale-90" title="שלח">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:bg-rose-500/5 hover:text-rose-500 rounded-2xl transition-all shrink-0 active:scale-90" title="הקלט הודעה קולית">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
