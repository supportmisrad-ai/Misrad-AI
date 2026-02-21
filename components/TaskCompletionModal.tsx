import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { Task, TaskCompletionDetails, TaskContributor, User } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleCheckBig, Clock, TriangleAlert, Star, ThumbsUp, ThumbsDown, X, Save, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

export const TaskCompletionModal: React.FC = () => {
    const { taskToComplete, confirmCompleteTask, cancelCompleteTask, users } = useData();
    useBackButtonClose(!!taskToComplete, cancelCompleteTask);
    
    // Single User State
    const [actualHours, setActualHours] = useState(0);
    const [actualMinutes, setActualMinutes] = useState(0);
    
    // Multi User State
    const [contributors, setContributors] = useState<{ [userId: string]: { hours: number, minutes: number } }>({});

    const [rating, setRating] = useState(0);
    const [reflection, setReflection] = useState('');

    const assignees: string[] = taskToComplete?.assigneeIds || (taskToComplete?.assigneeId ? [taskToComplete.assigneeId] : []);
    const isMultiUser = assignees.length > 1;

    useEffect(() => {
        if (taskToComplete) {
            // Pre-fill with timer data
            const seconds = taskToComplete.timeSpent || 0;
            
            if (isMultiUser) {
                // Initialize contributors with 0 or split time? Let's init with 0 for manual entry
                const initialContribs: { [userId: string]: { hours: number, minutes: number } } = {};
                assignees.forEach((id: string) => {
                    initialContribs[id] = { hours: 0, minutes: 0 };
                });
                setContributors(initialContribs);
            } else {
                setActualHours(Math.floor(seconds / 3600));
                setActualMinutes(Math.floor((seconds % 3600) / 60));
            }
            
            setRating(0);
            setReflection('');
        }
    }, [taskToComplete, isMultiUser, assignees]);

    if (!taskToComplete) return null;

    const snoozeCount = taskToComplete.snoozeCount || 0;

    const handleContributorChange = (userId: string, field: 'hours' | 'minutes', value: number) => {
        setContributors(prev => ({
            ...prev,
            [userId]: {
                ...prev[userId],
                [field]: Math.max(0, value)
            }
        }));
    };

    // Calculate total for display in multi-user mode
    const totalMultiSeconds = (Object.values(contributors) as { hours: number, minutes: number }[]).reduce((acc, curr) => acc + (curr.hours * 3600) + (curr.minutes * 60), 0);

    const handleConfirm = () => {
        let finalSeconds = 0;
        let finalContributors: TaskContributor[] = [];

        if (isMultiUser) {
            finalSeconds = totalMultiSeconds;
            finalContributors = Object.entries(contributors).map(([userId, time]: [string, { hours: number, minutes: number }]) => ({
                userId,
                timeSpent: (time.hours * 3600) + (time.minutes * 60)
            }));
        } else {
            finalSeconds = (Number(actualHours) * 3600) + (Number(actualMinutes) * 60);
            if (assignees.length === 1) {
                finalContributors = [{ userId: assignees[0], timeSpent: finalSeconds }];
            }
        }
        
        const details: TaskCompletionDetails = {
            actualTime: finalSeconds,
            contributors: finalContributors,
            completedAt: new Date().toISOString(),
            snoozeCount: snoozeCount,
            delayDays: 0,
            rating,
            reflection
        };

        confirmCompleteTask(taskToComplete.id, details);
        
        // Trigger Confetti
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#16a34a', '#4ade80']
        });
    };

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="bg-green-600 p-6 text-white text-center relative overflow-hidden shrink-0">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md border border-white/30">
                            <CircleCheckBig size={32} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight">כל הכבוד! סיימת משימה.</h2>
                        <p className="opacity-90 text-sm mt-1">{taskToComplete.title}</p>
                    </div>
                    <button onClick={cancelCompleteTask} className="absolute top-4 right-4 text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                    
                    {/* Time Entry Section */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                <Clock size={14} className="text-blue-500" /> 
                                {isMultiUser ? 'פירוט זמן עבודה לכל משתתף' : 'כמה זמן זה לקח באמת?'}
                            </label>
                            {isMultiUser && (
                                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                    סה״כ: {Math.floor(totalMultiSeconds / 3600)}ש׳ {Math.floor((totalMultiSeconds % 3600) / 60)}דק׳
                                </span>
                            )}
                        </div>

                        {isMultiUser ? (
                            <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                {assignees.map((userId: string) => {
                                    const user = users.find((u: User) => u.id === userId);
                                    const userTime = contributors[userId] || { hours: 0, minutes: 0 };
                                    
                                    return (
                                        <div key={userId} className="flex items-center justify-between gap-3 bg-white p-2 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <img src={user?.avatar} className="w-8 h-8 rounded-full border border-gray-100" />
                                                <span className="text-sm font-bold text-gray-700 truncate">{user?.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="number"
                                                    value={userTime.hours}
                                                    onChange={e => handleContributorChange(userId, 'hours', Number(e.target.value))}
                                                    className="w-12 p-1 text-center border border-gray-200 rounded outline-none focus:border-blue-500 font-mono text-sm"
                                                    placeholder="שע"
                                                    min="0"
                                                />
                                                <span className="text-gray-400">:</span>
                                                <input 
                                                    type="number"
                                                    value={userTime.minutes}
                                                    onChange={e => handleContributorChange(userId, 'minutes', Number(e.target.value))}
                                                    className="w-12 p-1 text-center border border-gray-200 rounded outline-none focus:border-blue-500 font-mono text-sm"
                                                    placeholder="דק"
                                                    min="0"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                                    <input 
                                        type="number" 
                                        value={actualHours}
                                        onChange={(e) => setActualHours(Math.max(0, Number(e.target.value)))}
                                        className="w-full bg-transparent outline-none text-2xl font-black text-center text-gray-900"
                                        min="0"
                                    />
                                    <span className="text-xs font-bold text-gray-400 uppercase">שעות</span>
                                </div>
                                <span className="text-xl font-bold text-gray-300">:</span>
                                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-2 focus-within:ring-2 focus-within:ring-green-100 transition-all">
                                    <input 
                                        type="number" 
                                        value={actualMinutes}
                                        onChange={(e) => setActualMinutes(Math.max(0, Number(e.target.value)))}
                                        className="w-full bg-transparent outline-none text-2xl font-black text-center text-gray-900"
                                        min="0"
                                    />
                                    <span className="text-xs font-bold text-gray-400 uppercase">דקות</span>
                                </div>
                            </div>
                        )}
                        
                        {!isMultiUser && (
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                (הטיימר מדד: {Math.floor((taskToComplete.timeSpent || 0) / 60)} דקות)
                            </p>
                        )}
                    </div>

                    {/* Snooze Shame/Fame */}
                    {snoozeCount > 0 ? (
                        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-3">
                            <div className="bg-red-100 p-2 rounded-lg text-red-600"><TriangleAlert size={18} /></div>
                            <div>
                                <h4 className="font-bold text-red-900 text-sm">עיכובים בדרך</h4>
                                <p className="text-xs text-red-700 mt-1">
                                    המשימה הזו נדחתה <span className="font-black">{snoozeCount}</span> פעמים.
                                    שווה לחשוב למה זה קרה לפעם הבאה.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-green-50 border border-green-100 p-4 rounded-xl flex items-center gap-3">
                            <div className="bg-green-100 p-2 rounded-lg text-green-600"><ThumbsUp size={18} /></div>
                            <div>
                                <h4 className="font-bold text-green-900 text-sm">ביצוע נקי!</h4>
                                <p className="text-xs text-green-700">ללא דחיות. עבודה מצוינת.</p>
                            </div>
                        </div>
                    )}

                    {/* Reflection */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">לקח לפעם הבאה (אופציונלי)</label>
                        <textarea 
                            value={reflection}
                            onChange={(e) => setReflection(e.target.value)}
                            placeholder="למשל: בפעם הבאה לבקש חומרים מהלקוח מראש..."
                            className="w-full h-20 p-3 bg-white border border-gray-200 rounded-xl text-sm focus:border-green-500 outline-none resize-none shadow-sm"
                        />
                    </div>

                    <button 
                        onClick={handleConfirm}
                        className="w-full bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-transform active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 shrink-0"
                    >
                        סמן כבוצע <CircleCheckBig size={20} />
                    </button>

                </div>
            </motion.div>
        </div>
    );
};