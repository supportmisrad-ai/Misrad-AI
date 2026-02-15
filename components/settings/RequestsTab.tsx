'use client';

import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, UserCheck, Trash2, ThumbsUp, Calendar, Tag, Bug, Zap, CheckCircle2, Clock, Sparkles, Wrench, AlertOctagon, Plus, Send, RefreshCw } from 'lucide-react';
import { FeatureRequest, FeatureRequestType, Priority, ChangeRequest, User } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';

export const RequestsTab: React.FC = () => {
    const { 
        changeRequests, approveNameChange, rejectNameChange,
        currentUser, hasPermission, users
    } = useData();
    
    const [featureRequests, setFeatureRequests] = useState<FeatureRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [reqTitle, setReqTitle] = useState('');
    const [reqDesc, setReqDesc] = useState('');
    const [reqType, setReqType] = useState<FeatureRequestType>('feature');
    const [reqPriority, setReqPriority] = useState<Priority>(Priority.MEDIUM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Delete Modal State
    const [requestToDelete, setRequestToDelete] = useState<{id: string, title: string} | null>(null);

    // Load feature requests from API
    useEffect(() => {
        loadFeatureRequests();
    }, []);

    const loadFeatureRequests = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/features');
            if (!response.ok) {
                throw new Error('שגיאה בטעינת בקשות פיצ\'רים');
            }
            const data = await response.json();
            setFeatureRequests(data.requests || []);
        } catch (err: unknown) {
            console.error('[RequestsTab] Error loading feature requests:', err);
            setError((err as Error).message || 'שגיאה בטעינת בקשות פיצ\'רים');
        } finally {
            setIsLoading(false);
        }
    };

    const pendingRequests = changeRequests.filter((r: ChangeRequest) => r.status === 'pending');
    
    // Check if user is a manager (to see who submitted the request)
    const isManager = hasPermission('manage_team') || hasPermission('manage_system');

    const handleCreateRequest = async () => {
        if (!reqTitle.trim()) return;
        
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('/api/features', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: reqTitle.trim(),
                    description: reqDesc.trim(),
            type: reqType,
                    priority: reqPriority.toLowerCase()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת בקשת פיצ\'ר');
            }

            const data = await response.json();
            
            // Reload requests
            await loadFeatureRequests();
            
        setIsRequestModalOpen(false);
        setReqTitle('');
        setReqDesc('');
        setReqType('feature');
        } catch (err: unknown) {
            console.error('[RequestsTab] Error creating feature request:', err);
            setError((err as Error).message || 'שגיאה ביצירת בקשת פיצ\'ר');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, title: string) => {
        e.stopPropagation();
        setRequestToDelete({ id, title });
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        
        // Note: We don't have a DELETE endpoint, so we'll just remove from local state
        // In a real app, you'd call DELETE /api/features/[id]
        setFeatureRequests(prev => prev.filter(r => r.id !== requestToDelete.id));
            setRequestToDelete(null);
    };

    const handleVote = async (requestId: string, hasVoted: boolean) => {
        try {
            const response = await fetch(`/api/features/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vote: !hasVoted // Toggle vote
                })
            });

            if (!response.ok) {
                throw new Error('שגיאה בהצבעה');
            }

            // Reload requests to get updated vote count
            await loadFeatureRequests();
        } catch (err: unknown) {
            console.error('[RequestsTab] Error voting:', err);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'done': return { color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2, label: 'בוצע' };
            case 'approved': return { color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Zap, label: 'אושר' };
            case 'reviewing': return { color: 'bg-orange-50 text-orange-700 border-orange-200', icon: Clock, label: 'בבדיקה' };
            default: return { color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Tag, label: 'נפתח' };
        }
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'bug': return { label: 'תקלה', icon: Bug, color: 'text-red-500 bg-red-50 border-red-100' };
            case 'change': return { label: 'שיפור', icon: Wrench, color: 'text-orange-500 bg-orange-50 border-orange-100' };
            default: return { label: 'פיצ׳ר', icon: Sparkles, color: 'text-purple-500 bg-purple-50 border-purple-100' };
        }
    };

    const REQUEST_TYPES = [
        { id: 'feature', label: 'הוספת תכונה חדשה', icon: Sparkles, color: 'bg-purple-50 text-purple-600 border-purple-200', desc: 'רעיון לפיצ׳ר שאין במערכת' },
        { id: 'improvement', label: 'שיפור תכונה קיימת', icon: Wrench, color: 'bg-orange-50 text-orange-600 border-orange-200', desc: 'ייעול של משהו קיים' },
        { id: 'bug', label: 'דיווח על תקלה', icon: Bug, color: 'bg-red-50 text-red-600 border-red-200', desc: 'משהו לא עובד כשורה' },
        { id: 'integration', label: 'אינטגרציה', icon: Zap, color: 'bg-blue-50 text-blue-600 border-blue-200', desc: 'חיבור לשירות חיצוני' },
    ];

    return (
        <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!requestToDelete}
                onClose={() => setRequestToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת בקשה"
                description="הבקשה תועבר לארכיון המחיקות."
                itemName={requestToDelete?.title}
                isHardDelete={false}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div><h2 className="text-xl font-bold text-gray-900 hidden lg:block">בקשות והצעות לייעול</h2><p className="text-sm text-gray-500 hidden lg:block">הצבע על פיצ׳רים שחשובים לך, בקש שיפורים או דווח על תקלות.</p></div>
                <div className="flex gap-2">
                    <button 
                        onClick={loadFeatureRequests} 
                        disabled={isLoading}
                        className="bg-gray-100 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                        title="רענן"
                    >
                        {isLoading ? <Skeleton className="w-4 h-4 rounded-full" /> : <RefreshCw size={16} />}
                    </button>
                <button onClick={() => setIsRequestModalOpen(true)} className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2 w-full md:w-auto justify-center"><Plus size={18} /> הגש בקשה</button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* Pending Approvals (Visible to Managers) */}
            {hasPermission('manage_system') && pendingRequests.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-orange-900 mb-4 flex items-center gap-2">
                        <UserCheck size={20} /> אישורים ממתינים
                    </h3>
                    <div className="space-y-3">
                    {pendingRequests.map((req: ChangeRequest) => (
                            <div key={req.id} className="bg-white p-4 rounded-xl border border-orange-100 flex justify-between items-center shadow-sm">
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">בקשת שינוי שם: {req.userName}</div>
                                    <div className="text-xs text-gray-500 mt-1">ביקש לשנות ל: <span className="font-bold text-black">{req.requestedName}</span></div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => rejectNameChange(req.id)} className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors" aria-label="דחה בקשה">דחה</button>
                                    <button onClick={() => approveNameChange(req.id)} className="p-2 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 text-xs font-bold transition-colors" aria-label="אשר בקשה">אשר</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="py-6">
                    <SkeletonGrid cards={6} columns={2} />
                </div>
            ) : featureRequests.length === 0 && pendingRequests.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-gray-200 text-gray-400">אין בקשות כרגע</div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featureRequests.map((req: FeatureRequest) => {
                        const creator = users.find((u: User) => u.id === (req.creatorId || req.user_id));
                        const canDelete = (req.creatorId || req.user_id) === currentUser.id || hasPermission('manage_system');
                    const hasVoted = req.votes.includes(currentUser.id);
                    const statusConfig = getStatusConfig(req.status);
                    const typeConfig = getTypeConfig(req.type);

                    return (
                        <div key={req.id} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm relative group hover:shadow-md transition-all flex flex-col h-full">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 uppercase tracking-wide ${statusConfig.color}`}>
                                        <statusConfig.icon size={10} /> {statusConfig.label}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 uppercase tracking-wide ${typeConfig.color}`}>
                                        <typeConfig.icon size={10} /> {typeConfig.label}
                                    </span>
                                </div>
                                {canDelete && (
                                    <button 
                                        onClick={(e) => handleDeleteClick(e, req.id, req.title)}
                                        className="text-gray-300 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900 text-lg mb-1">{req.title}</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">{req.description}</p>
                            </div>

                            {/* Footer / Meta */}
                            <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <button 
                                            onClick={() => handleVote(req.id, hasVoted)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                            hasVoted 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <ThumbsUp size={14} className={hasVoted ? 'fill-white' : ''} />
                                        {req.votes.length}
                                    </button>
                                </div>

                                <div className="flex items-center gap-3 text-xs text-gray-400">
                                    <div className="flex items-center gap-1" title={new Date(req.createdAt).toLocaleString('he-IL')}>
                                        <Calendar size={12} />
                                        {new Date(req.createdAt).toLocaleDateString('he-IL')}
                                    </div>
                                    
                                    {/* Creator Info - Visible only to Managers */}
                                    {isManager && creator && (
                                        <>
                                            <div className="w-px h-3 bg-gray-200"></div>
                                            <div className="flex items-center gap-1.5 text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-md">
                                                <img src={creator.avatar} alt={creator.name} className="w-4 h-4 rounded-full" />
                                                {creator.name}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            )}
            
            <AnimatePresence>
                {isRequestModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setIsRequestModalOpen(false)}>
                        <div className="bg-white p-6 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                            <div className="text-center mb-6">
                                <h3 className="text-xl font-black text-gray-900">הגשת בקשה למערכת</h3>
                                <p className="text-sm text-gray-500">מה תרצה לקדם היום?</p>
                            </div>
                            
                            <div className="space-y-6">
                                {/* Type Selection - Improved UI */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-3 text-center">סוג הבקשה</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {REQUEST_TYPES.map((type) => (
                                            <button
                                                key={type.id}
                                                onClick={() => setReqType(type.id as FeatureRequestType)}
                                                className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${
                                                    reqType === type.id 
                                                    ? `${String((type as Record<string, unknown>).color ?? '').replace('text-', 'border-')} bg-white shadow-md scale-[1.02]` 
                                                    : 'border-transparent bg-gray-50 text-gray-500 hover:bg-gray-100'
                                                }`}
                                            >
                                                <type.icon size={24} className={`mb-2 ${reqType === type.id ? type.color.split(' ')[1] : 'text-gray-400'}`} />
                                                <span className={`text-xs font-bold ${reqType === type.id ? 'text-gray-900' : 'text-gray-500'}`}>{type.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-center text-gray-400 mt-2">
                                        {REQUEST_TYPES.find(t => t.id === reqType)?.desc}
                                    </p>
                                </div>

                                <div className="space-y-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">נושא הבקשה</label>
                                        <input 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-black transition-colors font-medium text-sm" 
                                            placeholder="לדוגמה: הוספת מצב לילה..." 
                                            value={reqTitle} 
                                            onChange={e => setReqTitle(e.target.value)} 
                                            autoFocus 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">פירוט (למה זה חשוב?)</label>
                                        <textarea 
                                            className="w-full p-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-black transition-colors h-24 resize-none text-sm" 
                                            placeholder="תאר את הצורך או את הבעיה..." 
                                            value={reqDesc} 
                                            onChange={e => setReqDesc(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mt-4">
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-8">
                                <button 
                                    onClick={() => {
                                        setIsRequestModalOpen(false);
                                        setError(null);
                                    }} 
                                    className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors text-sm"
                                    disabled={isSubmitting}
                                >
                                    ביטול
                                </button>
                                <button 
                                    onClick={handleCreateRequest} 
                                    disabled={isSubmitting || !reqTitle.trim()}
                                    className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-lg text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                                            שולח...
                                        </>
                                    ) : (
                                        <>
                                    שלח בקשה <Send size={16} className="rotate-180" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
