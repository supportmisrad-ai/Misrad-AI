
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { BrainCircuit, Send, Download, Save, History, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, User, Zap, Activity, ThumbsDown, MessageSquare, ArrowRight, Target, Lock, Crown, BarChart3, Edit3, Clock, Briefcase, Search, FileText, Database, Compass, ExternalLink, Trash2, Copy, Eraser, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalysisReport, Priority } from '../types';
import { useSearchParams } from 'next/navigation';
import { useNexusNavigation } from '@/lib/os/nexus-routing';

export const IntelligenceView: React.FC = () => {
    const { tasks, leads, clients, assets, monthlyGoals, timeEntries, analysisHistory, saveAnalysis, deleteAnalysis, addToast, currentUser, updateMonthlyGoals, updateUser, hasPermission, addFeedback } = useData();
    const { analyzeWithAI, isLoading: isAnalyzing } = useSecureAPI();
    const searchParams = useSearchParams();
    const { navigate } = useNexusNavigation();
    const [query, setQuery] = useState('');
    const [report, setReport] = useState<AnalysisReport | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    
    // Modal for Goal Setting
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [tempGoals, setTempGoals] = useState(monthlyGoals);
    const [tempPersonalGoal, setTempPersonalGoal] = useState(0);

    // Determine Mode via Permission: If user can manage team/financials, they get Manager view. Else, Employee view.
    // SECURITY: Server-side will enforce this, but we check here for UI purposes
    const isManager = hasPermission('manage_team') || hasPermission('view_financials');

    // Auto-run from Command Palette
    useEffect(() => {
        const incomingQuery = searchParams?.get('q');
        if (incomingQuery) {
            setQuery(incomingQuery);
            
            // Trigger analysis with the incoming query immediately
            // We pass the query directly to avoid waiting for state update
            handleAnalyze(incomingQuery);
        }
    }, [searchParams]);

    // AI Processing Logic - Now using secure API
    const handleAnalyze = async (overrideQuery?: string) => {
        const activeQuery = overrideQuery || query;
        
        if (!activeQuery.trim()) {
            addToast('נא להזין שאילתה', 'error');
            return;
        }
        
        setReport(null);

        try {
            // Prepare raw data for server-side filtering
            // Server will filter based on actual permissions
            const rawData = {
                tasks: tasks.map((t: any) => ({
                    id: t.id,
                    title: t.title,
                    status: t.status,
                    priority: t.priority,
                    assigneeIds: t.assigneeIds,
                    dueDate: t.dueDate,
                    tags: t.tags
                })),
                clients: clients.map((c: any) => ({
                    id: c.id,
                    companyName: c.companyName,
                    status: c.status
                })),
                assets: assets.map((a: any) => ({
                    id: a.id,
                    title: a.title,
                    type: a.type,
                    tags: a.tags
                })),
                financials: isManager ? {
                    monthlyGoals,
                    revenue: leads.filter((l: any) => l.status === 'Won').reduce((acc: number, l: any) => acc + l.value, 0),
                    target: monthlyGoals.revenue
                } : undefined,
                timeEntries: timeEntries.filter((t: any) => t.userId === currentUser.id).slice(0, 5)
            };

            // Call secure API - server will filter data based on permissions
            const data = await analyzeWithAI(activeQuery, rawData);
            
            // Validate response structure
            if (!data || typeof data !== 'object') {
                throw new Error('תגובה לא תקינה מהשרת');
            }
            
            if (!data.summary || typeof data.summary !== 'string') {
                throw new Error('תגובת השרת חסרה סיכום');
            }
            
            // Create report from API response
            const newReport: AnalysisReport = {
                id: `REP-${Date.now()}`,
                date: new Date().toISOString(),
                query: activeQuery || (isManager ? "ניתוח מערכת כללי" : "ניתוח ביצועים אישי"),
                mode: isManager ? 'manager' : 'employee',
                summary: data.summary || 'לא התקבל סיכום',
                score: typeof data.score === 'number' ? data.score : 0,
                actionableSteps: Array.isArray(data.actionableSteps) ? data.actionableSteps : [],
                suggestedLinks: Array.isArray(data.suggestedLinks) ? data.suggestedLinks : [],
                employees: Array.isArray(data.employees) ? data.employees : undefined,
                revenueInsight: data.revenueInsight || undefined,
                personalTasksAnalysis: data.personalTasksAnalysis || undefined
            };
            
            setReport(newReport);
            saveAnalysis(newReport);
            addToast('ניתוח הושלם בהצלחה', 'success');

        } catch (error: any) {
            console.error('Analysis error:', error);
            const errorMessage = error?.message || 'הניתוח נכשל. נסה שנית.';
            addToast(errorMessage, 'error');
            // Reset report on error
            setReport(null);
        }
    };

    const handleDownload = () => {
        if (!report) return;
        if (typeof document === 'undefined') return; // SSR guard
        
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(report, null, 2)], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `Nexus_Report_${new Date().toISOString()}.json`;
        document.body.appendChild(element);
        element.click();
        element.remove();
        URL.revokeObjectURL(element.href);
    };

    const handleCopySummary = () => {
        if (!report) return;
        navigator.clipboard.writeText(report.summary);
        addToast('הסיכום הועתק ללוח', 'success');
    };

    const handleSaveFeedback = () => {
        if (!report) return;
        
        // Save to real feedback store
        addFeedback({
            userId: currentUser.id,
            userName: currentUser.name,
            query: report.query,
            aiResponseSummary: report.summary
        });

        addToast('המשוב נשמר ומופיע בלוח הבקרה', 'success');
    };

    const handleSaveGoalChanges = () => {
        if (isManager) {
            updateMonthlyGoals(tempGoals);
        } else {
            updateUser(currentUser.id, {
                targets: { 
                    ...currentUser.targets,
                    tasksMonth: tempPersonalGoal
                }
            });
        }
        setIsGoalModalOpen(false);
    };

    const handleDeleteHistoryItem = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        deleteAnalysis(id);
        if (report?.id === id) setReport(null);
    };

    const handleClearHistory = () => {
        if (window.confirm('האם למחוק את כל היסטוריית החיפושים?')) {
            analysisHistory.forEach((item: any) => deleteAnalysis(item.id));
            setReport(null);
            addToast('ההיסטוריה נוקתה בהצלחה', 'info');
        }
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    return (
        <div className="h-full flex flex-col md:flex-row bg-[#0f172a] text-slate-100 overflow-hidden rounded-3xl shadow-2xl border border-slate-800 relative font-sans" dir="rtl">
            
            {/* Goal Setting Modal */}
            <AnimatePresence>
                {isGoalModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsGoalModalOpen(false)}></div>
                        <motion.div initial={{scale: 0.9, opacity: 0}} animate={{scale: 1, opacity: 1}} exit={{scale: 0.9, opacity: 0}} className="bg-slate-800 border border-slate-700 p-6 rounded-2xl w-full max-w-md relative z-10 shadow-2xl">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Target className="text-indigo-400" /> הגדרת יעדים</h3>
                            {isManager ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">יעד הכנסות חודשי (₪)</label>
                                        <input type="number" value={tempGoals.revenue} onChange={(e) => setTempGoals({...tempGoals, revenue: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">יעד סיום משימות (כמות)</label>
                                        <input type="number" value={tempGoals.tasksCompletion} onChange={(e) => setTempGoals({...tempGoals, tasksCompletion: Number(e.target.value)})} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1">יעד משימות אישי לחודש</label>
                                    <input type="number" value={tempPersonalGoal} onChange={(e) => setTempPersonalGoal(Number(e.target.value))} className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2 text-white" placeholder={currentUser.targets?.tasksMonth.toString()} />
                                </div>
                            )}
                            <div className="mt-6 flex justify-end gap-2">
                                <button onClick={() => setIsGoalModalOpen(false)} className="px-4 py-2 text-slate-400 hover:text-white">ביטול</button>
                                <button onClick={handleSaveGoalChanges} className="px-4 py-2 bg-gradient-to-r from-violet-900 to-indigo-900 text-white rounded-lg font-bold border border-white/10 hover:brightness-110">שמור יעדים</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Sidebar / History */}
            <div className={`w-full md:w-80 bg-slate-900/50 border-l border-slate-800 flex flex-col z-10 transition-all ${showHistory ? 'translate-x-0' : 'hidden md:flex'}`}>
                {/* Mobile Toggle Button */}
                {isMobile && !showHistory && (
                    <button
                        onClick={() => setShowHistory(true)}
                        className="md:hidden fixed bottom-4 left-4 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                        aria-label="פתח היסטוריה"
                    >
                        <History size={20} />
                    </button>
                )}
                <div className="p-4 md:p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg md:text-xl font-bold flex items-center gap-2"><Sparkles className="text-indigo-400" size={18} /> Nexus AI</h2>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            {isManager ? <Crown size={10} className="text-yellow-500" /> : <User size={10} className="text-blue-400" />}
                            מנוע חיפוש וביצועים
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {analysisHistory.length > 0 && (
                            <button 
                                onClick={handleClearHistory}
                                className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                                title="נקה היסטוריה"
                            >
                                <Eraser size={16} />
                            </button>
                        )}
                        {isMobile && (
                            <button
                                onClick={() => setShowHistory(false)}
                                className="md:hidden p-2 text-slate-500 hover:text-white transition-colors rounded-lg"
                                aria-label="סגור היסטוריה"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 pb-4 md:pb-4 space-y-3 custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">היסטוריית שאילתות</span>
                        <span className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">30 יום</span>
                    </div>
                    {analysisHistory
                        .filter((r: any) => r.mode === (isManager ? 'manager' : 'employee'))
                        .map((item: any) => (
                        <div 
                            key={item.id} 
                            onClick={() => setReport(item)}
                            className={`w-full p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group relative ${report?.id === item.id ? 'bg-indigo-900/30 border-indigo-500/50 text-white' : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                            <span className="font-bold text-sm truncate pr-6">{item.query}</span>
                            <span className="text-[10px] opacity-60">{new Date(item.date).toLocaleDateString('he-IL')}</span>
                            
                            <button 
                                onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                                className="absolute top-2 left-2 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="מחק מההיסטוריה"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {analysisHistory.length === 0 && <div className="text-slate-600 text-sm text-center py-4">אין היסטוריה זמינה.</div>}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
                
                {/* Input Area */}
                <div className="p-4 md:p-6 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md">
                    <div className="max-w-3xl mx-auto w-full relative">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="חפש מידע או נתח ביצועים..."
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-3 md:py-4 pr-4 md:pr-6 pl-12 md:pl-14 text-sm md:text-base text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-lg"
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                        <button 
                            onClick={() => handleAnalyze()}
                            disabled={isAnalyzing}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 md:p-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isAnalyzing ? <Sparkles className="animate-spin" size={18} /> : <Send size={18} className="rotate-180" />}
                        </button>
                    </div>
                    {/* Quick Prompts */}
                    <div className="max-w-3xl mx-auto mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-2">
                        {(isManager ? 
                            ['איפה נמצא קובץ ה-Logo?', 'האם יש לנו ליד מגוגל?', 'ניתוח יעילות צוות', 'תחזית הכנסות'] : 
                            ['איפה נמצא נהלי העבודה?', 'מה המשימות הפתוחות שלי?', 'איך לשפר ביצועים?', 'תכנון שבועי']
                        ).map(p => (
                            <button key={p} onClick={() => { setQuery(p); handleAnalyze(p); }} className="whitespace-nowrap px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[10px] md:text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1 md:gap-1.5 shrink-0">
                                {p.includes('?') || p.includes('איפה') || p.includes('יש לנו') ? <Search size={10} className="text-indigo-400 shrink-0" /> : <BarChart3 size={10} className="text-purple-400 shrink-0" />}
                                <span className="truncate max-w-[120px] md:max-w-none">{p}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Report Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-10 pb-4 md:pb-6 lg:pb-10 scroll-smooth custom-scrollbar">
                    {isAnalyzing ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-70">
                            <div className="w-24 h-24 relative mb-8">
                                <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-ping"></div>
                                <div className="absolute inset-2 border-4 border-purple-500/50 rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <BrainCircuit size={32} className="text-indigo-400" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Nexus סורק את המערכת...</h3>
                            <p className="text-slate-400">מחפש בקבצים, משימות ונתונים פיננסיים.</p>
                        </div>
                    ) : report ? (
                        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* Header & Score */}
                            <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
                                <div className="flex-1 min-w-0">
                                    <div className="inline-flex items-center gap-2 px-2.5 md:px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] md:text-xs font-bold border border-indigo-500/30 mb-3">
                                        <Sparkles size={10} /> תשובת המערכת
                                    </div>
                                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">
                                        תוצאות הניתוח
                                    </h1>
                                    <p className="text-base md:text-lg text-slate-300 leading-relaxed border-r-4 border-indigo-500 pr-3 md:pr-4">
                                        {report.summary}
                                    </p>
                                    
                                    {/* Smart Navigation Buttons */}
                                    {report.suggestedLinks && report.suggestedLinks.length > 0 && (
                                        <div className="flex flex-wrap gap-2 md:gap-3 mt-4 md:mt-6">
                                            {report.suggestedLinks.map((link, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => navigate(link.path)}
                                                    className="flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-gradient-to-r from-violet-900 to-indigo-900 hover:from-violet-800 hover:to-indigo-800 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg shadow-indigo-900/30 border border-white/10 group"
                                                >
                                                    <ExternalLink size={14} className="text-indigo-300 group-hover:text-white transition-colors shrink-0" />
                                                    <span className="truncate">{link.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-700 text-center w-full md:w-auto md:min-w-[150px]">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">רלוונטיות</div>
                                    <div className={`text-4xl md:text-5xl font-black ${report.score > 80 ? 'text-green-400' : report.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {report.score}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">/ 100</div>
                                </div>
                            </div>

                            {/* Actionable Steps */}
                            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-4 md:p-6">
                                <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-400" /> המלצות לפעולה</h3>
                                <ul className="space-y-3">
                                    {report.actionableSteps.map((step, idx) => (
                                        <li key={idx} className="flex items-start gap-3 text-slate-300">
                                            <div className="mt-1 bg-slate-700 text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                                            <span>{step}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-6 pt-4 border-t border-slate-700/50 flex justify-end">
                                    <button 
                                        onClick={() => {
                                            setTempPersonalGoal(currentUser.targets?.tasksMonth || 0);
                                            setIsGoalModalOpen(true);
                                        }}
                                        className="text-sm bg-gradient-to-r from-violet-900 to-indigo-900 border border-white/10 hover:brightness-110 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-all shadow-md"
                                    >
                                        <Edit3 size={16} /> עדכן יעדים
                                    </button>
                                </div>
                            </div>

                            {/* MANAGER ONLY SECTION */}
                            {isManager && report.employees && (
                                <div className="bg-slate-800/40 rounded-2xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                                        <h3 className="font-bold text-white flex items-center gap-2"><User size={18} /> ניתוח כוח אדם</h3>
                                        <span className="text-xs bg-red-500/20 text-red-300 px-2 py-1 rounded border border-red-500/30">מבט מנהל בלבד</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead className="bg-slate-900/50 text-slate-400 font-medium">
                                                <tr>
                                                    <th className="px-6 py-3">עובד</th>
                                                    <th className="px-6 py-3">יעילות</th>
                                                    <th className="px-6 py-3">עומס</th>
                                                    <th className="px-6 py-3">המלצת ה-AI</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-700/50 text-slate-200">
                                                {report.employees.map(emp => (
                                                    <tr key={emp.id} className="hover:bg-slate-700/30 transition-colors">
                                                        <td className="px-6 py-4 font-bold">{emp.name}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-mono w-8">{emp.efficiency}%</span>
                                                                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className={`h-full rounded-full ${emp.efficiency > 80 ? 'bg-green-500' : emp.efficiency > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${emp.efficiency}%`}}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                                                emp.workload === 'Overload' ? 'bg-red-500/20 text-red-300' :
                                                                emp.workload === 'High' ? 'bg-orange-500/20 text-orange-300' :
                                                                emp.workload === 'Optimal' ? 'bg-green-500/20 text-green-300' :
                                                                'bg-slate-700 text-slate-400'
                                                            }`}>
                                                                {emp.workload === 'Overload' ? 'עומס יתר' : 
                                                                 emp.workload === 'High' ? 'גבוה' : 
                                                                 emp.workload === 'Optimal' ? 'אופטימלי' : 'נמוך'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-xs text-slate-400 italic">
                                                            "{emp.suggestion}"
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* EMPLOYEE ONLY SECTION */}
                            {!isManager && report.personalTasksAnalysis && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2"><Target size={16} /> המיקוד היומי שלך</h4>
                                        <p className="text-lg font-bold text-white">{report.personalTasksAnalysis.focusArea}</p>
                                    </div>
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700">
                                        <h4 className="text-sm font-bold text-slate-400 mb-2 flex items-center gap-2"><Clock size={16} /> קצב עבודה</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-white">{report.personalTasksAnalysis.avgCompletionTime}</span>
                                            <span className="text-xs text-slate-500">(זמן ממוצע למשימה)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions Footer */}
                            <div className="flex flex-wrap justify-end gap-2 md:gap-3 pt-4 border-t border-slate-800">
                                <button onClick={handleDownload} className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-colors">
                                    <Download size={14} /> <span className="hidden sm:inline">הורד דוח מלא</span><span className="sm:hidden">הורד</span>
                                </button>
                                <button 
                                    onClick={handleCopySummary}
                                    className="px-3 md:px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-colors"
                                >
                                    <Copy size={14} /> העתק
                                </button>
                                <button 
                                    onClick={handleSaveFeedback}
                                    className="px-3 md:px-4 py-2 bg-gradient-to-r from-violet-900 to-indigo-900 text-white rounded-lg text-xs md:text-sm font-bold flex items-center gap-1.5 md:gap-2 transition-colors shadow-lg border border-white/10 hover:brightness-110"
                                >
                                    <MessageSquare size={14} /> <span className="hidden sm:inline">שמור כמשוב</span><span className="sm:hidden">שמור</span>
                                </button>
                            </div>

                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
                            {isManager ? <Crown size={64} className="mb-4 text-yellow-500" /> : <User size={64} className="mb-4 text-blue-400" />}
                            <h3 className="text-xl font-bold">
                                {isManager ? "המוח והחיפוש של Nexus" : "אזור אישי וחיפוש"}
                            </h3>
                            <p className="text-sm mt-2 max-w-sm">
                                שאל על נתונים, חפש קבצים וקבל תובנות עסקיות במקום אחד.
                            </p>
                            <div className="flex gap-4 mt-6 text-slate-500 text-xs">
                                <div className="flex flex-col items-center gap-1">
                                    <Search size={20} />
                                    <span>חיפוש חכם</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <FileText size={20} />
                                    <span>איתור מסמכים</span>
                                </div>
                                <div className="flex flex-col items-center gap-1">
                                    <Database size={20} />
                                    <span>שאילתות דאטה</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
