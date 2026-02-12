'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LifeBuoy, Clock, CheckCircle2, XCircle, AlertCircle, Search, Filter, User, Mail, Calendar, MessageSquare, RefreshCw, Eye, Edit2, AlertTriangle } from 'lucide-react';
import { SupportTicket, SupportTicketEvent } from '@/types';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { SkeletonTable } from '@/components/ui/skeletons';
import { Button } from '@/components/ui/button';
import { extractData, extractError } from '@/lib/shared/api-types';

interface SupportTicketsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideHeader?: boolean;
}

export const SupportTicketsPanel: React.FC<SupportTicketsPanelProps> = ({ addToast, hideHeader }) => {
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

    const markTicketAsRead = async (ticketId: string) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify({ read_at: true })
            });
        } catch {
            // best effort
        }
    };

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            const url = statusFilter !== 'all' 
                ? `/api/support?status=${statusFilter}`
                : '/api/support';

            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(url, {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה בטעינת דיווחי תקלות');
            }
            const data = await response.json().catch(() => ({}));
            const payload = extractData<{ tickets?: SupportTicket[] }>(data);
            setTickets(payload?.tickets || []);
        } catch (err: unknown) {
            console.error('[SupportTicketsPanel] Error loading tickets:', err);
            const message = err instanceof Error ? err.message : 'שגיאה בטעינת דיווחי תקלות';
            addToast(message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (ticketId: string, newStatus: string) => {
        setUpdatingStatus(ticketId);
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה בעדכון סטטוס');
            }

            await loadTickets();
            addToast('סטטוס עודכן בהצלחה', 'success');
            
            if (selectedTicket?.id === ticketId) {
                const updated = await fetch(`/api/support?id=${ticketId}`, {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                }).then(r => r.json()).catch(() => ({}));
                const updatedTicket = extractData<SupportTicket>(updated);
                if (updatedTicket) setSelectedTicket(updatedTicket);
            }
        } catch (err: unknown) {
            console.error('[SupportTicketsPanel] Error updating status:', err);
            const message = err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס';
            addToast(message, 'error');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleAddResponse = async (ticketId: string, response: string, sendEmail: boolean) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const res = await fetch(`/api/support/${ticketId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify({ comment: response, send_email: sendEmail })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה בהוספת עדכון');
            }

            await loadTickets();
            addToast(sendEmail ? 'עדכון נשלח במייל' : 'עדכון נוסף בהצלחה', 'success');
            
            if (selectedTicket?.id === ticketId) {
                const updated = await fetch(`/api/support?id=${ticketId}`, {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
                }).then(r => r.json()).catch(() => ({}));
                const updatedTicket = extractData<SupportTicket>(updated);
                if (updatedTicket) setSelectedTicket(updatedTicket);
            }
        } catch (err: unknown) {
            console.error('[SupportTicketsPanel] Error adding response:', err);
            const message = err instanceof Error ? err.message : 'שגיאה בהוספת תגובה';
            addToast(message, 'error');
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
            case 'waiting_for_customer': return { color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20', icon: Mail, label: 'ממתין ללקוח' };
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
        waiting: tickets.filter(t => t.status === 'waiting_for_customer').length,
        resolved: tickets.filter(t => t.status === 'resolved').length,
    };

    const statusRank = (s: string) => {
        if (s === 'open') return 0;
        if (s === 'in_progress') return 1;
        if (s === 'waiting_for_customer') return 2;
        if (s === 'resolved') return 3;
        if (s === 'closed') return 4;
        return 9;
    };

    const sortedTickets = [...filteredTickets].sort((a, b) => {
        const r = statusRank(a.status) - statusRank(b.status);
        if (r !== 0) return r;

        const ad = a.sla_deadline ? new Date(a.sla_deadline) : null;
        const bd = b.sla_deadline ? new Date(b.sla_deadline) : null;
        const at = ad && !Number.isNaN(ad.getTime()) ? ad.getTime() : Number.POSITIVE_INFINITY;
        const bt = bd && !Number.isNaN(bd.getTime()) ? bd.getTime() : Number.POSITIVE_INFINITY;
        return at - bt;
    });

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            {!hideHeader ? (
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight mb-2 bg-gradient-to-r from-slate-900 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                        ניהול דיווחי תקלות
                    </h1>
                    <p className="text-slate-600 text-base md:text-lg">כל הדיווחים במקום אחד. תעדכן סטטוס, תגיב, תסגור.</p>
                </div>
            ) : null}

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
                            <p className="text-xs font-bold text-slate-600 uppercase">ממתין ללקוח</p>
                            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.waiting}</h3>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl border border-indigo-500/20 backdrop-blur-sm">
                            <Mail size={20} />
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
                    <div className="flex flex-wrap gap-2">
                        {['all', 'open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'].map((status) => (
                            <Button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                type="button"
                                variant="outline"
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                                    statusFilter === status
                                        ? 'bg-indigo-600 text-white border-indigo-500'
                                        : 'bg-white/80 text-slate-700 border-slate-200 hover:bg-slate-50'
                                } whitespace-nowrap`}
                            >
                                {status === 'all' ? 'הכל' : 
                                 status === 'open' ? 'פתוחות' :
                                 status === 'in_progress' ? 'בטיפול' :
                                 status === 'waiting_for_customer' ? 'ממתין ללקוח' :
                                 status === 'resolved' ? 'נפתרו' : 'סגורות'}
                            </Button>
                        ))}
                    </div>
                    <Button
                        onClick={loadTickets}
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

            {/* Tickets List */}
            {isLoading ? (
                <SkeletonTable rows={8} columns={6} />
            ) : filteredTickets.length === 0 ? (
                <div className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-12 text-center shadow-xl">
                    <LifeBuoy size={48} className="mx-auto text-slate-400 mb-4" />
                    <h3 className="text-lg font-bold text-slate-900 mb-2">אין דיווחים</h3>
                    <p className="text-sm text-slate-600">כאשר משתמשים ידווחו על תקלות, הן יופיעו כאן</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedTickets.map((ticket) => {
                        const statusConfig = getStatusConfig(ticket.status);
                        const categoryConfig = getCategoryConfig(ticket.category);

                        const sla = (() => {
                            const deadline = ticket.sla_deadline ? new Date(ticket.sla_deadline) : null;
                            const createdAt = new Date(ticket.created_at);
                            const resolvedAt = ticket.resolved_at ? new Date(ticket.resolved_at) : (ticket.closed_at ? new Date(ticket.closed_at) : null);
                            if (!deadline || Number.isNaN(deadline.getTime())) return null;

                            if (!createdAt || Number.isNaN(createdAt.getTime())) return null;

                            const totalMs = deadline.getTime() - createdAt.getTime();
                            if (!Number.isFinite(totalMs) || totalMs <= 0) return null;

                            const now = new Date();
                            const effective = resolvedAt && !Number.isNaN(resolvedAt.getTime()) ? resolvedAt : now;
                            const msLeft = deadline.getTime() - effective.getTime();

                            if (msLeft < 0) {
                                return {
                                    label: 'SLA איחור',
                                    className: 'bg-rose-100 text-rose-800 border-rose-300',
                                    icon: AlertTriangle,
                                };
                            }

                            const ratioLeft = msLeft / totalMs;
                            if (ratioLeft < 0.2) {
                                return { label: 'SLA קרוב', className: 'bg-amber-50 text-amber-800 border-amber-200' };
                            }
                            if (ratioLeft > 0.5) {
                                return { label: 'SLA בזמן', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
                            }
                            return { label: 'SLA', className: 'bg-slate-100 text-slate-700 border-slate-200' };
                        })();
                        
                        return (
                            <motion.div
                                key={ticket.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/70 backdrop-blur-2xl border border-slate-200/70 rounded-2xl p-6 hover:border-slate-300/80 hover:shadow-xl transition-all cursor-pointer"
                                onClick={() => {
                                    setSelectedTicket(ticket);
                                    setIsDetailModalOpen(true);
                                    markTicketAsRead(ticket.id);
                                }}
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${statusConfig.color.split(' ')[0].replace(/\/\d+/, '')}`} />
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-500 font-mono">{ticket.ticket_number}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full font-bold border ${statusConfig.color}`}>
                                                    <statusConfig.icon size={10} className="inline mr-1" />
                                                    {statusConfig.label}
                                                </span>
                                                {sla ? (
                                                    <span className={`text-xs px-2 py-1 rounded-full font-bold border ${sla.className}`}>
                                                        {sla.icon ? <sla.icon size={10} className="inline mr-1" /> : null}
                                                        {sla.label}
                                                    </span>
                                                ) : null}
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
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedTicket(ticket);
                                                setIsDetailModalOpen(true);
                                            }}
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-10 w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all backdrop-blur-sm border border-transparent hover:border-slate-200"
                                            title="פרטים"
                                        >
                                            <Eye size={18} />
                                        </Button>
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
    onAddResponse: (ticketId: string, response: string, sendEmail: boolean) => void;
    updatingStatus: string | null;
}

const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
    ticket,
    onClose,
    onStatusChange,
    onAddResponse,
    updatingStatus
}) => {
    const [responseText, setResponseText] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sendEmail, setSendEmail] = useState(true);
    const [events, setEvents] = useState<SupportTicketEvent[]>([]);
    const [eventsLoading, setEventsLoading] = useState(true);
    const [eventsReloadNonce, setEventsReloadNonce] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setEventsLoading(true);
            try {
                const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
                const res = await fetch(`/api/support/${ticket.id}/events`, {
                    headers: orgSlug ? { 'x-org-id': orgSlug } : undefined,
                });
                const raw = await res.json().catch(() => ({}));
                const payload = extractData<{ events?: SupportTicketEvent[] }>(raw);
                const rows = payload?.events || [];
                if (!cancelled) setEvents(rows);
            } catch {
                if (!cancelled) setEvents([]);
            } finally {
                if (!cancelled) setEventsLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [ticket.id, eventsReloadNonce]);

    const formatStatusHe = (s: string) => {
        if (s === 'open') return 'פתוח';
        if (s === 'in_progress') return 'בטיפול';
        if (s === 'resolved') return 'נפתר';
        if (s === 'closed') return 'סגור';
        return s;
    };

    const renderEventLine = (ev: SupportTicketEvent) => {
        const action = ev.action || 'updated';
        const md = ev.metadata || {};
        const actor = (md.actor_name && typeof md.actor_name === 'string') ? md.actor_name : 'System';
        const createdAt = new Date(ev.created_at);
        const when = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString('he-IL') : '';

        if (action === 'COMMENT') {
            const role = (md.role && typeof md.role === 'string') ? md.role.toLowerCase() : '';
            const roleHe = role === 'admin' ? 'צוות' : role === 'customer' ? 'מדווח' : 'משתמש';
            return { title: `${roleHe}: ${actor}`, subtitle: when, content: ev.content || '' };
        }

        if (action === 'created') return { title: `${actor} פתח קריאה`, subtitle: when };
        if (action === 'status_changed') {
            const from = formatStatusHe((md.from && typeof md.from === 'string') ? md.from : '');
            const to = formatStatusHe((md.to && typeof md.to === 'string') ? md.to : '');
            return { title: `${actor} שינה סטטוס`, subtitle: `${from} → ${to}${when ? ` · ${when}` : ''}` };
        }
        if (action === 'admin_replied') return { title: `${actor} השיב`, subtitle: when };
        if (action === 'marked_read') return { title: `${actor} סימן כנקרא`, subtitle: when };
        return { title: `${actor} עדכן`, subtitle: when };
    };

    const handleSubmitResponse = async () => {
        if (!responseText.trim()) return;
        setIsSubmitting(true);
        await onAddResponse(ticket.id, responseText, sendEmail);
        setIsSubmitting(false);
        setResponseText('');
        setEventsReloadNonce((x) => x + 1);
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'open': return { color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', label: 'פתוח' };
            case 'in_progress': return { color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', label: 'בטיפול' };
            case 'waiting_for_customer': return { color: 'bg-indigo-500/10 text-indigo-700 border-indigo-500/20', label: 'ממתין ללקוח' };
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
                    <Button
                        onClick={onClose}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <XCircle size={20} />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        <div className="lg:col-span-8 space-y-6">
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
                                        <p className="text-xs font-bold text-slate-600 uppercase mb-1">SLA יעד</p>
                                        <p className="text-slate-900">{ticket.sla_deadline ? new Date(ticket.sla_deadline).toLocaleString('he-IL') : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-600 uppercase mb-1">תגובה ראשונה</p>
                                        <p className="text-slate-900">{ticket.first_response_at ? new Date(ticket.first_response_at).toLocaleString('he-IL') : '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-600 uppercase mb-1">נוצר</p>
                                        <p className="text-slate-900">{new Date(ticket.created_at).toLocaleString('he-IL')}</p>
                                    </div>
                                    {'resolution_time_minutes' in ticket && ticket.resolution_time_minutes != null ? (
                                        <div>
                                            <p className="text-xs font-bold text-slate-600 uppercase mb-1">זמן לפתרון</p>
                                            <p className="text-slate-900">{Number(ticket.resolution_time_minutes).toLocaleString()} דקות</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* Message */}
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-2">הודעה</p>
                                <div className="bg-slate-50/80 backdrop-blur-sm rounded-xl p-4 border border-slate-200/70">
                                    <p className="text-slate-900 whitespace-pre-wrap">{ticket.message}</p>
                                </div>
                            </div>

                            {/* Status Change */}
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-2">שינוי סטטוס</p>
                                <div className="flex gap-2 flex-wrap">
                                    {['open', 'in_progress', 'waiting_for_customer', 'resolved', 'closed'].map((status) => (
                                        <Button
                                            key={status}
                                            onClick={() => onStatusChange(ticket.id, status)}
                                            disabled={updatingStatus === ticket.id || ticket.status === status}
                                            type="button"
                                            variant="outline"
                                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
                                                ticket.status === status
                                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                            }`}
                                        >
                                            {status === 'open' ? 'פתוח' :
                                             status === 'in_progress' ? 'בטיפול' :
                                             status === 'waiting_for_customer' ? 'ממתין ללקוח' :
                                             status === 'resolved' ? 'נפתר' : 'סגור'}
                                        </Button>
                                    ))}
                                </div>
                            </div>

                            {/* Add Update */}
                            <div>
                                <p className="text-xs font-bold text-slate-600 uppercase mb-2">הוסף עדכון</p>
                                <textarea
                                    value={responseText}
                                    onChange={(e) => setResponseText(e.target.value)}
                                    placeholder="כתוב עדכון מסודר לתיק התקלה..."
                                    className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 focus:outline-none transition-all min-h-[120px] resize-none"
                                />
                                <label className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    שלח עדכון במייל
                                </label>
                                <Button
                                    onClick={handleSubmitResponse}
                                    disabled={isSubmitting || !responseText.trim()}
                                    type="button"
                                    className="mt-3 px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'שולח...' : 'שלח עדכון'}
                                </Button>
                            </div>
                        </div>

                        <div className="lg:col-span-4">
                            <div className="rounded-2xl border border-slate-200/70 bg-white/70 backdrop-blur-xl p-4 sticky top-0">
                                <div className="text-xs font-black text-slate-600 uppercase tracking-widest">Timeline</div>
                                <div className="mt-3 space-y-3">
                                    {eventsLoading ? (
                                        <div className="text-sm font-bold text-slate-500">טוען היסטוריה…</div>
                                    ) : events.length ? (
                                        events.map((ev) => {
                                            const line = renderEventLine(ev);
                                            const ts = ev?.created_at ? new Date(String(ev.created_at)) : null;
                                            const dotClass = String(ev?.action || '') === 'status_changed'
                                                ? 'bg-indigo-600'
                                                : String(ev?.action || '') === 'admin_replied'
                                                    ? 'bg-emerald-600'
                                                    : 'bg-slate-400';

                                            return (
                                                <div key={String(ev?.id || Math.random())} className="flex items-start gap-3">
                                                    <div className="mt-1.5 w-2.5 h-2.5 rounded-full border border-white shadow-sm" style={{ background: dotClass }} />
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-black text-slate-900 leading-snug">{line.title}</div>
                                                        <div className="mt-1 text-xs font-bold text-slate-500">{line.subtitle}</div>
                                                        {line.content ? (
                                                            <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 whitespace-pre-wrap">
                                                                {line.content}
                                                            </div>
                                                        ) : null}
                                                        {ts ? (
                                                            <div className="mt-1 text-[11px] font-bold text-slate-400">{ts.toLocaleString('he-IL')}</div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-sm font-bold text-slate-500">אין אירועים עדיין.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
