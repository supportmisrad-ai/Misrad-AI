'use client';

import React, { useRef, useState, useEffect } from 'react';
import { 
    UploadCloud, FileAudio, X, BrainCircuit, Activity, 
    MessageSquare, CheckCircle, AlertTriangle, Target, 
    ListTodo, ThumbsUp, ThumbsDown, MessageCircle, 
    Play, Pause, Mic, User, Fingerprint, Clock, FileText,
    ListChecks, Heart, Smile, History, Trash2, ArrowRight,
    Edit2, Link as LinkIcon, StickyNote
} from 'lucide-react';
import { useCallAnalysis } from './contexts/CallAnalysisContext';
import { useToast } from './contexts/ToastContext';
import { Lead } from './types';

interface CallAnalyzerViewProps {
    leads?: Lead[];
}

const CallAnalyzerView: React.FC<CallAnalyzerViewProps> = ({ leads = [] }) => {
    const { state, history, startAnalysis, cancelAnalysis, resetAnalysis, loadFromHistory, deleteFromHistory, updateHistoryItem } = useCallAnalysis();
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    // Editing States
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [tempTitle, setTempTitle] = useState('');
    const [tempNotes, setTempNotes] = useState('');

    // Sync state when result changes
    useEffect(() => {
        if (state.result) {
            setTempTitle(state.result.title || state.result.fileName || 'שיחה ללא שם');
            setTempNotes(state.result.userNotes || '');
        }
    }, [state.result]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            startAnalysis(file);
            addToast('הקובץ עלה לעיבוד ברקע. אפשר להמשיך לגלוש במערכת.', 'info');
        }
    };

    const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('האם למחוק את הניתוח לצמיתות?')) {
            deleteFromHistory(id);
            addToast('הניתוח נמחק מההיסטוריה', 'success');
        }
    };

    const handleSaveTitle = () => {
        if (state.result?.id) {
            updateHistoryItem(state.result.id, { title: tempTitle });
            setIsEditingTitle(false);
            addToast('כותרת עודכנה', 'success');
        }
    };

    const handleSaveNotes = () => {
        if (state.result?.id) {
            updateHistoryItem(state.result.id, { userNotes: tempNotes });
            addToast('הערות נשמרו', 'success');
        }
    };

    const handleLinkLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        if (state.result?.id) {
            updateHistoryItem(state.result.id, { leadId });
            const leadName = leads.find(l => l.id === leadId)?.name;
            if (leadName) addToast(`השיחה שויכה ל-${leadName}`, 'success');
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

    // --- RENDER STATES ---

    // 1. Upload State + History
    if (!state.isProcessing && !state.result) {
        return (
            <div className="h-full flex flex-col p-4 md:p-8 animate-fade-in gap-8 overflow-y-auto custom-scrollbar">
                
                {/* Upload Zone */}
                <div className="flex flex-col items-center justify-center">
                    <div 
                        className="w-full max-w-2xl bg-white border-2 border-dashed border-slate-300 rounded-3xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileSelect} 
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
                                            onClick={(e) => handleDeleteHistory(e, item.id || '')}
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
                <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl p-8 border border-slate-200 text-center relative overflow-hidden">
                    {/* Background Pulse */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-100">
                        <div className="h-full bg-indigo-600 animate-progress-indeterminate"></div>
                    </div>

                    <div className="w-20 h-20 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
                        <BrainCircuit className="absolute inset-0 m-auto text-indigo-600 animate-pulse" size={32} />
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
                        💡 <strong>טיפ:</strong> זה יכול לקחת כמה דקות. אתם יכולים להמשיך לסייר במערכת, אנחנו נודיע לכם כשזה מוכן.
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
                                    onChange={handleLinkLead}
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
                            onBlur={handleSaveNotes}
                        />
                        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={handleSaveNotes} className="bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-1 rounded hover:bg-yellow-300">שמור</button>
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
                                            {t}
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