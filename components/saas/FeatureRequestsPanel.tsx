'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bug, Wrench, Zap, Clock, CircleCheckBig, CircleX, CircleAlert, Search, Filter, User, Calendar, ThumbsUp, RefreshCw, Eye, Edit2, Tag } from 'lucide-react';
import { FeatureRequest } from '../../types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { SkeletonTable } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';

interface FeatureRequestsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const FeatureRequestsPanel: React.FC<FeatureRequestsPanelProps> = ({ addToast }) => {
    const [requests, setRequests] = useState<FeatureRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, [statusFilter, typeFilter]);

    const loadRequests = async () => {
        setIsLoading(true);
        try {
            let url = '/api/features';
            const params = new URLSearchParams();
            if (statusFilter !== 'all') params.append('status', String(statusFilter));
            if (typeFilter !== 'all') params.append('type', String(typeFilter));
            if (params.toString()) url += '?' + params.toString();

            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(url, {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            if (!response.ok) {
                throw new Error('שגיאה בטעינת בקשות פיצ\'רים');
            }
            const data = await response.json();
            setRequests(data.requests || []);
        } catch (err: unknown) {
            console.error('[FeatureRequestsPanel] Error loading requests:', err);
            addToast((err instanceof Error ? err.message : String(err)) || 'שגיאה בטעינת בקשות פיצ\'רים', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (requestId: string, newStatus: string, adminNotes?: string, rejectionReason?: string) => {
        setUpdatingStatus(requestId);
        try {
            const body: Record<string, string> = { status: newStatus };
            if (adminNotes) body.admin_notes = adminNotes;
            if (rejectionReason) body.rejection_reason = rejectionReason;

            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;

            const response = await fetch(`/api/features/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון סטטוס');
            }

            await loadRequests();
            addToast('סטטוס עודכן בהצלחה', 'success');
            
            if (selectedRequest?.id === requestId) {
                const updated = await fetch(`/api/features?id=${requestId}`, {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                }).then(r => r.json());
                setSelectedRequest(updated);
            }
        } catch (err: unknown) {
            console.error('[FeatureRequestsPanel] Error updating status:', err);
            addToast((err instanceof Error ? err.message : String(err)) || 'שגיאה בעדכון סטטוס', 'error');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleAddNotes = async (requestId: string, notes: string) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const res = await fetch(`/api/features/${requestId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify({ admin_notes: notes })
            });

            if (!res.ok) {
                throw new Error('שגיאה בהוספת הערות');
            }

            await loadRequests();
            addToast('הערות נוספו בהצלחה', 'success');
            
            if (selectedRequest?.id === requestId) {
                const updated = await fetch(`/api/features?id=${requestId}`, {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                }).then(r => r.json());
                setSelectedRequest(updated);
            }
        } catch (err: unknown) {
            console.error('[FeatureRequestsPanel] Error adding notes:', err);
            addToast((err instanceof Error ? err.message : String(err)) || 'שגיאה בהוספת הערות', 'error');
        }
    };

    const filteredRequests = requests.filter(request => {
        const matchesSearch = 
            request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', icon: Clock, label: 'ממתין' };
            case 'under_review': return { color: 'bg-orange-500/10 text-orange-700 border-orange-500/20', icon: CircleAlert, label: 'בבדיקה' };
            case 'planned': return { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: Tag, label: 'מתוכנן' };
            case 'in_progress': return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', icon: Clock, label: 'בפיתוח' };
            case 'completed': return { color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CircleCheckBig, label: 'הושלם' };
            case 'rejected': return { color: 'bg-red-500/10 text-red-700 border-red-500/20', icon: CircleX, label: 'נדחה' };
            default: return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', icon: Clock, label: status };
        }
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'feature': return { label: 'פיצ׳ר חדש', icon: Sparkles, color: 'bg-purple-500/10 text-purple-700' };
            case 'bug': return { label: 'תקלה', icon: Bug, color: 'bg-red-500/10 text-red-700' };
            case 'improvement': return { label: 'שיפור', icon: Wrench, color: 'bg-orange-500/10 text-orange-700' };
            case 'integration': return { label: 'אינטגרציה', icon: Zap, color: 'bg-blue-500/10 text-blue-700' };
            default: return { label: type, icon: Tag, color: 'bg-slate-500/10 text-slate-700' };
        }
    };

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        in_progress: requests.filter(r => r.status === 'in_progress').length,
        completed: requests.filter(r => r.status === 'completed').length,
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8">
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    ניהול בקשות פיצ'רים
                </h1>
                <p className="text-slate-600 text-base md:text-lg">נהל את כל בקשות הפיצ'רים מהמשתמשים, עדכן סטטוסים והוסף הערות.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">סה"כ בקשות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
                            <Sparkles size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">ממתינות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.pending}</h3>
                        </div>
                        <div className="p-3 bg-slate-500/10 text-slate-600 rounded-xl border border-slate-200 backdrop-blur-sm">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">בפיתוח</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.in_progress}</h3>
                        </div>
                        <div className="p-3 bg-yellow-500/10 text-yellow-600 rounded-xl border border-yellow-500/20 backdrop-blur-sm">
                            <CircleAlert size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">הושלמו</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.completed}</h3>
                        </div>
                        <div className="p-3 bg-green-500/10 text-green-600 rounded-xl border border-green-500/20 backdrop-blur-sm">
                            <CircleCheckBig size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 mb-6 shadow-xl">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="חפש לפי כותרת או תיאור..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 pr-10 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full sm:w-auto bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all"
                        >
                            <option value="all">כל הסטטוסים</option>
                            <option value="pending">ממתין</option>
                            <option value="under_review">בבדיקה</option>
                            <option value="planned">מתוכנן</option>
                            <option value="in_progress">בפיתוח</option>
                            <option value="completed">הושלם</option>
                            <option value="rejected">נדחה</option>
                        </select>
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full sm:w-auto bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-sm font-bold focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all"
                        >
                            <option value="all">כל הסוגים</option>
                            <option value="feature">פיצ׳ר חדש</option>
                            <option value="bug">תקלה</option>
                            <option value="improvement">שיפור</option>
                            <option value="integration">אינטגרציה</option>
                        </select>
                    </div>
                    <Button
                        onClick={loadRequests}
                        disabled={isLoading}
                        type="button"
                        variant="outline"
                        className="w-full md:w-auto px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                        title="רענן"
                    >
                        <RefreshCw size={18} className={isLoading ? 'opacity-50' : ''} />
                    </Button>
                </div>
            </div>

            {/* Requests List */}
            {isLoading ? (
                <SkeletonTable rows={8} columns={5} />
            ) : filteredRequests.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-12 text-center shadow-xl">
                    <Sparkles size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">אין בקשות פיצ'רים</h3>
                    <p className="text-sm text-slate-600">כאשר משתמשים יגישו בקשות פיצ'רים, הן יופיעו כאן</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredRequests.map((request) => {
                        const statusConfig = getStatusConfig(request.status);
                        const typeConfig = getTypeConfig(request.type);
                        
                        return (
                            <motion.div
                                key={request.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 hover:border-slate-300/80 hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedRequest(request);
                                    setIsDetailModalOpen(true);
                                }}
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusConfig.color}`}>
                                                <statusConfig.icon size={10} className="inline mr-1" />
                                                {statusConfig.label}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${typeConfig.color}`}>
                                                <typeConfig.icon size={10} className="inline mr-1" />
                                                {typeConfig.label}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">{request.title}</h3>
                                        <p className="text-sm text-slate-600 line-clamp-2">{request.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 border-t border-slate-200/70">
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <ThumbsUp size={12} />
                                            {request.votes.length}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(request.createdAt).toLocaleDateString('he-IL')}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRequest(request);
                                            setIsDetailModalOpen(true);
                                        }}
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-slate-200"
                                        title="פרטים"
                                    >
                                        <Eye size={16} />
                                    </Button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && selectedRequest && (
                <FeatureRequestDetailModal
                    request={selectedRequest}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedRequest(null);
                    }}
                    onStatusChange={handleStatusChange}
                    onAddNotes={handleAddNotes}
                    updatingStatus={updatingStatus}
                />
            )}
        </motion.div>
    );
};

// Feature Request Detail Modal Component
interface FeatureRequestDetailModalProps {
    request: FeatureRequest;
    onClose: () => void;
    onStatusChange: (requestId: string, status: string, adminNotes?: string, rejectionReason?: string) => void;
    onAddNotes: (requestId: string, notes: string) => void;
    updatingStatus: string | null;
}

const FeatureRequestDetailModal: React.FC<FeatureRequestDetailModalProps> = ({
    request,
    onClose,
    onStatusChange,
    onAddNotes,
    updatingStatus
}) => {
    const [notesText, setNotesText] = useState(request.admin_notes || '');
    const [rejectionReason, setRejectionReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitNotes = async () => {
        if (!notesText.trim()) return;
        setIsSubmitting(true);
        await onAddNotes(request.id, notesText);
        setIsSubmitting(false);
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (newStatus === 'rejected' && !rejectionReason.trim()) {
            alert('נא להזין סיבת דחייה');
            return;
        }
        await onStatusChange(request.id, newStatus, notesText, rejectionReason);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', label: 'ממתין' };
            case 'under_review': return { color: 'bg-orange-500/10 text-orange-700 border-orange-500/20', label: 'בבדיקה' };
            case 'planned': return { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', label: 'מתוכנן' };
            case 'in_progress': return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', label: 'בפיתוח' };
            case 'completed': return { color: 'bg-green-500/10 text-green-700 border-green-500/20', label: 'הושלם' };
            case 'rejected': return { color: 'bg-red-500/10 text-red-700 border-red-500/20', label: 'נדחה' };
            default: return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', label: status };
        }
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'feature': return { label: 'פיצ׳ר חדש', icon: Sparkles, color: 'bg-purple-500/10 text-purple-700' };
            case 'bug': return { label: 'תקלה', icon: Bug, color: 'bg-red-500/10 text-red-700' };
            case 'improvement': return { label: 'שיפור', icon: Wrench, color: 'bg-orange-500/10 text-orange-700' };
            case 'integration': return { label: 'אינטגרציה', icon: Zap, color: 'bg-blue-500/10 text-blue-700' };
            default: return { label: type, icon: Tag, color: 'bg-slate-500/10 text-slate-700' };
        }
    };

    const typeConfig = getTypeConfig(request.type);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/90 backdrop-blur-2xl border border-slate-200/70 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-200/70 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${typeConfig.color}`}>
                            <typeConfig.icon size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getStatusConfig(request.status).color}`}>
                                    {getStatusConfig(request.status).label}
                                </span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-900">{request.title}</h2>
                        </div>
                    </div>
                    <Button
                        onClick={onClose}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <CircleX size={20} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Request Info */}
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/70">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">סוג</p>
                                <p className="text-slate-900 font-bold">{typeConfig.label}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">עדיפות</p>
                                <p className="text-slate-900 font-bold">{request.priority}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">נוצר</p>
                                <p className="text-slate-900">{new Date(request.createdAt).toLocaleString('he-IL')}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">הצבעות</p>
                                <p className="text-slate-900 font-bold flex items-center gap-1">
                                    <ThumbsUp size={14} />
                                    {request.votes.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">תיאור</p>
                        <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/70">
                            <p className="text-slate-900 whitespace-pre-wrap">{request.description}</p>
                        </div>
                    </div>

                    {/* Admin Notes */}
                    {request.admin_notes && (
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase mb-2">הערות אדמין</p>
                            <div className="bg-indigo-50/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-200/70">
                                <p className="text-slate-900 whitespace-pre-wrap">{request.admin_notes}</p>
                            </div>
                        </div>
                    )}

                    {/* Rejection Reason */}
                    {request.rejection_reason && (
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase mb-2">סיבת דחייה</p>
                            <div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-4 border border-red-200/70">
                                <p className="text-slate-900 whitespace-pre-wrap">{request.rejection_reason}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Change */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">שינוי סטטוס</p>
                        <div className="flex gap-2 flex-wrap">
                            {['pending', 'under_review', 'planned', 'in_progress', 'completed', 'rejected'].map((status) => (
                                <Button
                                    key={status}
                                    onClick={() => handleStatusUpdate(status)}
                                    disabled={updatingStatus === request.id || request.status === status}
                                    type="button"
                                    variant="outline"
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                                        request.status === status
                                            ? 'bg-indigo-600 text-white border-indigo-500'
                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {status === 'pending' ? 'ממתין' :
                                     status === 'under_review' ? 'בבדיקה' :
                                     status === 'planned' ? 'מתוכנן' :
                                     status === 'in_progress' ? 'בפיתוח' :
                                     status === 'completed' ? 'הושלם' : 'נדחה'}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Rejection Reason Input (if rejecting) */}
                    {request.status !== 'rejected' && (
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase mb-2">סיבת דחייה (אם נדחה)</p>
                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="הזן סיבת דחייה..."
                                className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-red-300 focus:ring-2 focus:ring-red-200/60 focus:outline-none transition-all min-h-[80px] resize-none"
                            />
                        </div>
                    )}

                    {/* Add Admin Notes */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">הערות אדמין</p>
                        <textarea
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            placeholder="הוסף הערות פנימיות..."
                            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all min-h-[120px] resize-none"
                        />
                        <Button
                            onClick={handleSubmitNotes}
                            disabled={isSubmitting || !notesText.trim()}
                            type="button"
                            className="mt-3 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'שולח...' : 'שמור הערות'}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
