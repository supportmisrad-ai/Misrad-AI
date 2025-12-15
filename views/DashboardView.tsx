
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, Users, Target, ArrowRight, Zap, Trophy, ExternalLink, Edit2, X, Check, DollarSign, ArrowUpRight, ArrowDownRight, RefreshCw, BarChart2, Star, ThumbsUp, Sun, Compass, User, CheckSquare, Sparkles, ChevronRight, Flame, Rocket } from 'lucide-react';
import { Status, Priority, LeadStatus } from '../types';
import { TaskCard } from '../components/TaskCard';
import { HoldButton } from '../components/HoldButton';
import { useNavigate } from 'react-router-dom';

const TrendChart = ({ data, color }: { data: number[], color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const height = 60;
    
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = height - ((val - min) / (max - min || 1)) * height;
        return `${x},${y}`;
    }).join(' ');

    return (
        <div className="relative h-20 w-full overflow-hidden">
            <svg viewBox={`0 0 100 ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <path d={`M0,${height} ${points} 100,${height}`} fill={`url(#gradient-${color})`} className="opacity-30" />
                <path d={`M${points.replace(/ /g, ' L')}`} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" className={color} strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.6" className={color} />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0" className={color} />
                    </linearGradient>
                </defs>
            </svg>
        </div>
    );
};

export const DashboardView: React.FC = () => {
    const { currentUser, activeShift, clockIn, clockOut, tasks, leads, clients, products, users, monthlyGoals, updateMonthlyGoals, hasPermission, setShowMorningBrief, openTask, analysisHistory, openCreateTask, organization } = useData();
    const navigate = useNavigate();
    const [elapsed, setElapsed] = useState('00:00:00');
    const [isEditingGoals, setIsEditingGoals] = useState(false);
    const [tempGoals, setTempGoals] = useState(monthlyGoals);
    
    // Onboarding State
    const [showOnboarding, setShowOnboarding] = useState(true);

    // Dynamic Onboarding Checks
    const onboardingSteps = [
        { 
            id: 1, 
            label: 'השלמת פרופיל', 
            subLabel: 'הוסף טלפון ופרטים',
            done: !!currentUser.phone && currentUser.phone.length > 0, 
            icon: User,
            action: () => navigate('/me'),
            color: 'text-blue-600 bg-blue-50'
        },
        { 
            id: 2, 
            label: 'משימה ראשונה', 
            subLabel: 'צור משימה במערכת',
            done: tasks.some(t => t.creatorId === currentUser.id), 
            icon: CheckSquare,
            action: () => openCreateTask(),
            color: 'text-purple-600 bg-purple-50'
        },
        { 
            id: 3, 
            label: 'כניסה למשמרת', 
            subLabel: 'הפעל שעון נוכחות',
            done: !!activeShift || tasks.some(t => t.timeSpent > 0), // Done if active or has logged time before
            icon: Clock,
            action: () => {
                const clockElement = document.getElementById('time-clock-widget');
                if (clockElement) clockElement.scrollIntoView({ behavior: 'smooth' });
            },
            color: 'text-emerald-600 bg-emerald-50'
        },
        { 
            id: 4, 
            label: 'הכרת ה-AI', 
            subLabel: 'בצע ניתוח ראשון',
            done: analysisHistory.length > 0, 
            icon: Sparkles,
            action: () => navigate('/brain'),
            color: 'text-amber-600 bg-amber-50',
            moduleId: 'ai'
        }
    ].filter(step => !step.moduleId || organization.enabledModules.includes(step.moduleId)); // Filter steps based on enabled modules
    
    const completedSteps = onboardingSteps.filter(s => s.done).length;
    const progressPercent = (completedSteps / onboardingSteps.length) * 100;
    const isAllComplete = completedSteps === onboardingSteps.length;

    useEffect(() => {
        if (!activeShift) {
            setElapsed('00:00:00');
            return;
        }
        const updateElapsed = () => {
            const start = new Date(activeShift.startTime).getTime();
            const now = new Date().getTime();
            const diff = now - start;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setElapsed(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };
        updateElapsed();
        const interval = setInterval(updateElapsed, 1000);
        return () => clearInterval(interval);
    }, [activeShift]);

    // Check granular permission for financials instead of hardcoded role check
    const canViewFinancials = hasPermission('view_financials') && organization.enabledModules.includes('finance');

    // --- FOCUS TASKS LOGIC (SYNCED) ---
    // 1. Get tasks explicitly marked as 'isFocus' from Morning Briefing
    const explicitFocusTasks = tasks.filter(t => 
        t.assigneeIds?.includes(currentUser.id) && 
        t.isFocus && 
        t.status !== Status.DONE && 
        t.status !== Status.CANCELED
    );

    // 2. Fallback heuristic if no tasks are marked (user skipped briefing)
    const fallbackTasks = tasks.filter(t => 
        t.assigneeIds?.includes(currentUser.id) && 
        t.status !== Status.DONE && 
        t.status !== Status.CANCELED &&
        t.priority === Priority.URGENT
    ).slice(0, 3);

    const focusTasks = explicitFocusTasks.length > 0 ? explicitFocusTasks : fallbackTasks;
    const isSynced = explicitFocusTasks.length > 0;

    const completedTasksCount = tasks.filter(t => t.status === Status.DONE).length;
    const totalTasksCount = tasks.length;
    const completionRate = totalTasksCount > 0 ? (completedTasksCount / totalTasksCount) * 100 : 0;
    const taskProgress = Math.min((completionRate / monthlyGoals.tasksCompletion) * 100, 100);

    const recurringRevenue = clients.filter(c => c.status === 'Active').reduce((sum, client) => {
            let price = 0;
            const product = products.find(p => p.name === client.package);
            if (product) price = product.price;
            else {
                if(client.package.includes('Premium')) price = 15000;
                else if(client.package.includes('Mastermind')) price = 5000;
            }
            return sum + price;
        }, 0);

    const wonLeadsRevenue = leads.filter(l => l.status === LeadStatus.WON).reduce((sum, lead) => sum + lead.value, 0);
    const totalRevenue = recurringRevenue + wonLeadsRevenue;
    const revenueGoal = monthlyGoals.revenue || 1; 
    const revenueProgress = Math.min((totalRevenue / revenueGoal) * 100, 100);

    const revenueHistory = [totalRevenue * 0.6, totalRevenue * 0.5, totalRevenue * 0.7, totalRevenue * 0.85, totalRevenue * 0.75, totalRevenue];
    const growth = ((revenueHistory[5] - revenueHistory[4]) / (revenueHistory[4] || 1)) * 100;

    // Correct Logic for Monthly Tasks: Check actual completion date, not creation date
    const myCompletedTasksThisMonth = tasks.filter(t => {
        if (!t.assigneeIds?.includes(currentUser.id)) return false;
        if (t.status !== Status.DONE) return false;
        
        // If completion details exist, use that date
        if (t.completionDetails?.completedAt) {
            const completionDate = new Date(t.completionDetails.completedAt);
            const now = new Date();
            return completionDate.getMonth() === now.getMonth() && completionDate.getFullYear() === now.getFullYear();
        }
        
        // Fallback (should rarely happen for completed tasks)
        return false; 
    }).length;

    const myPersonalTarget = currentUser.targets?.tasksMonth || 0;
    const myProgressPercentage = myPersonalTarget > 0 ? Math.min((myCompletedTasksThisMonth / myPersonalTarget) * 100, 100) : 0;

    const handleSaveGoals = () => { updateMonthlyGoals(tempGoals); setIsEditingGoals(false); };
    const formatCurrency = (amount: number) => new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(amount);

    // Gamification Display
    const streak = currentUser.streakDays || 0;

    return (
        <div className="flex flex-col gap-8 pb-20">
            <AnimatePresence>
                {isEditingGoals && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsEditingGoals(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-10 flex flex-col p-6">
                            <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-lg text-gray-900">הגדרת יעדים חודשיים</h3><button onClick={() => setIsEditingGoals(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button></div>
                            <div className="space-y-4">
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">יעד הכנסות (₪)</label><input type="number" value={tempGoals.revenue} onChange={(e) => setTempGoals({...tempGoals, revenue: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-bold text-lg" /></div>
                                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-2">יעד השלמת משימות (%)</label><input type="number" value={tempGoals.tasksCompletion} onChange={(e) => setTempGoals({...tempGoals, tasksCompletion: Number(e.target.value)})} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-black font-bold text-lg" max="100" /></div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6"><button onClick={() => setIsEditingGoals(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm">ביטול</button><button onClick={handleSaveGoals} className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm shadow-lg"><Check size={16} /> שמור יעדים</button></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex items-end justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        בוקר טוב, {currentUser.name.split(' ')[0]} 
                        <span className="inline-block animate-wave origin-bottom-right">👋</span>
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-gray-500 text-lg">מוכן לכבוש את היום? הנה המצב שלך.</p>
                        {streak > 0 && (
                            <div className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200" title="ימי עבודה רצופים בעמידה ביעדים">
                                <Flame size={14} fill="currentColor" className="animate-pulse" />
                                {streak} ימים ברצף!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ONBOARDING WIDGET - Redesigned */}
            <AnimatePresence>
                {showOnboarding && !isAllComplete && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="relative overflow-hidden rounded-[2.5rem] p-1 shadow-2xl mb-8"
                    >
                        {/* Gradient Border Effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-20"></div>
                        
                        <div className="relative bg-white/90 backdrop-blur-xl rounded-[2.3rem] p-8 md:p-10 border border-white/50 overflow-hidden">
                            {/* Decorative Background Elements */}
                            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

                            <button 
                                onClick={() => setShowOnboarding(false)} 
                                className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-20"
                            >
                                <X size={20} />
                            </button>

                            <div className="flex flex-col lg:flex-row gap-10 relative z-10">
                                {/* Left: Hero Section */}
                                <div className="lg:w-1/3 flex flex-col justify-center">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-bold w-fit mb-6 shadow-lg shadow-slate-900/20">
                                        <Rocket size={12} className="text-yellow-400" />
                                        <span>צעדים ראשונים</span>
                                    </div>
                                    
                                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight mb-4">
                                        ברוכים הבאים ל-<br/>
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Nexus OS</span>
                                    </h2>
                                    
                                    <p className="text-slate-500 text-sm leading-relaxed mb-8 max-w-sm">
                                        המערכת שתעשה לך סדר בראש ובעסק. השלם את הצעדים כדי להתחיל ברגל ימין ולפתוח את כל האפשרויות.
                                    </p>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                                            <span>התקדמות</span>
                                            <span>{Math.round(progressPercent)}%</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${progressPercent}%` }} 
                                                transition={{ duration: 1, ease: "easeOut" }} 
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)] relative"
                                            >
                                                <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                                            </motion.div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Steps Grid */}
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {onboardingSteps.map((step) => {
                                        const isDone = step.done;
                                        return (
                                            <button 
                                                key={step.id}
                                                onClick={step.action}
                                                disabled={isDone}
                                                className={`relative group flex flex-col p-5 rounded-3xl border text-right transition-all duration-300 overflow-hidden ${
                                                    isDone 
                                                    ? 'bg-slate-50 border-slate-200 opacity-60' 
                                                    : 'bg-white border-white shadow-lg shadow-slate-200/50 hover:border-indigo-100 hover:shadow-xl hover:-translate-y-1'
                                                }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                                                        isDone 
                                                        ? 'bg-green-100 text-green-600' 
                                                        : 'bg-slate-50 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                                    }`}>
                                                        {isDone ? <Check size={20} strokeWidth={3} /> : <step.icon size={22} />}
                                                    </div>
                                                    {!isDone && (
                                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                                                            <ChevronRight size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-auto">
                                                    <h4 className={`font-bold text-base mb-1 ${isDone ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                                                        {step.label}
                                                    </h4>
                                                    <p className={`text-xs ${isDone ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        {step.subLabel}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                
                {/* 1. Time Clock Widget - Glass */}
                <div id="time-clock-widget" className={`relative overflow-hidden rounded-[2.5rem] p-8 shadow-2xl transition-all duration-500 ${activeShift ? 'bg-black/90 text-white border border-white/10' : 'bg-white/60 border border-white/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.05)]'}`}>
                    {activeShift && (
                        <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-green-500/20 rounded-full blur-[80px] animate-pulse"></div>
                    )}
                    <div className="relative z-10 flex flex-col justify-between h-full min-h-[240px]">
                        <div className="flex justify-between items-start">
                            <div className={`p-3.5 rounded-2xl ${activeShift ? 'bg-white/10 text-green-400' : 'bg-white text-gray-900 shadow-sm'}`}>
                                <Clock size={28} />
                            </div>
                            {activeShift && <span className="bg-green-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-full animate-pulse shadow-lg shadow-green-500/40 border border-white/20">משמרת פעילה</span>}
                        </div>
                        <div className="mt-6 text-center">
                            {activeShift ? (
                                <>
                                    <div className="text-6xl font-mono font-bold tracking-tighter tabular-nums leading-none mb-2 drop-shadow-lg">{elapsed}</div>
                                    <div className="flex justify-center mt-8"><HoldButton isActive={true} onComplete={clockOut} label="יציאה" size="small" /></div>
                                </>
                            ) : (
                                <>
                                    <div className="text-4xl font-bold tracking-tight text-gray-300 mb-6">00:00:00</div>
                                    <div className="flex justify-center"><HoldButton isActive={false} onComplete={clockIn} label="כניסה" size="small" /></div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Business Health - Glass */}
                <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col justify-between h-full min-h-[240px] relative group overflow-hidden hover:shadow-2xl hover:bg-white/80 transition-all duration-500">
                    {canViewFinancials ? (
                        <>
                            <div className="flex items-center justify-between mb-4 z-10 relative">
                                <div className="flex items-center gap-4">
                                    <div className="p-3.5 bg-blue-50 text-blue-600 rounded-2xl shadow-sm"><TrendingUp size={28} /></div>
                                    <div><h3 className="font-bold text-gray-900 text-lg">הכנסות</h3><p className="text-xs text-blue-600 font-bold flex items-center gap-1"><RefreshCw size={10} /> Live</p></div>
                                </div>
                                <button onClick={() => { setTempGoals(monthlyGoals); setIsEditingGoals(true); }} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-end justify-between mb-6">
                                    <div>
                                        <div className="text-4xl font-black text-gray-900 tracking-tight">{formatCurrency(totalRevenue)}</div>
                                        <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>{growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(Math.round(growth))}% צמיחה</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-1">יעד</div>
                                        <div className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-lg inline-block">{formatCurrency(revenueGoal)}</div>
                                    </div>
                                </div>
                                <div className="-mx-4 -mb-4 opacity-50 group-hover:opacity-100 transition-opacity"><TrendChart data={revenueHistory} color="text-blue-500" /></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-4 mb-6 z-10 relative">
                                <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl shadow-sm"><Target size={28} /></div>
                                <div><h3 className="font-bold text-gray-900 text-lg">יעדים אישיים</h3><p className="text-sm text-gray-500">החודש הזה</p></div>
                            </div>
                            <div className="flex-1 flex flex-col justify-center">
                                <div className="mb-6">
                                    <div className="flex justify-between text-sm font-bold mb-3"><span className="text-gray-700">ביצוע משימות</span><span className="text-gray-900">{myCompletedTasksThisMonth} / {myPersonalTarget}</span></div>
                                    <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden relative shadow-inner">
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${myProgressPercentage}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full shadow-lg" />
                                    </div>
                                </div>
                                {myProgressPercentage >= 100 ? (
                                    <div className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-50 p-3 rounded-2xl animate-pulse shadow-sm border border-green-100"><Trophy size={16} /> עמדת ביעד החודשי!</div>
                                ) : (
                                    <div className="flex items-center gap-2 text-sm font-bold text-blue-700 bg-blue-50 p-3 rounded-2xl shadow-sm border border-blue-100"><ThumbsUp size={16} /> קצב מצוין!</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* 3. Team Widget - Glass (Only if Team module enabled) */}
                {organization.enabledModules.includes('team') && (
                <div className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col h-full min-h-[240px] hidden lg:flex hover:shadow-2xl hover:bg-white/80 transition-all duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-purple-50 text-purple-600 rounded-2xl shadow-sm"><Users size={28} /></div>
                            <div><h3 className="font-bold text-gray-900 text-lg">הצוות</h3><p className="text-sm text-gray-500">{Math.round(completionRate)}% מהמשימות</p></div>
                        </div>
                        <button onClick={() => navigate('/team')} className="text-gray-300 hover:text-black transition-colors p-2 hover:bg-gray-100 rounded-xl"><ArrowRight size={24} /></button>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                        <div className="mb-6">
                            <div className="flex justify-between text-xs font-bold mb-2"><span className="text-gray-500 uppercase tracking-wider">סטטוס חודשי</span><span className="text-gray-900">{completedTasksCount} / {totalTasksCount}</span></div>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner">
                                <motion.div initial={{ width: 0 }} animate={{ width: `${taskProgress}%` }} transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }} className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full shadow-lg" />
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3 space-x-reverse">
                                {users.filter(u => u.online).slice(0, 3).map(u => (
                                    <img key={u.id} src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white ring-2 ring-green-400 shadow-md object-cover" />
                                ))}
                            </div>
                            {users.filter(u => u.online).length > 0 ? <span className="text-xs text-green-700 font-bold bg-green-50 px-3 py-1.5 rounded-full shadow-sm border border-green-100">{users.filter(u => u.online).length} אונליין</span> : <span className="text-xs text-gray-400 italic">כולם במנוחה</span>}
                        </div>
                    </div>
                </div>
                )}
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between mb-6 px-2">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Zap size={24} className="text-yellow-500 fill-yellow-500 drop-shadow-sm" /> המיקוד להיום
                        {!isSynced && <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded-full">(אוטומטי)</span>}
                    </h2>
                    <div className="flex gap-2">
                        {!isSynced && (
                            <button onClick={() => setShowMorningBrief(true)} className="text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2">
                                <Sun size={16} /> תדריך בוקר
                            </button>
                        )}
                        <button onClick={() => navigate('/tasks')} className="text-sm font-bold text-gray-500 hover:text-black hover:bg-white/50 px-4 py-2 rounded-xl transition-all shadow-sm">לכל המשימות</button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    {focusTasks.length > 0 ? focusTasks.map(task => (
                        <div key={task.id} className="relative">
                            {task.isFocus && (
                                <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-yellow-400 rounded-r-lg shadow-sm"></div>
                            )}
                            <TaskCard 
                                task={task} 
                                users={users} 
                                onClick={() => openTask(task.id)} 
                            />
                        </div>
                    )) : (
                        <div className="bg-white/60 backdrop-blur-md rounded-[2rem] p-12 text-center border border-dashed border-gray-300">
                            <Trophy size={64} className="mx-auto text-yellow-400 mb-4 drop-shadow-md" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">סיימת את המיקוד להיום!</h3>
                            <p className="text-gray-500">קח משימה חדשה מהמאגר או צא להפסקה.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
