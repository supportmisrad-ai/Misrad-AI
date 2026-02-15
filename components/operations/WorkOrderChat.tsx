'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
      formData.append('orgSlug', orgSlug);

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
    <div className="rounded-2xl border border-slate-200 overflow-hidden flex flex-col bg-[#e5ddd5]" style={{ maxHeight: '520px' }}>
      {/* Header */}
      <div className="p-3 border-b border-slate-200 bg-[#f0f2f5] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="text-xs font-black text-slate-800">הערות ועדכונים</span>
          <span className="bg-emerald-500 text-white px-1.5 py-0.5 rounded-full text-[10px] font-black">{msgCount}</span>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 relative"
        style={{ minHeight: '160px', backgroundImage: "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22%3E%3Crect width=%2220%22 height=%2220%22 fill=%22%23e5ddd5%22/%3E%3Ccircle cx=%2210%22 cy=%2210%22 r=%220.5%22 fill=%22%23d4cdc3%22/%3E%3C/svg%3E')" }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500">
            <div className="bg-[#dcf8c6] p-3 rounded-full mb-2 shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-600"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm font-bold bg-white/60 px-3 py-1 rounded-lg">אין הודעות עדיין</p>
            <p className="text-[11px] mt-1 bg-white/60 px-3 py-1 rounded-lg">שלח הודעה, קובץ, או הקלטה קולית</p>
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
                  className={`relative p-2.5 px-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.1)] text-sm min-w-[100px] max-w-[85%]
                    ${isMe
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-bl-lg rounded-tr-lg rounded-br-lg rounded-tl-none'
                      : 'bg-white text-slate-900 rounded-bl-none rounded-tr-lg rounded-br-lg rounded-tl-lg'
                    } ${isOptimistic ? 'opacity-60' : ''}`}
                >
                  {isEditing ? (
                    <div className="space-y-2 min-w-[200px]">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full bg-white/60 border border-slate-200 rounded-lg p-2 text-sm outline-none resize-none min-h-[50px]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditingId(null)} className="p-1 rounded bg-rose-100 text-rose-600 hover:bg-rose-200 text-xs font-bold px-2">ביטול</button>
                        <button onClick={() => handleSaveEdit(m.id)} className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-xs font-bold px-2">שמור</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {!isMe && (
                        <div className={`text-[11px] font-black mb-0.5 ${getAvatarColor(m.authorName)}`}>{m.authorName}</div>
                      )}

                      {/* Attachment */}
                      {m.attachmentUrl && !m.attachmentUrl.startsWith('sb://') ? (
                        <div className="mb-1.5">
                          {m.attachmentType === 'image' ? (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer">
                              <img src={m.attachmentUrl} alt="" className="rounded-lg max-h-48 object-cover border border-black/5" />
                            </a>
                          ) : (
                            <a href={m.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/5 p-2 rounded-lg border border-black/5 text-xs font-bold hover:bg-black/10">
                              <div className="w-8 h-8 bg-white rounded flex items-center justify-center text-slate-500 shadow-sm text-[10px] font-black">PDF</div>
                              <span className="truncate">קובץ מצורף</span>
                            </a>
                          )}
                        </div>
                      ) : null}

                      {m.content ? <span className="whitespace-pre-wrap break-words block text-[13px]">{m.content}</span> : null}

                      <div className="flex justify-end items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-slate-400">{isOptimistic ? 'שולח...' : formatTime(m.createdAt)}</span>
                        {isMe && !isOptimistic ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-blue-400"><polyline points="20 6 9 17 4 12"/></svg>
                        ) : null}
                      </div>

                      {/* Context menu trigger */}
                      {!isOptimistic ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuId(isMenuOpen ? null : m.id); }}
                          className={`absolute -top-1 ${isMe ? '-right-1' : '-left-1'} w-5 h-5 flex items-center justify-center bg-white/80 rounded-full shadow-sm text-slate-500 hover:text-slate-800 transition-all ${isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                      ) : null}
                    </>
                  )}

                  {/* Context menu */}
                  {isMenuOpen && !isEditing ? (
                    <div className={`absolute top-6 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 min-w-[130px]`}>
                      <button onClick={() => handleCopy(m.content)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 w-full text-right">
                        העתק
                      </button>
                      {isMe ? (
                        <button onClick={() => { setEditingId(m.id); setEditText(m.content); setMenuId(null); }} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 text-slate-700 w-full text-right">
                          ערוך
                        </button>
                      ) : null}
                      {isMe ? (
                        <button onClick={() => handleDelete(m.id)} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-rose-50 text-rose-600 w-full text-right border-t border-slate-50 mt-1">
                          מחק
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
      {error ? (
        <div className="px-3 py-2 bg-rose-50 border-t border-rose-100 text-xs font-bold text-rose-700">{error}</div>
      ) : null}

      {/* Input area */}
      <div className="bg-[#f0f2f5] px-3 py-2.5 border-t border-slate-200">
        {isTranscribing ? (
          <div className="flex items-center justify-center gap-2 p-3 text-slate-500 bg-white rounded-xl animate-pulse shadow-sm">
            <div className="w-3 h-3 rounded-full bg-slate-400 animate-bounce" />
            <span className="text-xs font-bold">מעבד הקלטה...</span>
          </div>
        ) : isRecording ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white text-rose-600 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm border border-rose-100">
              <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
              <span className="font-mono font-bold text-sm">{formatDuration(recordingSeconds)}</span>
            </div>
            <button onClick={stopAndTranscribe} className="p-2.5 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors shadow-sm" title="סיים והוסף תמלול">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
            <button onClick={cancelRecording} className="p-2.5 bg-white text-slate-600 rounded-full hover:bg-slate-100 transition-colors shadow-sm" title="ביטול">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,video/*" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-full transition-colors shrink-0" title="צרף קובץ">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <div className="flex-1 bg-white rounded-2xl flex items-center border border-white focus-within:shadow-sm px-3 py-2 shadow-sm">
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="הקלד הודעה..."
                className="flex-1 outline-none text-sm bg-transparent font-bold text-slate-900 placeholder:text-slate-400"
                dir="rtl"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
            </div>
            {text.trim() ? (
              <button type="submit" disabled={isSending} className="p-2.5 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-all shadow-sm shrink-0 disabled:opacity-50" title="שלח">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="p-2 text-slate-500 hover:bg-white hover:text-rose-500 rounded-full transition-colors shrink-0" title="הקלט הודעה קולית">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
