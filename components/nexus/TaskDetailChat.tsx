import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useData } from '../../context/DataContext';
import { Task, User } from '../../types';
import { Send, Paperclip, Mic, MessageSquare, Play, X, Check, Trash2, Edit2, ChevronDown, FileText, Download, Copy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';
import { usePathname } from 'next/navigation';
import { parseWorkspaceRoute } from '@/lib/os/social-routing';
import { isAdminRole } from '@/lib/constants/roles';
import { useSecondTicker } from '@/hooks/useSecondTicker';

interface TaskDetailChatProps {
    task: Task;
    activeTab: 'details' | 'chat';
}

const getAvatarColor = (name: string) => {
    const colors = [
        'text-red-600', 'text-orange-600', 'text-amber-600', 
        'text-green-600', 'text-emerald-600', 'text-teal-600', 
        'text-cyan-600', 'text-blue-600', 'text-indigo-600', 
        'text-violet-600', 'text-purple-600', 'text-fuchsia-600', 
        'text-pink-600', 'text-rose-600'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const TaskDetailChat: React.FC<TaskDetailChatProps> = ({ task, activeTab }) => {
    const { currentUser, users, addMessage, updateMessage, deleteMessage } = useData();
    const pathname = usePathname();
    const orgSlug = parseWorkspaceRoute(pathname).orgSlug;
    const [messageText, setMessageText] = useState('');
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editText, setEditText] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isRecordingComment, setIsRecordingComment] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingStartedAtMsRef = useRef<number | null>(null);
    const transcribeInFlightRef = useRef(false);

    const now = useSecondTicker(isRecordingComment);
    const recordingDurationSeconds = useMemo(() => {
        const startedAt = recordingStartedAtMsRef.current;
        if (!startedAt) return 0;
        const delta = Math.floor(Math.max(0, now - startedAt) / 1000);
        return delta;
    }, [now]);

    const roleStr = String(currentUser.role || '');
    const isManager = roleStr.includes('מנכ') || roleStr.includes('סמנכ') || isAdminRole(roleStr);

    // Ensure messages is always an array
    const messages = Array.isArray(task.messages) ? task.messages : [];
    
    useEffect(() => {
        if (activeTab === 'chat' || window.innerWidth > 768) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activeTab, isRecordingComment, isTranscribing]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageText.trim()) return;
        addMessage(task.id, messageText, undefined, 'user', task);
        setMessageText('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Show loading state (you can add a loading indicator here)
        const type = (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file') as 'image' | 'video' | 'file';
        
        try {
            // Upload file to Supabase Storage
            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'attachments');
            formData.append('folder', 'tasks');
            if (orgSlug) {
                formData.append('orgSlug', String(orgSlug));
            }
            if (currentUser && typeof currentUser === 'object' && 'id' in currentUser && currentUser.id) {
                formData.append('userId', String(currentUser.id));
            }

            const response = await fetch('/api/storage/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            // Create attachment with Supabase URL
            const attachment = {
                name: file.name,
                type,
                senderId: String(currentUser && typeof currentUser === 'object' && 'id' in currentUser ? (currentUser as { id?: string }).id : ''),
                url: String((data as Record<string, unknown>)?.id || data?.url || '') // Prefer stable sb:// reference for DB
            };

            // Add message with attachment
            addMessage(task.id, '', attachment, 'user', task);

        } catch (error: unknown) {
            console.error('[TaskDetailChat] File upload error:', error);
            // Fallback: use blob URL if upload fails (for development)
            if (process.env.NODE_ENV === 'development') {
                const url = URL.createObjectURL(file);
                const attachment = { name: file.name, type, url };
                addMessage(task.id, '', attachment, 'user', task);
            } else {
                alert(`שגיאה בהעלאת הקובץ: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    };

    const handleEditMessage = (msgId: string, text: string) => {
        setEditingMessageId(msgId);
        setEditText(text);
        setOpenMenuId(null);
    };

    const handleSaveEditMessage = (msgId: string) => {
        if (editText.trim()) {
            updateMessage(task.id, msgId, editText, task);
        }
        setEditingMessageId(null);
        setEditText('');
    };

    const handleDeleteMessage = (msgId: string) => {
        if(window.confirm('האם למחוק את ההודעה?')) {
            deleteMessage(task.id, msgId, task);
        }
        setOpenMenuId(null);
    };

    const handleCopyMessage = (text: string) => {
        navigator.clipboard.writeText(text);
        setOpenMenuId(null);
    };

    // --- Recording Logic ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecordingComment(true);
            recordingStartedAtMsRef.current = Date.now();
        } catch (err) {
            console.error("Microphone access denied", err);
            alert("לא ניתן לגשת למיקרופון. אנא בדוק הרשאות דפדפן.");
        }
    };

    const stopAndTranscribe = () => {
        if (mediaRecorderRef.current && isRecordingComment) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.onstop = async () => {
                setIsRecordingComment(false);
                recordingStartedAtMsRef.current = null;
                setIsTranscribing(true);

                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                
                try {
                    if (!orgSlug) {
                        setMessageText(prev => prev + (prev ? ' ' : '') + '🎤 [הודעה קולית נשמרה - תמלול יתווסף בהמשך]');
                        setIsTranscribing(false);
                        return;
                    }

                    if (transcribeInFlightRef.current) return;
                    transcribeInFlightRef.current = true;

                    const formData = new FormData();
                    formData.append('file', audioBlob, 'recording.webm');

                    const res = await fetch(`/api/workspaces/${encodeURIComponent(orgSlug)}/ai/transcribe`, {
                        method: 'POST',
                        body: formData,
                    });

                    const json = await res.json().catch(() => null as unknown);
                    if (!res.ok || !json?.success) {
                        throw new Error(String(json?.error || 'Transcription failed'));
                    }

                    const transcriptText = String(json?.data?.transcriptText || '').trim();
                    if (transcriptText) {
                        setMessageText(prev => prev + (prev ? ' ' : '') + transcriptText);
                    } else {
                        setMessageText(prev => prev + (prev ? ' ' : '') + '🎤 [הודעה קולית נשמרה - תמלול יתווסף בהמשך]');
                    }

                    setIsTranscribing(false);
                } catch (e) {
                    console.error("Transcription failed", e);
                    setMessageText(prev => prev + (prev ? ' ' : '') + '🎤 [הודעה קולית נשמרה - תמלול יתווסף בהמשך]');
                    setIsTranscribing(false);
                } finally {
                    transcribeInFlightRef.current = false;
                    mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());
                }
            };
        } else {
            setIsRecordingComment(false);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
        }
        setIsRecordingComment(false);
        recordingStartedAtMsRef.current = null;
    };

    const formatDuration = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`w-full md:w-[35%] md:shrink-0 flex flex-col bg-[#e5ddd5] relative border-l border-gray-200 overflow-hidden ${activeTab === 'chat' ? 'flex-1 h-full min-h-0' : 'hidden md:flex h-full'}`}>
            <div className="absolute inset-0 z-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/gplay.png')" }}></div>
            
            <div className="hidden md:flex p-4 border-b border-gray-200 bg-[#f0f2f5] z-10 justify-between items-center sticky top-0 shadow-sm">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <MessageSquare size={16} className="text-gray-500" /> הערות ועדכונים
                    <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm">{messages.length}</span>
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 z-10 flex flex-col custom-scrollbar">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center flex-1 text-gray-500 opacity-80 mt-10">
                        <div className="bg-[#dcf8c6] p-4 rounded-full mb-3 shadow-sm">
                            <MessageSquare size={24} className="text-green-600" />
                        </div>
                        <p className="text-sm font-bold bg-white/50 px-3 py-1 rounded-lg backdrop-blur-sm">אין הודעות עדיין.</p>
                        <p className="text-xs mt-1 bg-white/50 px-3 py-1 rounded-lg backdrop-blur-sm">התחל שיחה או הוסף קובץ.</p>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id; 
                    const isSystem = msg.type === 'system';
                    const isGuest = msg.type === 'guest';
                    const sender = users.find((u: User) => u.id === msg.senderId);
                    const isVoice = msg.text.startsWith('🎤');
                    const isEditing = editingMessageId === msg.id;
                    const isOpen = openMenuId === msg.id;

                    if (isSystem) return (
                        <div key={msg.id} className="flex justify-center my-3">
                            <span className="bg-[#fff5c4] text-gray-600 text-[11px] px-3 py-1 rounded-lg shadow-sm border border-[#ffeeb0] text-center max-w-[90%] font-medium">
                                {msg.text}
                            </span>
                        </div>
                    );
                    
                    return (
                        <div 
                            key={msg.id} 
                            className={`flex flex-col ${isMe ? 'items-start' : 'items-end'} mb-1 group relative max-w-full`}
                        >
                            <div 
                                className={`relative p-2 pl-3 pr-3 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] text-sm leading-snug transition-all min-w-[120px] max-w-[95%]
                                ${isMe 
                                    ? 'bg-[#d9fdd3] text-gray-900 rounded-bl-lg rounded-tr-lg rounded-br-lg rounded-tl-none self-end' 
                                    : isGuest 
                                        ? 'bg-[#ede9fe] text-purple-900 rounded-lg border border-purple-100' 
                                        : 'bg-white text-gray-900 rounded-bl-none rounded-tr-lg rounded-br-lg rounded-tl-lg' 
                                }`}
                            >
                                {isEditing ? (
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                        <textarea 
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full bg-white/50 border border-black/10 text-inherit rounded-lg p-2 text-sm outline-none resize-none min-h-[60px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => setEditingMessageId(null)} className="p-1 rounded bg-red-100 text-red-600 hover:bg-red-200"><X size={14} /></button>
                                            <button onClick={() => handleSaveEditMessage(msg.id)} className="p-1 rounded bg-green-100 text-green-600 hover:bg-green-200"><Check size={14} /></button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {!isMe && (
                                            <div className={`text-[12px] font-bold mb-0.5 leading-tight ${isGuest ? 'text-purple-600' : getAvatarColor(sender?.name || '')}`}>
                                                {isGuest ? 'לקוח / אורח' : sender?.name || 'Unknown'}
                                            </div>
                                        )}
                                        
                                        <div className="pr-6 relative">
                                            {msg.attachment && (
                                                <div className="mb-2">
                                                    {String(msg.attachment.url || '').startsWith('sb://') ? (
                                                        <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 text-xs text-amber-800 font-bold">
                                                            אין גישה לקובץ
                                                        </div>
                                                    ) : msg.attachment.type === 'image' ? (
                                                        <div className="relative group/image">
                                                            <img src={msg.attachment.url} alt={msg.attachment.name} className="rounded-lg max-h-48 object-cover border border-black/5" />
                                                            <a href={msg.attachment.url} download={msg.attachment.name} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/image:opacity-100 transition-opacity rounded-lg text-white">
                                                                <Download size={24} />
                                                            </a>
                                                        </div>
                                                    ) : (
                                                        <div className="bg-black/5 p-2 rounded-lg flex items-center gap-3 border border-black/5 max-w-full">
                                                            <div className="bg-white p-2 rounded text-gray-500 shadow-sm"><FileText size={20} /></div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold truncate" title={msg.attachment.name}>{msg.attachment.name}</div>
                                                                <div className="text-[10px] text-gray-500 uppercase">קובץ</div>
                                                            </div>
                                                            <a href={msg.attachment.url} download={msg.attachment.name} className="p-1.5 hover:bg-black/10 rounded-full transition-colors text-gray-600">
                                                                <Download size={16} />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isVoice ? (
                                                <div className="flex items-center gap-2 py-1">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-300 transition-colors text-gray-600">
                                                        <Play size={14} fill="currentColor" />
                                                    </div>
                                                    <div className="h-1 bg-gray-200 rounded-full w-32 overflow-hidden">
                                                        <div className="h-full w-1/3 bg-gray-400 rounded-full"></div>
                                                    </div>
                                                    <Mic size={14} className="opacity-40" />
                                                </div>
                                            ) : (
                                                msg.text && <span className="whitespace-pre-wrap block text-[13.5px] select-text">{msg.text}</span>
                                            )}
                                            
                                            <div className={`absolute -top-1 -right-2 opacity-0 group-hover:opacity-100 transition-opacity ${isOpen ? 'opacity-100' : ''} z-10`}>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setOpenMenuId(isOpen ? null : msg.id); }}
                                                    className="message-menu-trigger w-6 h-6 flex items-center justify-center bg-gray-50/50 backdrop-blur-sm rounded-full hover:bg-white shadow-sm text-gray-500 hover:text-gray-800 transition-all"
                                                >
                                                    <ChevronDown size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-end items-center gap-1 mt-0.5">
                                            <span className="text-[10px] text-gray-400 opacity-80 font-medium">{msg.createdAt}</span>
                                            {isMe && <Check size={12} className="text-blue-400" />}
                                        </div>
                                    </>
                                )}

                                <AnimatePresence>
                                    {isOpen && !isEditing && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                            className={`absolute top-6 ${isMe ? 'right-0' : 'left-0'} bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50 min-w-[140px] overflow-hidden`}
                                        >
                                            <button onClick={() => handleCopyMessage(msg.text)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 w-full text-right transition-colors">
                                                <Copy size={14} /> העתק
                                            </button>
                                            {isMe && (
                                                <button onClick={() => handleEditMessage(msg.id, msg.text)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 w-full text-right transition-colors">
                                                    <Edit2 size={14} /> ערוך
                                                </button>
                                            )}
                                            {(isMe || isManager) && (
                                                <button onClick={() => handleDeleteMessage(msg.id)} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-red-50 text-red-600 w-full text-right transition-colors border-t border-gray-50 mt-1">
                                                    <Trash2 size={14} /> מחק
                                                </button>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            
            <div className="bg-[#f0f2f5] px-4 py-3 border-t border-gray-200 z-20 shrink-0">
                {isTranscribing ? (
                    <div className="flex items-center justify-center gap-3 p-3 text-gray-500 bg-white rounded-xl animate-pulse shadow-sm">
                        <Skeleton className="w-4 h-4 rounded-full" />
                        <span className="text-xs font-bold">מעבד הקלטה...</span>
                    </div>
                ) : isRecordingComment ? (
                    <div className="flex items-center gap-2">
                        <div className="flex-1 bg-white text-red-600 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm border border-red-100">
                            <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                            <span className="font-mono font-bold text-sm">{formatDuration(recordingDurationSeconds)}</span>
                        </div>
                        <button onClick={stopAndTranscribe} className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors shadow-sm"><Check size={20} /></button>
                        <button onClick={cancelRecording} className="p-3 bg-white text-gray-600 rounded-full hover:bg-gray-100 transition-colors shadow-sm"><X size={20} /></button>
                    </div>
                ) : (
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:text-gray-700 hover:bg-white rounded-full transition-colors shrink-0"><Paperclip size={20} /></button>
                        <div className="flex-1 bg-white rounded-2xl flex items-center border border-white focus-within:border-white focus-within:shadow-sm transition-all px-4 py-3 shadow-sm">
                            <input value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="הקלד הודעה..." className="flex-1 outline-none text-sm bg-transparent min-h-[20px]" dir="rtl" autoComplete="off" />
                        </div>
                        {messageText.trim() ? (
                            <button type="submit" className="p-3 bg-[#00a884] text-white rounded-full hover:bg-[#008f6f] transition-all shadow-sm shrink-0 transform active:scale-95"><Send size={18} className="ml-0.5" /></button>
                        ) : (
                            <button type="button" onClick={startRecording} className="p-3 text-gray-500 hover:bg-white hover:text-red-500 rounded-full transition-colors shrink-0"><Mic size={20} /></button>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
};
