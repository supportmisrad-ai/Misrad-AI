
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { BrainCircuit, Send, Download, Save, History, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, User, Zap, Activity, ThumbsDown, MessageSquare, ArrowRight, Target, Lock, Crown, BarChart3, Edit3, Clock, Briefcase, Search, FileText, Database, Compass, ExternalLink, Trash2, Copy, Eraser } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisReport, Priority } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';

export const IntelligenceView: React.FC = () => {
    const { tasks, users, leads, clients, assets, monthlyGoals, timeEntries, analysisHistory, saveAnalysis, deleteAnalysis, addToast, currentUser, updateMonthlyGoals, updateUser, hasPermission, addFeedback } = useData();
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState<AnalysisReport | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    
    // Modal for Goal Setting
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [tempGoals, setTempGoals] = useState(monthlyGoals);
    const [tempPersonalGoal, setTempPersonalGoal] = useState(0);

    // Determine Mode via Permission: If user can manage team/financials, they get Manager view. Else, Employee view.
    // SECURITY: This strictly controls what data is fed to the AI.
    const isManager = hasPermission('manage_team') || hasPermission('view_financials');

    // Auto-run from Command Palette
    useEffect(() => {
        if (location.state?.initialQuery) {
            const incomingQuery = location.state.initialQuery;
            setQuery(incomingQuery);
            
            // Trigger analysis with the incoming query immediately
            // We pass the query directly to avoid waiting for state update
            handleAnalyze(incomingQuery);
            
            // Clear state so it doesn't re-run on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    // AI Processing Logic
    const handleAnalyze = async (overrideQuery?: string) => {
        const activeQuery = overrideQuery || query;
        
        if (!process.env.API_KEY) {
            addToast('חסר מפתח API', 'error');
            return;
        }
        setIsAnalyzing(true);
        setReport(null);

        try {
            // 1. Prepare Context Data based on Role (SECURITY ENFORCED HERE)
            const contextData: any = {
                userRole: currentUser.role,
                isManager: isManager,
                currentDate: new Date().toLocaleDateString('he-IL'),
            };

            // Knowledge Base Injection (For Search Capabilities)
            // We map essential fields to save token space but give AI context
            contextData.knowledgeBase = {
                // Everyone sees assets metadata (assumed public in org, but URLs hidden if needed)
                assets: assets.map(a => ({ title: a.title, type: a.type, tag: a.tags.join(', ') })),
                // Only share client names if CRM permission exists
                clients: hasPermission('view_crm') ? clients.map(c => ({ name: c.companyName, status: c.status })) : [],
                // Users see their tasks, Managers see structure
                tasksStructure: tasks.slice(0, 50).map(t => ({ 
                    title: t.title, 
                    status: t.status, 
                    // Only reveal assignee name if manager or self
                    assignee: isManager || t.assigneeIds?.includes(currentUser.id) ? (users.find(u => t.assigneeIds?.includes(u.id))?.name || 'Unassigned') : 'Hidden'
                }))
            };

            if (isManager) {
                // Manager Context: Full Vision (Financials, Team Loads)
                contextData.goals = monthlyGoals;
                contextData.team = users.map(u => ({ 
                    id: u.id, name: u.name, role: u.role, capacity: u.capacity, targets: u.targets,
                    activeTasks: tasks.filter(t => t.assigneeIds?.includes(u.id) && t.status !== 'Done').length
                }));
                contextData.tasksSummary = {
                    total: tasks.length,
                    completed: tasks.filter(t => t.status === 'Done').length,
                    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done').length,
                    urgent: tasks.filter(t => t.priority === Priority.URGENT).length
                };
                contextData.revenue = {
                    current: leads.filter(l => l.status === 'Won').reduce((acc, l) => acc + l.value, 0),
                    target: monthlyGoals.revenue
                };
            } else {
                // Employee Context: Self Only (No financials, no other employees' data)
                const myTasks = tasks.filter(t => t.assigneeIds?.includes(currentUser.id));
                contextData.personalStats = {
                    name: currentUser.name,
                    completedTasks: myTasks.filter(t => t.status === 'Done').length,
                    pendingTasks: myTasks.filter(t => t.status !== 'Done').length,
                    targets: currentUser.targets,
                    activeProjects: [...new Set(myTasks.map(t => t.tags[0]))].filter(Boolean)
                };
                contextData.myWorkHours = timeEntries.filter(t => t.userId === currentUser.id).slice(0, 5); // Last 5 shifts
            }

            contextData.userQuery = activeQuery || (isManager ? "תן לי תמונת מצב ניהולית מלאה" : "איך אני יכול להשתפר היום?");

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Schema Definition
            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING, description: "סיכום ישיר ובוטה של המצב, או התשובה הישירה לחיפוש (אם נשאל)." },
                    score: { type: Type.NUMBER, description: "ציון בריאות מערכת או יעילות אישית (0-100)" },
                    actionableSteps: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "רשימת פעולות לביצוע (3-5 נקודות)"
                    },
                    suggestedLinks: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                label: { type: Type.STRING, description: "Button label" },
                                path: { type: Type.STRING, description: "Internal app path (e.g., /assets, /tasks, /reports)" }
                            }
                        },
                        description: "Optional: Suggest navigation paths based on the answer. E.g. if user asks for logo, link to /assets."
                    }
                },
                required: ['summary', 'score', 'actionableSteps']
            };

            // Extend Schema based on Role
            if (isManager) {
                // @ts-ignore
                responseSchema.properties.employees = {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            name: { type: Type.STRING },
                            efficiency: { type: Type.NUMBER },
                            workload: { type: Type.STRING, enum: ['Low', 'Optimal', 'High', 'Overload'] },
                            suggestion: { type: Type.STRING, description: "הצעה לשיפור בעברית" },
                            outputTrend: { type: Type.STRING, enum: ['up', 'down', 'stable'] }
                        }
                    }
                };
                // @ts-ignore
                responseSchema.properties.revenueInsight = { type: Type.STRING, description: "תובנה פיננסית בעברית" };
            } else {
                // @ts-ignore
                responseSchema.properties.personalTasksAnalysis = {
                    type: Type.OBJECT,
                    properties: {
                        completedCount: { type: Type.NUMBER },
                        avgCompletionTime: { type: Type.STRING, description: "זמן ממוצע משוער" },
                        focusArea: { type: Type.STRING, description: "איפה לשים דגש היום" }
                    }
                };
            }

            const prompt = `You are 'Nexus Brain', an advanced AI for business intelligence AND knowledge retrieval.
                   
                   DATA: You have access to 'knowledgeBase' (assets, clients, tasks) and 'stats'.
                   
                   MODE 1 - SEARCH/RETRIEVAL:
                   If the user asks "Where is...", "Do we have...", "Find...", or "What is the status of...":
                   - Search the 'knowledgeBase'.
                   - Answer directly in the 'summary' field (e.g., "Found the logo in Assets.", "Client X is active.").
                   - Set 'suggestedLinks' to the relevant page (e.g., /assets for files, /clients for clients, /tasks for tasks).
                   - If found, set score to 100.

                   MODE 2 - ANALYSIS:
                   If the user asks about performance, advice, or general status:
                   - Analyze the stats.
                   - Be blunt, direct, and strategic.
                   - Output strictly in HEBREW.
                   
                   CURRENT USER ROLE: ${currentUser.role}.
                   Note: The user cannot access data outside their permissions. The provided data is already filtered. Do not hallucinate data not present.
                   `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: {
                    parts: [
                        { text: JSON.stringify(contextData) },
                        { text: prompt }
                    ]
                },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema
                }
            });

            if (response.text) {
                const data = JSON.parse(response.text);
                const newReport: AnalysisReport = {
                    id: `REP-${Date.now()}`,
                    date: new Date().toISOString(),
                    query: activeQuery || (isManager ? "ניתוח מערכת כללי" : "ניתוח ביצועים אישי"),
                    mode: isManager ? 'manager' : 'employee',
                    ...data
                };
                setReport(newReport);
                saveAnalysis(newReport); 
            }

        } catch (error) {
            console.error(error);
            addToast('הניתוח נכשל. נסה שנית.', 'error');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDownload = () => {
        if (!report) return;
        const element = document.createElement("a");
        const file = new Blob([JSON.stringify(report, null, 2)], {type: 'text/plain'});
        element.href = URL.createObjectURL(file);
        element.download = `Nexus_Report_${new Date().toISOString()}.json`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
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
            analysisHistory.forEach(item => deleteAnalysis(item.id));
            setReport(null);
            addToast('ההיסטוריה נוקתה בהצלחה', 'info');
        }
    };

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
                <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-indigo-400" /> Nexus AI</h2>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            {isManager ? <Crown size={10} className="text-yellow-500" /> : <User size={10} className="text-blue-400" />}
                            מנוע חיפוש וביצועים
                        </p>
                    </div>
                    {analysisHistory.length > 0 && (
                        <button 
                            onClick={handleClearHistory}
                            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-slate-800"
                            title="נקה היסטוריה"
                        >
                            <Eraser size={16} />
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">היסטוריית שאילתות</span>
                        <span className="text-[9px] text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">30 יום</span>
                    </div>
                    {analysisHistory.filter(r => r.mode === (isManager ? 'manager' : 'employee')).map((item) => (
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
                <div className="p-6 border-b border-slate-800 bg-slate-900/30 backdrop-blur-md">
                    <div className="max-w-3xl mx-auto w-full relative">
                        <input 
                            type="text" 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="חפש מידע (איפה הקובץ...) או נתח ביצועים..."
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pr-6 pl-14 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-lg"
                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        />
                        <button 
                            onClick={() => handleAnalyze()}
                            disabled={isAnalyzing}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:brightness-110 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                        >
                            {isAnalyzing ? <Sparkles className="animate-spin" size={20} /> : <Send size={20} className="rotate-180" />}
                        </button>
                    </div>
                    {/* Quick Prompts */}
                    <div className="max-w-3xl mx-auto mt-3 flex gap-2 overflow-x-auto no-scrollbar">
                        {(isManager ? 
                            ['איפה נמצא קובץ ה-Logo?', 'האם יש לנו ליד מגוגל?', 'ניתוח יעילות צוות', 'תחזית הכנסות'] : 
                            ['איפה נמצא נהלי העבודה?', 'מה המשימות הפתוחות שלי?', 'איך לשפר ביצועים?', 'תכנון שבועי']
                        ).map(p => (
                            <button key={p} onClick={() => { setQuery(p); handleAnalyze(p); }} className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5">
                                {p.includes('?') || p.includes('איפה') || p.includes('יש לנו') ? <Search size={12} className="text-indigo-400" /> : <BarChart3 size={12} className="text-purple-400" />}
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Report Area */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth custom-scrollbar">
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
                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                <div className="flex-1">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 mb-3">
                                        <Sparkles size={12} /> תשובת המערכת
                                    </div>
                                    <h1 className="text-3xl font-bold text-white mb-4">
                                        תוצאות הניתוח
                                    </h1>
                                    <p className="text-lg text-slate-300 leading-relaxed border-r-4 border-indigo-500 pr-4">
                                        {report.summary}
                                    </p>
                                    
                                    {/* Smart Navigation Buttons */}
                                    {report.suggestedLinks && report.suggestedLinks.length > 0 && (
                                        <div className="flex flex-wrap gap-3 mt-6">
                                            {report.suggestedLinks.map((link, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => navigate(link.path)}
                                                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-900 to-indigo-900 hover:from-violet-800 hover:to-indigo-800 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/30 border border-white/10 group"
                                                >
                                                    <ExternalLink size={16} className="text-indigo-300 group-hover:text-white transition-colors" />
                                                    {link.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 text-center min-w-[150px]">
                                    <div className="text-xs font-bold text-slate-400 uppercase mb-2">רלוונטיות</div>
                                    <div className={`text-5xl font-black ${report.score > 80 ? 'text-green-400' : report.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {report.score}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">/ 100</div>
                                </div>
                            </div>

                            {/* Actionable Steps */}
                            <div className="bg-slate-800/30 border border-slate-700 rounded-2xl p-6">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2"><Zap size={20} className="text-yellow-400" /> המלצות לפעולה</h3>
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
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                                <button onClick={handleDownload} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                    <Download size={16} /> הורד דוח מלא
                                </button>
                                <button 
                                    onClick={handleCopySummary}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    <Copy size={16} /> העתק
                                </button>
                                <button 
                                    onClick={handleSaveFeedback}
                                    className="px-4 py-2 bg-gradient-to-r from-violet-900 to-indigo-900 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg border border-white/10 hover:brightness-110"
                                >
                                    <MessageSquare size={16} /> שמור כמשוב
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
                                שאל על נתונים, חפש קבצים וקבל תובנות אסטרטגיות במקום אחד.
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
