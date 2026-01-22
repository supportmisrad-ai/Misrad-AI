'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, User, Mail, Calendar, MessageSquare, RefreshCw, Eye, Edit2 } from 'lucide-react';
import { SupportTicket } from '../../types';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import { SkeletonTable } from '@/components/ui/skeletons';

interface SupportTicketsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SupportTicketsPanel: React.FC<SupportTicketsPanelProps> = ({ addToast }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    useEffect(() => {
        loadTickets();
    }, [statusFilter]);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const url = statusFilter !== 'all' 
                ? `/api/support?status=${statusFilter}`
                : '/api/support';

            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(url, {
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });
            if (!response.ok) {
                throw new Error('שגיאה בטעינת קריאות תמיכה');
            }
            const data = await response.json();
            setTickets(data.tickets || []);
        } catch (err: any) {
            console.error('[SupportTicketsPanel] Error loading tickets:', err);
            addToast(err.message || 'שגיאה בטעינת קריאות תמיכה', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        setUpdatingStatus(ticketId);
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בעדכון סטטוס');
            }

            await loadTickets();
            addToast('סטטוס עודכן בהצלחה', 'success');
            
            if (selectedTicket?.id === ticketId) {
                const updated = await fetch(`/api/support?id=${ticketId}`, {
                    headers: orgId ? { 'x-org-id': orgId } : undefined
                }).then(r => r.json());
                setSelectedTicket(updated);
            }
        } catch (err: any) {
            console.error('[SupportTicketsPanel] Error updating status:', err);
            addToast(err.message || 'שגיאה בעדכון סטטוס', 'error');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleAddResponse = async (ticketId: string, response: string) => {
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const res = await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({ admin_response: response })
            });

            if (!res.ok) {
                throw new Error('שגיאה בהוספת תגובה');
            }

            await loadTickets();
            addToast('תגובה נוספה בהצלחה', 'success');
            
            if (selectedTicket?.id === ticketId) {
                const updated = await fetch(`/api/support?id=${ticketId}`, {
                    headers: orgId ? { 'x-org-id': orgId } : undefined
                }).then(r => r.json());
                setSelectedTicket(updated);
            }
        } catch (err: any) {
            console.error('[SupportTicketsPanel] Error adding response:', err);
            addToast(err.message || 'שגיאה בהוספת תגובה', 'error');
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        const matchesSearch = 
            ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ticket.message.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'open': return { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', icon: Clock, label: 'פתוח' };
            case 'in_progress': return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', icon: AlertCircle, label: 'בטיפול' };
            case 'resolved': return { color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle2, label: 'נפתר' };
            case 'closed': return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', icon: XCircle, label: 'סגור' };
            default: return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', icon: Clock, label: status };
        }
    };

    const getCategoryConfig = (category: string) => {
        switch (category) {
            case 'Tech': return { label: 'תמיכה טכנית', color: 'bg-blue-500/10 text-blue-700' };
            case 'Account': return { label: 'חשבון ופרטים', color: 'bg-purple-500/10 text-purple-700' };
            case 'Billing': return { label: 'חיוב ומנויים', color: 'bg-emerald-500/10 text-emerald-700' };
            case 'Feature': return { label: 'בקשת פיצ׳ר', color: 'bg-indigo-500/10 text-indigo-700' };
            default: return { label: category, color: 'bg-slate-500/10 text-slate-700' };
        }
    };

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        in_progress: tickets.filter(t => t.status === 'in_progress').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="mb-8">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                    ניהול קריאות תמיכה
                </h1>
                <p className="text-slate-600 text-lg">נהל את כל קריאות התמיכה מהמשתמשים, עדכן סטטוסים והוסף תגובות.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">סה"כ קריאות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
                            <LifeBuoy size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">פתוחות</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.open}</h3>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20 backdrop-blur-sm">
                            <Clock size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">בטיפול</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.in_progress}</h3>
                        </div>
                        <div className="p-3 bg-yellow-500/10 text-yellow-600 rounded-xl border border-yellow-500/20 backdrop-blur-sm">
                            <AlertCircle size={20} />
                        </div>
                    </div>
                </div>
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 p-6 rounded-2xl shadow-xl hover:border-slate-300/80 transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase">נפתרו</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.resolved}</h3>
                        </div>
                        <div className="p-3 bg-green-500/10 text-green-600 rounded-xl border border-green-500/20 backdrop-blur-sm">
                            <CheckCircle2 size={20} />
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
                            placeholder="חפש לפי מספר קריאה, נושא או תוכן..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 pr-10 py-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2">
                        {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                    statusFilter === status
                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                        : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {status === 'all' ? 'הכל' : 
                                 status === 'open' ? 'פתוחות' :
                                 status === 'in_progress' ? 'בטיפול' :
                                 status === 'resolved' ? 'נפתרו' : 'סגורות'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={loadTickets}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 transition-all disabled:opacity-50"
                        title="רענן"
                    >
                        <RefreshCw size={18} className={isLoading ? 'opacity-50' : ''} />
                    </button>
                </div>
            </div>

            {/* Tickets List */}
            {isLoading ? (
                <SkeletonTable rows={8} columns={6} />
            ) : filteredTickets.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-12 text-center shadow-xl">
                    <LifeBuoy size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">אין קריאות תמיכה</h3>
                    <p className="text-sm text-slate-600">כאשר משתמשים יפתחו קריאות תמיכה, הן יופיעו כאן</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredTickets.map((ticket) => {
                        const statusConfig = getStatusConfig(ticket.status);
                        const categoryConfig = getCategoryConfig(ticket.category);
                        
                        return (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 hover:border-slate-300/80 hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedTicket(ticket);
                                    setIsDetailModalOpen(true);
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${String((statusConfig as any)?.color ?? '').split(' ')[0].replace(/\/\d+/, '')}`} />
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 font-mono">{ticket.ticket_number}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusConfig.color}`}>
                                                    <statusConfig.icon size={10} className="inline mr-1" />
                                                    {statusConfig.label}
                                                </span>
                                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${categoryConfig.color}`}>
                                                    {categoryConfig.label}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900">{ticket.subject}</h3>
                                        <p className="text-sm text-slate-600 line-clamp-2">{ticket.message}</p>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {new Date(ticket.created_at).toLocaleDateString('he-IL')}
                                            </div>
                                            {ticket.assigned_to && (
                                                <div className="flex items-center gap-1">
                                                    <User size={12} />
                                                    מוקצה
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTicket(ticket);
                                                setIsDetailModalOpen(true);
                                            }}
                                            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-slate-200"
                                            title="פרטים"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Detail Modal */}
            {isDetailModalOpen && selectedTicket && (
                <TicketDetailModal
                    ticket={selectedTicket}
                    onClose={() => {
                        setIsDetailModalOpen(false);
                        setSelectedTicket(null);
                    }}
                    onStatusChange={handleStatusChange}
                    onAddResponse={handleAddResponse}
                    updatingStatus={updatingStatus}
                />
            )}
        </motion.div>
    );
};

// Ticket Detail Modal Component
interface TicketDetailModalProps {
    ticket: SupportTicket;
    onClose: () => void;
    onStatusChange: (ticketId: string, status: string) => void;
    onAddResponse: (ticketId: string, response: string) => void;
    updatingStatus: string | null;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
    ticket,
    onClose,
    onStatusChange,
    onAddResponse,
    updatingStatus
}) => {
    const [responseText, setResponseText] = useState(ticket.admin_response || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmitResponse = async () => {
        if (!responseText.trim()) return;
        setIsSubmitting(true);
        await onAddResponse(ticket.id, responseText);
        setIsSubmitting(false);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'open': return { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', label: 'פתוח' };
            case 'in_progress': return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', label: 'בטיפול' };
            case 'resolved': return { color: 'bg-green-500/10 text-green-700 border-green-500/20', label: 'נפתר' };
            case 'closed': return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', label: 'סגור' };
            default: return { color: 'bg-slate-500/10 text-slate-700 border-slate-300/60', label: status };
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white/90 backdrop-blur-2xl border border-slate-200/70 rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
            >
                <div className="p-6 border-b border-slate-200/70 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-bold text-slate-500 font-mono">{ticket.ticket_number}</span>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold border ${getStatusConfig(ticket.status).color}`}>
                                {getStatusConfig(ticket.status).label}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black text-slate-900">{ticket.subject}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Ticket Info */}
                    <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/70">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">קטגוריה</p>
                                <p className="text-slate-900 font-bold">{ticket.category}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">עדיפות</p>
                                <p className="text-slate-900 font-bold">{ticket.priority}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-1">נוצר</p>
                                <p className="text-slate-900">{new Date(ticket.created_at).toLocaleString('he-IL')}</p>
                            </div>
                            {ticket.resolved_at && (
                                <div>
                                    <p className="text-xs font-bold text-slate-600 uppercase mb-1">נפתר</p>
                                    <p className="text-slate-900">{new Date(ticket.resolved_at).toLocaleString('he-IL')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Message */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">הודעה</p>
                        <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/70">
                            <p className="text-slate-900 whitespace-pre-wrap">{ticket.message}</p>
                        </div>
                    </div>

                    {/* Admin Response */}
                    {ticket.admin_response && (
                        <div>
                            <p className="text-xs font-bold text-slate-600 uppercase mb-2">תגובת אדמין</p>
                            <div className="bg-indigo-50/80 backdrop-blur-sm rounded-xl p-4 border border-indigo-200/70">
                                <p className="text-slate-900 whitespace-pre-wrap">{ticket.admin_response}</p>
                            </div>
                        </div>
                    )}

                    {/* Status Change */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">שינוי סטטוס</p>
                        <div className="flex gap-2 flex-wrap">
                            {['open', 'in_progress', 'resolved', 'closed'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => onStatusChange(ticket.id, status)}
                                    disabled={updatingStatus === ticket.id || ticket.status === status}
                                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                                        ticket.status === status
                                            ? 'bg-indigo-600 text-white border-indigo-500'
                                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {status === 'open' ? 'פתוח' :
                                     status === 'in_progress' ? 'בטיפול' :
                                     status === 'resolved' ? 'נפתר' : 'סגור'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Add Response */}
                    <div>
                        <p className="text-xs font-bold text-slate-600 uppercase mb-2">הוסף תגובה</p>
                        <textarea
                            value={responseText}
                            onChange={(e) => setResponseText(e.target.value)}
                            placeholder="כתוב תגובה למשתמש..."
                            className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all min-h-[120px] resize-none"
                        />
                        <button
                            onClick={handleSubmitResponse}
                            disabled={isSubmitting || !responseText.trim()}
                            className="mt-3 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'שולח...' : 'שלח תגובה'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
