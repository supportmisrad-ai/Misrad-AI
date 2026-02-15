'use client';

/**
 * Team Events Panel
 * 
 * Panel for managing team events (training, fun days, group meetings, enrichment)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, RefreshCw, Users, MapPin, Clock, X, Check, AlertCircle, Edit2, Trash2, Filter, CheckCircle, XCircle, Eye } from 'lucide-react';
import { TeamEvent, TeamEventType, TeamEventStatus, EventAttendance, AttendanceStatus, User } from '../../../types';
import { EventRequestModal } from './EventRequestModal';
import { formatHebrewDate } from '../../../lib/hebrew-calendar';
import { CustomSelect } from '../../CustomSelect';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Skeleton } from '@/components/ui/skeletons';
import { isTenantAdminRole } from '@/lib/constants/roles';
import { extractData, extractError } from '@/lib/shared/api-types';

let showHebrewDatesPreference = false;

interface TeamEventsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    currentUser?: { id: string; name: string; role: string; isSuperAdmin?: boolean };
    users?: Array<{ id: string; name: string; email?: string }>;
}

export const TeamEventsPanel: React.FC<TeamEventsPanelProps> = ({ addToast, currentUser, users = [] }) => {
    const [events, setEvents] = useState<TeamEvent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<TeamEvent | null>(null);
    const [filterType, setFilterType] = useState<TeamEventType | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<TeamEventStatus | 'all'>('all');
    const [attendanceMap, setAttendanceMap] = useState<Record<string, EventAttendance[]>>({});
    const [viewingAttendance, setViewingAttendance] = useState<string | null>(null);
    const [showHebrewDates, setShowHebrewDates] = useState(() => showHebrewDatesPreference);

    useEffect(() => {
        showHebrewDatesPreference = showHebrewDates;
    }, [showHebrewDates]);

    const loadEvents = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('event_type', String(filterType));
            if (filterStatus !== 'all') params.append('status', String(filterStatus));
            
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/team-events?${params.toString()}`, {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || `Failed to load events (${response.status})`);
            }
            const data = await response.json().catch(() => ({}));
            const payload = extractData<{ events?: TeamEvent[] }>(data);
            const next = Array.isArray(payload?.events) ? payload.events : [];
            setEvents(next);
        } catch (error: unknown) {
            console.error('[TeamEvents] Error loading events:', error);
            addToast(error instanceof Error ? error.message : 'שגיאה בטעינת אירועים', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [filterType, filterStatus]);

    // Load RSVP status for current user when events change
    useEffect(() => {
        if (events.length > 0 && currentUser) {
            events.forEach(event => {
                const isInvited = 
                    (event.requiredAttendees?.includes(currentUser.id) || 
                     event.optionalAttendees?.includes(currentUser.id));
                if (isInvited) {
                    loadAttendance(event.id);
                }
            });
        }
    }, [events, currentUser]);

    // Load attendance for events
    const loadAttendance = async (eventId: string) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/team-events/${eventId}/attendance`, {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            if (response.ok) {
                const data = await response.json().catch(() => ({}));
                const payload = extractData<{ attendance?: EventAttendance[] }>(data);
                setAttendanceMap(prev => ({ ...prev, [eventId]: payload?.attendance || [] }));
            }
        } catch (error) {
            console.error('[TeamEvents] Error loading attendance:', error);
        }
    };

    // Handle RSVP
    const handleRSVP = async (eventId: string, status: 'attending' | 'not_attending') => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/team-events/${eventId}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ status })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה בשמירת אישור הגעה');
            }

            addToast(status === 'attending' ? 'אישור הגעה נשמר' : 'אישור אי-הגעה נשמר', 'success');
            // Reload attendance to update UI
            loadAttendance(eventId);
            // Reload events to refresh the list
            loadEvents();
        } catch (error: unknown) {
            addToast(error instanceof Error ? error.message : 'שגיאה בשמירת אישור הגעה', 'error');
        }
    };

    const handleDelete = async (eventId: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את האירוע?')) return;

        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/team-events/${eventId}`, {
                method: 'DELETE',
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה במחיקת אירוע');
            }

            addToast('אירוע נמחק בהצלחה', 'success');
            loadEvents();
        } catch (error: unknown) {
            addToast(error instanceof Error ? error.message : 'שגיאה במחיקת אירוע', 'error');
        }
    };

    const handleApprove = async (eventId: string) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/team-events/${eventId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ requiresApproval: false, approvedBy: currentUser?.id }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'שגיאה באישור אירוע');
            }

            addToast('אירוע אושר בהצלחה', 'success');
            loadEvents();
        } catch (error: unknown) {
            addToast(error instanceof Error ? error.message : 'שגיאה באישור אירוע', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const gregorian = date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        if (showHebrewDates) {
            const hebrew = formatHebrewDate(date, { includeYear: true, shortFormat: true });
            return `${gregorian} (${hebrew})`;
        }
        
        return gregorian;
    };

    const getEventTypeLabel = (type: TeamEventType) => {
        const labels: Record<TeamEventType, string> = {
            training: 'הדרכה',
            fun_day: 'יום כיף',
            group_meeting: 'פגישה קבוצתית',
            enrichment: 'העשרה',
            company_event: 'אירוע חברה',
            other: 'אחר'
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status: TeamEventStatus) => {
        const labels: Record<TeamEventStatus, string> = {
            draft: 'טיוטה',
            scheduled: 'מתוכנן',
            in_progress: 'בתהליך',
            completed: 'הושלם',
            cancelled: 'בוטל'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: TeamEventStatus) => {
        const colors: Record<TeamEventStatus, string> = {
            draft: 'bg-gray-100 text-gray-700',
            scheduled: 'bg-blue-100 text-blue-700',
            in_progress: 'bg-yellow-100 text-yellow-700',
            completed: 'bg-green-100 text-green-700',
            cancelled: 'bg-red-100 text-red-700'
        };
        return colors[status] || colors.draft;
    };

    const stats = {
        total: events.length,
        scheduled: events.filter(e => e.status === 'scheduled').length,
        completed: events.filter(e => e.status === 'completed').length,
        pending: events.filter(e => e.status === 'draft' || e.requiresApproval).length
    };

    const isAdmin = currentUser?.isSuperAdmin || isTenantAdminRole(currentUser?.role);

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">אירועי צוות</h1>
                <p className="text-sm text-gray-500">נהל פגישות העשרה, ימי כיף, הדרכות, אירועי חברה ופגישות קבוצתיות</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">סה"כ אירועים</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Calendar size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">מתוכננים</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.scheduled}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">הושלמו</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.completed}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Check size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">ממתינים</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pending}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
                            <AlertCircle size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">אירועים</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={loadEvents}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-50"
                            title="רענן"
                        >
                            {isLoading ? <Skeleton className="w-[18px] h-[18px] rounded-full" /> : <RefreshCw size={18} />}
                        </button>
                        <button
                            onClick={() => {
                                setEditingEvent(null);
                                setIsModalOpen(true);
                            }}
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            צור אירוע חדש
                        </button>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-500">סינון:</span>
                    </div>
                    <button
                        onClick={() => setShowHebrewDates(!showHebrewDates)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                            showHebrewDates 
                            ? 'bg-purple-50 text-purple-600 border-purple-100' 
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {showHebrewDates ? '✓' : ''} תאריכים עבריים
                    </button>
                    <CustomSelect
                        value={filterType}
                        onChange={(val) => setFilterType(val as TeamEventType | 'all')}
                        options={[
                            { value: 'all', label: 'כל הסוגים' },
                            { value: 'training', label: 'הדרכה' },
                            { value: 'fun_day', label: 'יום כיף' },
                            { value: 'group_meeting', label: 'פגישה קבוצתית' },
                            { value: 'enrichment', label: 'העשרה' },
                            { value: 'company_event', label: 'אירוע חברה' },
                            { value: 'other', label: 'אחר' }
                        ]}
                        className="w-40"
                    />
                    <CustomSelect
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val as TeamEventStatus | 'all')}
                        options={[
                            { value: 'all', label: 'כל הסטטוסים' },
                            { value: 'draft', label: 'טיוטה' },
                            { value: 'scheduled', label: 'מתוכנן' },
                            { value: 'in_progress', label: 'בתהליך' },
                            { value: 'completed', label: 'הושלם' },
                            { value: 'cancelled', label: 'בוטל' }
                        ]}
                        className="w-40"
                    />
                </div>
            </div>

            {/* Events List */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, idx) => (
                        <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-56 rounded-xl" />
                                    <Skeleton className="h-4 w-72 rounded-lg" />
                                </div>
                                <Skeleton className="h-6 w-24 rounded-full" />
                            </div>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-9 w-28 rounded-xl" />
                                <Skeleton className="h-9 w-28 rounded-xl" />
                                <Skeleton className="h-9 w-28 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">אין אירועים</h3>
                    <p className="text-sm text-gray-500 mb-4">צור אירוע ראשון לצוות</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                    >
                        צור אירוע חדש
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {events.map((event) => (
                        <motion.div
                            key={event.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(event.status)}`}>
                                            {getStatusLabel(event.status)}
                                        </span>
                                        <span className="text-xs px-2 py-1 rounded-full font-bold bg-purple-100 text-purple-700">
                                            {getEventTypeLabel(event.eventType)}
                                        </span>
                                        {event.requiresApproval && !event.approvedBy && (
                                            <span className="text-xs px-2 py-1 rounded-full font-bold bg-yellow-100 text-yellow-700">
                                                דורש אישור
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                                        {event.description && (
                                            <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                                        )}
                                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                {formatDate(event.startDate)}
                                                {!event.allDay && ` - ${formatDate(event.endDate)}`}
                                            </div>
                                            {event.location && (
                                                <div className="flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {event.location}
                                                </div>
                                            )}
                                            {(event.requiredAttendees?.length || 0) > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <Users size={14} />
                                                    {event.requiredAttendees?.length} משתתפים נדרשים
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* RSVP Section - for invited users */}
                                    {currentUser && (
                                        (event.requiredAttendees?.includes(currentUser.id) || 
                                         event.optionalAttendees?.includes(currentUser.id)) && (() => {
                                            const myAttendance = attendanceMap[event.id]?.find((a: EventAttendance) => 
                                                a.userId === currentUser.id
                                            );
                                            const myStatus = myAttendance?.status;
                                            
                                            return (
                                                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                                                    <span className="text-xs text-gray-500">אישור הגעה:</span>
                                                    {myStatus === 'attending' ? (
                                                        <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                            <CheckCircle size={14} />
                                                            אני מגיע
                                                        </span>
                                                    ) : myStatus === 'not_attending' ? (
                                                        <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold flex items-center gap-1">
                                                            <XCircle size={14} />
                                                            אני לא מגיע
                                                        </span>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleRSVP(event.id, 'attending')}
                                                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <CheckCircle size={14} />
                                                                אני מגיע
                                                            </button>
                                                            <button
                                                                onClick={() => handleRSVP(event.id, 'not_attending')}
                                                                className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <XCircle size={14} />
                                                                אני לא מגיע
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    )}

                                    {/* Attendance List - for organizer */}
                                    {(isAdmin || event.organizerId === currentUser?.id) && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <button
                                                onClick={() => {
                                                    if (viewingAttendance === event.id) {
                                                        setViewingAttendance(null);
                                                    } else {
                                                        setViewingAttendance(event.id);
                                                        loadAttendance(event.id);
                                                    }
                                                }}
                                                className="text-xs text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                                            >
                                                <Eye size={14} />
                                                {viewingAttendance === event.id ? 'הסתר' : 'הצג'} רשימת משתתפים
                                            </button>
                                            {viewingAttendance === event.id && attendanceMap[event.id] && (
                                                <div className="mt-2 space-y-1">
                                                    {attendanceMap[event.id].map((att: EventAttendance) => {
                                                        const attUser = users.find((u: { id: string; name: string }) => u.id === att.userId);
                                                        const userName = attUser?.name || `משתמש ${(att.userId || '').slice(0, 8)}...`;
                                                        return (
                                                            <div key={att.id} className="flex items-center justify-between text-xs p-2 bg-gray-50 rounded-lg">
                                                                <span className="text-gray-700">{userName}</span>
                                                                <span className={`px-2 py-0.5 rounded-full ${
                                                                    att.status === 'attending' ? 'bg-green-100 text-green-700' :
                                                                    att.status === 'not_attending' ? 'bg-red-100 text-red-700' :
                                                                    att.status === 'attended' ? 'bg-blue-100 text-blue-700' :
                                                                    att.status === 'absent' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-gray-100 text-gray-700'
                                                                }`}>
                                                                    {att.status === 'attending' ? 'מגיע' :
                                                                     att.status === 'not_attending' ? 'לא מגיע' :
                                                                     att.status === 'attended' ? 'הגיע' :
                                                                     att.status === 'absent' ? 'נעדר' : 'הוזמן'}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                    {attendanceMap[event.id].length === 0 && (
                                                        <div className="text-xs text-gray-400 p-2">אין משתתפים רשומים</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isAdmin && event.requiresApproval && !event.approvedBy && (
                                        <button
                                            onClick={() => handleApprove(event.id)}
                                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                                            title="אשר אירוע"
                                        >
                                            <Check size={18} />
                                        </button>
                                    )}
                                    {(isAdmin || event.organizerId === currentUser?.id) && (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setEditingEvent(event);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                                                title="ערוך"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(event.id)}
                                                className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                                title="מחק"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <EventRequestModal
                        event={editingEvent}
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingEvent(null);
                        }}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            setEditingEvent(null);
                            loadEvents();
                            addToast(editingEvent ? 'אירוע עודכן בהצלחה' : 'אירוע נוצר בהצלחה', 'success');
                        }}
                        addToast={addToast}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
