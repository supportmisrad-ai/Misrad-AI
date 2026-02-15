'use client';

import React, { useRef, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
    UploadCloud, FileAudio, X, Activity, 
    MessageSquare, CheckCircle, AlertTriangle, Target, 
    ListTodo, ThumbsUp, ThumbsDown, MessageCircle, 
    Play, Pause, Mic, MicOff, Zap, User, Fingerprint, Clock, FileText,
    ListChecks, Heart, Smile, History, Trash2, ArrowRight,
    Edit2, Link as LinkIcon, StickyNote
} from 'lucide-react';

import { useCallAnalysis } from '../contexts/CallAnalysisContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import AiOutOfCreditsModal from '../../AiOutOfCreditsModal';
import { CallAnalysisTask, Lead } from '../types';
import { Priority, Task } from '@/types';
import { createNexusTaskByOrgSlug } from '../../../../app/actions/nexus';
import { Skeleton } from '../../../ui/skeletons';

interface CallAnalyzerViewProps {
    leads?: Lead[];
}

const CallAnalyzerView: React.FC<CallAnalyzerViewProps> = ({ leads = [] }) => {

    const {
        state,
        history,
        startAnalysis,
        cancelAnalysis,
        resetAnalysis,
        loadFromHistory,
        deleteFromHistory,
        updateHistoryItem,
        analyzeTranscriptText,
        creditsModal,
        closeCreditsModal,
    } = useCallAnalysis();

    const { addToast } = useToast();
    const { user } = useAuth();
    const pathname = usePathname();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    const [isLiveOpen, setIsLiveOpen] = useState(false);
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [isLiveFinalizing, setIsLiveFinalizing] = useState(false);
    const [liveTranscriptText, setLiveTranscriptText] = useState('');
    const [liveInsight, setLiveInsight] = useState('ממתין לתחילת השיחה...');

    const liveCoachEnabled = process.env.NEXT_PUBLIC_LIVE_COACH_ENABLED === 'true';

    const liveRecorderRef = useRef<MediaRecorder | null>(null);
    const liveStreamRef = useRef<MediaStream | null>(null);
    const liveChunksRef = useRef<Blob[]>([]);
    const liveTranscribeInFlightRef = useRef(false);
    const liveInsightInFlightRef = useRef(false);
    const lastInsightAtRef = useRef(0);
    const lastInsightTranscriptLenRef = useRef(0);

    // Editing States
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [tempNotes, setTempNotes] = useState('');

    const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
    const [editingDueAt, setEditingDueAt] = useState<string>('');
    const [creatingTaskIndex, setCreatingTaskIndex] = useState<number | null>(null);

    // Sync state when result changes
    useEffect(() => {
        if (state.result) {
            setTempTitle(state.result.title || state.result.fileName || 'שיחה ללא שם');
            setTempNotes(state.result.userNotes || '');
        }
    }, [state.result]);

    const handleSaveTitle = () => {
        if (state.result?.id) {
            updateHistoryItem(state.result.id, { title: tempTitle });
            setIsEditingTitle(false);
            addToast('כותרת עודכנה', 'success');
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatDate = (isoString?: string) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const orgSlugFromPathname = () => {
        const parts = String(pathname || '').split('/').filter(Boolean);
        const wIndex = parts.indexOf('w');
        if (wIndex === -1) return null;
        return parts[wIndex + 1] || null;
    };

    const toLocalDateTimeInputValue = (date: Date) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    const isCallAnalysisTask = (t: string | CallAnalysisTask): t is CallAnalysisTask => {
        return Boolean(t && typeof t === 'object' && typeof t.title === 'string');
    };

    const updateTaskAtIndex = (idx: number, patch: Partial<CallAnalysisTask>) => {
        if (!state.result?.id || !state.result?.topics) return;
        const existing = state.result.topics.tasks || [];
        const next = existing.map((t, i) => {
            if (i !== idx) return t;
            if (!isCallAnalysisTask(t)) return t;
            return { ...t, ...patch };
        });
        updateHistoryItem(state.result.id, {
            topics: {
                ...state.result.topics,
                tasks: next,
            },
        });
    };

    const confirmTask = async (idx: number, dueDateIso: string) => {
        const orgSlug = orgSlugFromPathname();
        if (!orgSlug) {
            addToast('לא ניתן לקבוע תזכורת (orgSlug חסר)', 'error');
            return;
        }

        const assigneeId = user?.id ? String(user.id) : '';
        if (!assigneeId) {
            addToast('לא ניתן לקבוע תזכורת (משתמש לא מחובר)', 'error');
            return;
        }
        const tasks = state.result?.topics?.tasks || [];
        const t = tasks[idx];
        if (!isCallAnalysisTask(t)) return;

        setCreatingTaskIndex(idx);
        try {
            const due = new Date(String(dueDateIso || ''));
            if (Number.isNaN(due.getTime())) {
                addToast('תאריך לא תקין', 'error');
                return;
            }
            const dueDate = due.toISOString().slice(0, 10);

            const created = await createNexusTaskByOrgSlug({
                orgSlug,
                input: {
                    title: String(t.title || '').trim(),
                    description: t.dueAtRationale ? String(t.dueAtRationale) : '',
                    assigneeId,
                    assigneeIds: [assigneeId],
                    dueDate,
                    priority: Priority.MEDIUM,
                    status: 'Todo',
                    createdAt: new Date().toISOString(),
                    leadId: state.result?.leadId ? String(state.result.leadId) : null,
                } as never
            });

            updateTaskAtIndex(idx, {
                confirmedDueAt: due.toISOString(),
                systemTaskId: String(created.id),
                dismissed: false,
            });
            addToast('נקבע ביומן', 'success');
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'שגיאה בקביעת תזכורת';
            addToast(msg, 'error');
        } finally {
            setCreatingTaskIndex(null);
        }
    };

    useEffect(() => {
        return () => {
            try {
                const rec = liveRecorderRef.current;
                if (rec && rec.state !== 'inactive') {
                    try {
                        rec.stop();
                    } catch {
                        // ignore
                    }
                }
                const stream = liveStreamRef.current;
                if (stream) {
                    for (const t of stream.getTracks()) {
                        try {
                            t.stop();
                        } catch {
                            // ignore
                        }
                    }
                }
            } finally {
                liveRecorderRef.current = null;
                liveStreamRef.current = null;
            }
        };
    }, []);

    const startLiveSession = async () => {
        if (!liveCoachEnabled) {
            addToast('המאמן החי מושבת כרגע', 'info');
            return;
        }

        const orgSlug = orgSlugFromPathname();
        if (!orgSlug) {
            addToast('לא ניתן להתחיל Live (orgSlug חסר)', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            liveStreamRef.current = stream;
            liveChunksRef.current = [];

            let recorder: MediaRecorder;
            const preferred = 'audio/webm;codecs=opus';
            if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(preferred)) {
                recorder = new MediaRecorder(stream, { mimeType: preferred });
            } else {
                recorder = new MediaRecorder(stream);
            }
            liveRecorderRef.current = recorder;

            lastInsightAtRef.current = 0;
            lastInsightTranscriptLenRef.current = 0;
            setIsLiveOpen(true);
            setIsLiveFinalizing(false);
            setIsLiveActive(true);
            setLiveTranscriptText('');
            setLiveInsight('ממתין לתחילת השיחה...');

            recorder.ondataavailable = async (ev: BlobEvent) => {
                try {
                    if (!ev.data || ev.data.size === 0) return;
                    liveChunksRef.current.push(ev.data);

                    if (liveTranscribeInFlightRef.current) return;
                    liveTranscribeInFlightRef.current = true;

                    const mimeType = recorder.mimeType || ev.data.type || 'audio/webm';
                    const fd = new FormData();
                    fd.append('file', new File([ev.data], `live-${Date.now()}.webm`, { type: mimeType }));

                    const transcribeRes = await fetch(
                        `/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/transcribe`,
                        {
                            method: 'POST',
                            body: fd,
                        }
                    );

                    if (!transcribeRes.ok) return;
                    const json = (await transcribeRes.json().catch(() => ({}))) as Record<string, unknown>;
                    const nested = (json?.data && typeof json.data === 'object' ? json.data : {}) as Record<string, unknown>;
                    const text = String(nested?.transcriptText || json?.transcriptText || '').trim();
                    if (!text) return;

                    let nextTranscript = '';
                    setLiveTranscriptText((prev) => {
                        nextTranscript = prev ? `${prev}\n${text}` : text;
                        return nextTranscript;
                    });

                    const now = Date.now();
                    const minMs = 6500;
                    const minCharsDelta = 220;

                    if (
                        !liveInsightInFlightRef.current &&
                        now - lastInsightAtRef.current >= minMs &&
                        nextTranscript.length - lastInsightTranscriptLenRef.current >= minCharsDelta
                    ) {
                        liveInsightInFlightRef.current = true;
                        lastInsightAtRef.current = now;
                        lastInsightTranscriptLenRef.current = nextTranscript.length;

                        void (async () => {
                            try {
                                const insightRes = await fetch(
                                    `/api/workspaces/${encodeURIComponent(orgSlug)}/system/call-analyzer/live/insight`,
                                    {
                                        method: 'POST',
                                        headers: { 'content-type': 'application/json' },
                                        body: JSON.stringify({ transcriptText: nextTranscript }),
                                    }
                                );

                                if (!insightRes.ok) return;
                                const insightJson = (await insightRes.json().catch(() => ({}))) as Record<string, unknown>;
                                const nestedInsight = (insightJson?.data && typeof insightJson.data === 'object' ? insightJson.data : {}) as Record<string, unknown>;
                                const insight = String(nestedInsight?.insight || insightJson?.insight || '').trim();
                                if (insight) setLiveInsight(insight);
                            } finally {
                                liveInsightInFlightRef.current = false;
                            }
                        })();
                    }
                } finally {
                    liveTranscribeInFlightRef.current = false;
                }
            };

            recorder.start(2000);
        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : 'שגיאה בהפעלת Live';
            addToast(msg, 'error');
            setIsLiveOpen(false);
            setIsLiveActive(false);
        }
    };

    const stopLiveSession = () => {
        setIsLiveActive(false);
        setIsLiveFinalizing(true);
        setLiveInsight('מפיק דוח...');

        try {
            const rec = liveRecorderRef.current;
            if (rec && rec.state !== 'inactive') {
                try {
                    rec.stop();
                } catch {
                    // ignore
                }
            }

            const stream = liveStreamRef.current;
            if (stream) {
                for (const t of stream.getTracks()) {
                    try {
                        t.stop();
                    } catch {
                        // ignore
                    }
                }
            }
        } finally {
            liveRecorderRef.current = null;
            liveStreamRef.current = null;
        }

        const transcript = String(liveTranscriptText || '').trim();
        if (!transcript) {
            addToast('אין מספיק תמלול להפקת דוח', 'error');
            setIsLiveOpen(false);
            setIsLiveFinalizing(false);
            return;
        }

        const blob = new Blob(liveChunksRef.current, { type: 'audio/webm' });
        const audioUrl = blob.size > 0 ? URL.createObjectURL(blob) : '';
        const fileName = `Live-${new Date().toISOString().slice(0, 16).replace(':', '-')}.webm`;

        setIsLiveOpen(false);
        analyzeTranscriptText(transcript, {
            title: 'שיחה חיה',
            fileName,
            audioUrl,
        });

        setIsLiveFinalizing(false);
    };

    // --- RENDER STATES ---

    if (isLiveOpen) {
        return (
            <div className="h-full flex flex-col p-4 md:p-8 animate-fade-in gap-6 overflow-y-auto custom-scrollbar">
                <AiOutOfCreditsModal
                    open={creditsModal.open}
                    onCloseAction={closeCreditsModal}
                    checkoutHref="/subscribe/checkout"
                    outputsCount={creditsModal.outputsCount}
                    savedHours={creditsModal.savedHours}
                />

                <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <Mic size={22} />
                            </div>
                            <div>
                                <div className="text-xl font-black text-slate-900">Live Coach</div>
                                <div className="text-sm text-slate-500 font-medium">תמלול ותובנות בזמן אמת</div>
                            </div>
                        </div>

                        <button
                            onClick={stopLiveSession}
                            disabled={isLiveFinalizing}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <MicOff size={18} /> סיים והפק דוח
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[420px]">
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">תמלול חי</div>
                            <div className="text-xs font-bold text-slate-500 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isLiveActive ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></span>
                                {isLiveActive ? 'מקליט' : 'מושהה'}
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                            {liveTranscriptText || 'התחל לדבר...'}
                        </div>
                    </div>

                    <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-6 shadow-sm flex flex-col min-h-[420px]">
                        <div className="flex items-center gap-2 text-indigo-700 font-black text-sm mb-4">
                            <Zap size={16} /> תובנה עכשיו
                        </div>
                        <div className="bg-white border border-indigo-100 rounded-2xl p-4 text-sm font-bold text-slate-800">
                            {liveInsight}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 1. Upload State + History
    if (!state.isProcessing && !state.result) {
        return (
            <div className="h-full flex flex-col p-4 md:p-8 animate-fade-in gap-8 overflow-y-auto custom-scrollbar">
                <AiOutOfCreditsModal
                    open={creditsModal.open}
                    onCloseAction={closeCreditsModal}
                    checkoutHref="/subscribe/checkout"
                    outputsCount={creditsModal.outputsCount}
                    savedHours={creditsModal.savedHours}
                />

                <div className="flex items-center justify-center">
                    <button
                        type="button"
                        onClick={startLiveSession}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                    >
                        <Mic size={20} /> התחל שיחה חיה
                    </button>
                </div>
                
                {/* Upload Zone */}
                <div className="flex flex-col items-center justify-center">
                    <div 
                        className="w-full max-w-2xl bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    startAnalysis(file);
                                    addToast('הקובץ עלה לעיבוד ברקע. אפשר להמשיך לגלוש במערכת.', 'info');
                                }
                            }} 
                            className="hidden" 
                            accept="audio/*,.mp3,.wav,.m4a"
                        />
                        <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-sm">
                            <UploadCloud size={40} className="text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">גרור קובץ שיחה או לחץ להעלאה</h3>
                        <p className="text-slate-500 mb-6 max-w-md">
                            תומך בקבצי שמע ארוכים (עד שעתיים). המערכת תבצע תמלול, זיהוי דוברים וניתוח פסיכולוגי מלא.
                        </p>
                        <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-wider">
                            <span className="flex items-center gap-1"><FileAudio size={14} /> MP3, WAV, M4A</span>
                            <span className="flex items-center gap-1"><Clock size={14} /> עד 120 דקות</span>
                            <span className="flex items-center gap-1"><Fingerprint size={14} /> מאובטח</span>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                {history.length > 0 && (
                    <div className="max-w-4xl mx-auto w-full">
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <History size={20} className="text-slate-400" />
                            היסטוריית ניתוחים
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {history.map((item) => (
                                <div 
                                    key={item.id} 
                                    onClick={() => loadFromHistory(item)}
                                    className="bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm ${item.score > 80 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                                {item.score}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-slate-800 text-sm truncate max-w-[180px]">{item.title || item.fileName || 'קובץ ללא שם'}</div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Clock size={10} /> {formatDate(item.date)}
                                                    {item.leadId && (
                                                        <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-1.5 rounded mr-1 truncate max-w-[80px]">
                                                            <User size={10} />
                                                            {leads.find(l => l.id === item.leadId)?.name || 'ליד מקושר'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm('האם למחוק את הניתוח לצמיתות?')) {
                                                    deleteFromHistory(item.id);
                                                    addToast('הניתוח נמחק מההיסטוריה', 'success');
                                                }
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg truncate">
                                        <span className="font-bold shrink-0">נושאים:</span> {item.topics.painPoints.slice(0, 2).join(', ') || 'ללא נושאים'}...
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100 group-hover:bg-indigo-500 transition-colors"></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // 2. Processing State
    if (state.isProcessing) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 animate-fade-in relative">
                <AiOutOfCreditsModal
                    open={creditsModal.open}
                    onCloseAction={closeCreditsModal}
                    checkoutHref="/subscribe/checkout"
                    outputsCount={creditsModal.outputsCount}
                    savedHours={creditsModal.savedHours}
                />
                <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-8 border border-slate-200 text-center relative overflow-hidden">
                    {/* Background Pulse */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100">
                        <div className="h-full bg-indigo-600 animate-progress-indeterminate"></div>
                    </div>

                    <div className="w-20 h-20 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                        <Skeleton className="absolute inset-0 rounded-full bg-indigo-100" />
                        <Activity className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-2">מנתח שיחה...</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6 font-mono">{state.currentStep}</p>
                    
                    <div className="w-full bg-slate-100 h-3 rounded-full mb-2 overflow-hidden">
                        <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${state.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 font-bold mb-8">
                        <span>{Math.round(state.progress)}%</span>
                        <span>זמן משוער: 2-5 דקות</span>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 mb-6">
                        <strong>טיפ:</strong> זה יכול לקחת כמה דקות. אתם יכולים להמשיך לסייר במערכת, אנחנו נודיע לכם כשזה מוכן.
                    </div>

                    <button 
                        onClick={cancelAnalysis}
                        className="text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                    >
                        ביטול ניתוח
                    </button>
                </div>
            </div>
        );
    }

    // 3. Results State (The Dashboard)
    const result = state.result!;
    return (
        <div className="h-full flex flex-col overflow-hidden animate-slide-up">
            <AiOutOfCreditsModal
                open={creditsModal.open}
                onCloseAction={closeCreditsModal}
                checkoutHref="/subscribe/checkout"
                outputsCount={creditsModal.outputsCount}
                savedHours={creditsModal.savedHours}
            />
            
            {/* Results Header */}
            <div className="shrink-0 p-6 border-b border-slate-200 bg-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                        <Activity size={24} />
                    </div>
                    <div>
                        {isEditingTitle ? (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={tempTitle}
                                    onChange={(e) => setTempTitle(e.target.value)}
                                    className="border border-indigo-300 rounded px-2 py-1 text-lg font-bold text-slate-800 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    autoFocus
                                />
                                <button onClick={handleSaveTitle} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"><CheckCircle size={16} /></button>
                            </div>
                        ) : (
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                                {result.title || state.fileName}
                                <Edit2 size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </h2>
                        )}
                        <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                            <span className="flex items-center gap-1"><Clock size={12} /> {result.duration}</span>
                            
                            {/* Lead Assignment */}
                            <div className="flex items-center gap-1 bg-slate-100 rounded px-2 py-0.5">
                                <LinkIcon size={10} />
                                <select 
                                    value={result.leadId || ''} 
                                    onChange={(e) => {
                                        const leadId = e.target.value;
                                        if (state.result?.id) {
                                            updateHistoryItem(state.result.id, { leadId });
                                            const leadName = leads.find(l => l.id === leadId)?.name;
                                            if (leadName) addToast(`השיחה שויכה ל-${leadName}`, 'success');
                                        }
                                    }}
                                    className="bg-transparent border-none text-xs font-medium text-slate-600 focus:ring-0 cursor-pointer outline-none p-0 w-24"
                                >
                                    <option value="">שייך לליד...</option>
                                    {leads.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center px-4 border-l border-slate-100">
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ציון שיחה</div>
                        <div className={`text-2xl font-black ${result.score > 80 ? 'text-emerald-500' : 'text-amber-500'}`}>{result.score}</div>
                    </div>
                    <button onClick={resetAnalysis} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                
                {/* Left Column: Transcript & Player */}
                <div className="w-full lg:w-[60%] flex flex-col border-l border-slate-200 bg-white">
                    
                    {/* Audio Player Real Implementation */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200">
                        {result.audioUrl ? (
                            <audio 
                                ref={audioRef}
                                controls 
                                className="w-full h-10 outline-none"
                                src={result.audioUrl}
                            >
                                Your browser does not support the audio element.
                            </audio>
                        ) : (
                            <div className="flex items-center justify-center h-10 text-xs text-slate-400 bg-slate-100 rounded-lg border border-slate-200 border-dashed">
                                <AlertTriangle size={14} className="mr-2" /> קובץ השמע לא זמין (נמחק או פג תוקף)
                            </div>
                        )}
                    </div>

                    {/* Transcript */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30">
                        {result.transcript.map((seg, idx) => (
                            <div key={idx} className={`flex gap-4 ${seg.speaker === 'Agent' ? 'flex-row' : 'flex-row-reverse'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border-2 ${
                                    seg.speaker === 'Agent' 
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                                    : 'bg-white text-slate-600 border-slate-200'
                                }`}>
                                    {seg.speaker === 'Agent' ? 'AG' : 'CU'}
                                </div>
                                <div className={`flex-1 p-4 rounded-2xl text-sm leading-relaxed relative group ${
                                    seg.speaker === 'Agent' 
                                    ? 'bg-indigo-50/50 text-slate-800 rounded-tl-none' 
                                    : 'bg-white border border-slate-200 text-slate-700 rounded-tr-none shadow-sm'
                                }`}>
                                    <div className={`absolute top-2 text-[10px] font-bold opacity-50 ${seg.speaker === 'Agent' ? 'right-2' : 'left-2'}`}>
                                        {formatTime(seg.timestamp)}
                                    </div>
                                    <p>{seg.text}</p>
                                    
                                    {/* Sentiment Indicator */}
                                    {seg.sentiment !== 'neutral' && (
                                        <div className={`absolute -bottom-2 ${seg.speaker === 'Agent' ? 'left-2' : 'right-2'} text-[10px] px-1.5 py-0.5 rounded-full border bg-white flex items-center gap-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity ${
                                            seg.sentiment === 'positive' ? 'text-emerald-600 border-emerald-200' : 'text-red-500 border-red-200'
                                        }`}>
                                            {seg.sentiment === 'positive' ? <Smile size={10} /> : <AlertTriangle size={10} />}
                                            {seg.sentiment === 'positive' ? 'חיובי' : 'שלילי'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Intelligence Dashboard */}
                <div className="w-full lg:w-[40%] bg-slate-50 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* User Notes */}
                    <div className="bg-yellow-50/80 p-4 rounded-2xl border border-yellow-200 shadow-sm relative group">
                        <div className="flex items-center gap-2 mb-2">
                            <StickyNote size={16} className="text-yellow-600" />
                            <h3 className="font-bold text-yellow-800 text-sm">הערות ידניות</h3>
                        </div>
                        <textarea 
                            className="w-full bg-transparent border-none resize-none text-sm text-slate-700 focus:ring-0 p-0 leading-relaxed"
                            placeholder="כתוב כאן תובנות שלך מהשיחה..."
                            rows={3}
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            onBlur={(e) => {
                                if (state.result?.id) {
                                    updateHistoryItem(state.result.id, { userNotes: tempNotes });
                                    addToast('הערות נשמרו', 'success');
                                }
                            }}
                        />
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => {
                                e.stopPropagation();
                                if (state.result?.id) {
                                    updateHistoryItem(state.result.id, { userNotes: tempNotes });
                                    addToast('הערות נשמרו', 'success');
                                }
                            }} className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded hover:bg-yellow-300">שמור</button>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <FileText size={18} className="text-slate-400" /> תקציר מנהלים
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            {result.summary}
                        </p>
                        <div className="mt-4 flex gap-2">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border uppercase ${
                                result.intent === 'buying' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                result.intent === 'angry' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                                כוונת לקוח: {result.intent === 'buying' ? 'קנייה (חם)' : result.intent === 'angry' ? 'כועס' : 'מתעניין'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                            <MessageSquare size={18} className="text-indigo-600" />
                            <h3 className="font-bold text-indigo-900 text-sm">התנגדויות ומענה מומלץ</h3>
                        </div>
                        <div className="p-4 space-y-3">
                            {(result.objections || []).length === 0 ? (
                                <div className="text-xs font-bold text-slate-500">לא זוהו התנגדויות ברורות.</div>
                            ) : (
                                (result.objections || []).map((o, i) => (
                                    <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                        <div className="text-xs font-black text-slate-800">התנגדות</div>
                                        <div className="text-xs text-slate-700 font-bold leading-relaxed mt-1">{o?.objection}</div>

                                        <div className="text-xs font-black text-slate-800 mt-3">מענה מומלץ</div>
                                        <div className="text-xs text-slate-700 font-bold leading-relaxed mt-1">{o?.reply}</div>

                                        {o?.next_question ? (
                                            <div className="mt-3 text-xs font-bold text-slate-600">
                                                שאלה להמשך: <span className="text-slate-800">{o.next_question}</span>
                                            </div>
                                        ) : null}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* 1. Decisions & Tasks */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                            <ListChecks size={18} className="text-indigo-600" />
                            <h3 className="font-bold text-indigo-900 text-sm">סיכום אופרטיבי</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">החלטות שהתקבלו</div>
                                <ul className="space-y-2">
                                    {result.topics.decisions.map((d, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                                            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                            {d}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">משימות לביצוע</div>
                                <ul className="space-y-2">
                                    {result.topics.tasks.map((t, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-700 flex items-start gap-2">
                                            <ListTodo size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                            {isCallAnalysisTask(t) ? (
                                                <div className="flex-1">
                                                    <div className="font-bold text-slate-800">{t.title}</div>

                                                    {!t.dismissed && !t.confirmedDueAt && t.dueAtSuggestion ? (
                                                        <div className="mt-1 flex flex-col gap-2">
                                                            <div className="text-[11px] text-slate-500">
                                                                מוצע: <span className="font-bold text-slate-700">{formatDate(t.dueAtSuggestion)}</span>
                                                            </div>

                                                            {editingTaskIndex === i ? (
                                                                <div className="flex flex-col gap-2">
                                                                    <input
                                                                        type="datetime-local"
                                                                        value={editingDueAt}
                                                                        onChange={(e) => setEditingDueAt(e.target.value)}
                                                                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                                                                    />
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            type="button"
                                                                            className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-bold"
                                                                            onClick={() => {
                                                                                const d = editingDueAt ? new Date(editingDueAt) : null;
                                                                                if (!d || Number.isNaN(d.getTime())) {
                                                                                    addToast('תאריך לא תקין', 'error');
                                                                                    return;
                                                                                }
                                                                                void confirmTask(i, d.toISOString());
                                                                                setEditingTaskIndex(null);
                                                                            }}
                                                                        >
                                                                            שמור
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                                                                            onClick={() => setEditingTaskIndex(null)}
                                                                        >
                                                                            ביטול
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        type="button"
                                                                        disabled={creatingTaskIndex === i}
                                                                        className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-xs font-bold disabled:opacity-60"
                                                                        onClick={() => void confirmTask(i, String(t.dueAtSuggestion))}
                                                                    >
                                                                        קבע
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                                                                        onClick={() => {
                                                                            const suggested = t.dueAtSuggestion ? new Date(String(t.dueAtSuggestion)) : null;
                                                                            setEditingDueAt(suggested && !Number.isNaN(suggested.getTime()) ? toLocalDateTimeInputValue(suggested) : '');
                                                                            setEditingTaskIndex(i);
                                                                        }}
                                                                    >
                                                                        ערוך
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-bold"
                                                                        onClick={() => updateTaskAtIndex(i, { dismissed: true })}
                                                                    >
                                                                        דחה
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}

                                                    {t.confirmedDueAt ? (
                                                        <div className="mt-1 text-[11px] text-emerald-700 font-bold">נקבע: {formatDate(t.confirmedDueAt)}</div>
                                                    ) : null}
                                                </div>
                                            ) : (
                                                <span>{String(t)}</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* 2. Promises (Risk Management) */}
                    <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-red-100 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-500" />
                            <h3 className="font-bold text-red-900 text-sm">הבטחות שניתנו (שים לב!)</h3>
                        </div>
                        <div className="p-4">
                            <ul className="space-y-2">
                                {result.topics.promises.map((p, i) => (
                                    <li key={i} className="text-xs font-bold text-red-800 flex items-start gap-2 bg-white/50 p-2 rounded-lg">
                                        <Target size={14} className="text-red-400 shrink-0 mt-0.5" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">משוב המאמן האוטומטי</h3>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 mb-2">
                                    <ThumbsUp size={14} /> שימור
                                </div>
                                <ul className="space-y-1 pl-6 list-disc text-xs text-slate-600">
                                    {result.feedback.positive.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-amber-600 mb-2">
                                    <ThumbsDown size={14} /> שיפור
                                </div>
                                <ul className="space-y-1 pl-6 list-disc text-xs text-slate-600">
                                    {result.feedback.improvements.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default CallAnalyzerView;