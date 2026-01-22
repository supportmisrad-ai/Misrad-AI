'use client';

/**
 * Leave Requests Panel
 * 
 * Panel for managing employee leave requests (vacations, sick days, etc.)
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, RefreshCw, User, Clock, X, Check, AlertCircle, Edit2, Trash2, Filter, Ban, MessageCircle } from 'lucide-react';
import { LeaveRequest, LeaveRequestType, LeaveRequestStatus } from '../../../types';
import { LeaveRequestModal } from './LeaveRequestModal';
import { formatHebrewDate } from '../../../lib/hebrew-calendar';
import { CustomSelect } from '../../CustomSelect';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';

let leaveRequestsCache: LeaveRequest[] = [];
let showHebrewDatesPreference = false;

interface LeaveRequestsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    currentUser?: { id: string; name: string; role: string; isSuperAdmin?: boolean };
    users?: Array<{ id: string; name: string; email?: string }>;
}

export const LeaveRequestsPanel: React.FC<LeaveRequestsPanelProps> = ({ addToast, currentUser, users = [] }) => {
    const [requests, setRequests] = useState<LeaveRequest[]>(() => leaveRequestsCache);
    const [cachedRequests, setCachedRequests] = useState<LeaveRequest[]>(() => leaveRequestsCache);
    const [isLoading, setIsLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<LeaveRequest | null>(null);
    const [filterType, setFilterType] = useState<LeaveRequestType | 'all'>('all');
    const [filterStatus, setFilterStatus] = useState<LeaveRequestStatus | 'all'>('all');
    const [filterEmployee, setFilterEmployee] = useState<string>('all');
    const [showHebrewDates, setShowHebrewDates] = useState(() => showHebrewDatesPreference);

    useEffect(() => {
        showHebrewDatesPreference = showHebrewDates;
    }, [showHebrewDates]);

    const loadRequests = async (skipDebounce = false) => {
        if (!skipDebounce && isLoading) return; // Prevent concurrent requests
        
        // Show cached data immediately if available and no filters applied
        if (cachedRequests.length > 0 && filterType === 'all' && filterStatus === 'all' && filterEmployee === 'all') {
            setRequests(cachedRequests);
        }
        
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filterType !== 'all') params.append('leave_type', String(filterType));
            if (filterStatus !== 'all') params.append('status', String(filterStatus));
            if (filterEmployee !== 'all') params.append('employee_id', String(filterEmployee));
            
            const startTime = performance.now();
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests?${params.toString()}`, {
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });
            const loadTime = performance.now() - startTime;
            console.log(`[LeaveRequests] Load time: ${loadTime.toFixed(2)}ms`);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `Failed to load requests (${response.status})`);
            }
            const data = await response.json();
            const newRequests = data.requests || [];
            console.log('[LeaveRequests] Loaded requests:', newRequests.length, 'Urgent:', newRequests.filter((r: any) => r.metadata?.isUrgent).length);
            setRequests(newRequests);
            
            // Update cache only if no filters (full list)
            if (filterType === 'all' && filterStatus === 'all' && filterEmployee === 'all') {
                setCachedRequests(newRequests);
                leaveRequestsCache = newRequests;
            }
        } catch (error: any) {
            console.error('[LeaveRequests] Error loading requests:', error);
            // Keep cached data on error
            if (requests.length === 0 && cachedRequests.length > 0) {
                setRequests(cachedRequests);
            }
            addToast(error.message || 'שגיאה בטעינת בקשות חופש', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Load immediately on mount
        loadRequests(true);
    }, []); // Load once on mount

    useEffect(() => {
        // Debounce to avoid too many requests when filters change
        const timeoutId = setTimeout(() => {
            loadRequests(true);
        }, 200); // Reduced to 200ms for better responsiveness

        return () => clearTimeout(timeoutId);
    }, [filterType, filterStatus, filterEmployee]);

    const handleDelete = async (requestId: string) => {
        if (!confirm('האם אתה בטוח שברצונך למחוק את בקשת החופש?')) return;

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'DELETE',
                headers: orgId ? { 'x-org-id': orgId } : undefined
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה במחיקת בקשת חופש');
            }

            addToast('בקשת חופש נמחקה בהצלחה', 'success');
            loadRequests(true);
        } catch (error: any) {
            addToast(error.message || 'שגיאה במחיקת בקשת חופש', 'error');
        }
    };

    const handleApprove = async (requestId: string) => {
        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
                body: JSON.stringify({ status: 'approved' }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה באישור בקשת חופש');
            }

            addToast('בקשת חופש אושרה בהצלחה', 'success');
            loadRequests(true);
        } catch (error: any) {
            addToast(error.message || 'שגיאה באישור בקשת חופש', 'error');
        }
    };

    const handleReject = async (requestId: string, reason: string) => {
        const rejectionReason = reason || prompt('נא להזין סיבת דחייה:');
        if (!rejectionReason) return;

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
                body: JSON.stringify({ status: 'rejected', rejectionReason }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה בדחיית בקשת חופש');
            }

            addToast('בקשת חופש נדחתה', 'info');
            loadRequests(true);
        } catch (error: any) {
            addToast(error.message || 'שגיאה בדחיית בקשת חופש', 'error');
        }
    };

    const handleRequestMoreInfo = async (requestId: string) => {
        const moreInfoRequest = prompt('מה תרצה לבקש מהעובד? (למשל: "נא לספק סיבה מפורטת יותר"):');
        if (!moreInfoRequest) return;

        try {
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgId ? { 'x-org-id': orgId } : {}) },
                body: JSON.stringify({ 
                    requestMoreInfo: true,
                    moreInfoRequest: moreInfoRequest
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה בבקשת מידע נוסף');
            }

            addToast('הבקשה נשלחה לעובד', 'success');
            loadRequests(true);
        } catch (error: any) {
            addToast(error.message || 'שגיאה בבקשת מידע נוסף', 'error');
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const gregorian = date.toLocaleDateString('he-IL', {
            day: 'numeric',
            month: 'numeric',
            year: 'numeric'
        });
        
        if (showHebrewDates) {
            const hebrew = formatHebrewDate(date, { includeYear: true, shortFormat: true });
            return `${gregorian} (${hebrew})`;
        }
        
        return gregorian;
    };

    const getLeaveTypeLabel = (type: LeaveRequestType) => {
        const labels: Record<LeaveRequestType, string> = {
            vacation: 'חופשה',
            sick: 'מחלה',
            personal: 'יום אישי',
            unpaid: 'חופשה ללא תשלום',
            other: 'אחר'
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status: LeaveRequestStatus) => {
        const labels: Record<LeaveRequestStatus, string> = {
            pending: 'ממתין',
            approved: 'אושר',
            rejected: 'נדחה',
            cancelled: 'בוטל'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: LeaveRequestStatus) => {
        const colors: Record<LeaveRequestStatus, string> = {
            pending: 'bg-yellow-100 text-yellow-700',
            approved: 'bg-green-100 text-green-700',
            rejected: 'bg-red-100 text-red-700',
            cancelled: 'bg-gray-100 text-gray-700'
        };
        return colors[status] || colors.pending;
    };

    const stats = {
        total: requests.length,
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length
    };

    const isAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'מנכ״ל' || currentUser?.role === 'מנכ"ל' || currentUser?.role === 'אדמין';
    const canCreateForOthers = isAdmin;

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">בקשות חופש</h1>
                <p className="text-sm text-gray-500">נהל בקשות חופשה, מחלה, ימים אישיים וחופשות ללא תשלום</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">סה"כ בקשות</p>
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
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">ממתינים</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.pending}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">אושרו</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.approved}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Check size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">נדחו</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.rejected}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Ban size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">בקשות</h2>
                    <button
                        onClick={() => loadRequests()}
                        disabled={isLoading}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-50"
                        title="רענן"
                    >
                        {isLoading ? <Skeleton className="w-[18px] h-[18px] rounded-full" /> : <RefreshCw size={18} />}
                    </button>
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
                    {isAdmin && (
                        <CustomSelect
                            value={filterEmployee}
                            onChange={setFilterEmployee}
                            options={[
                                { value: 'all', label: 'כל העובדים' },
                                ...users.map(user => ({ value: user.id, label: user.name }))
                            ]}
                            className="w-40 md:w-40"
                        />
                    )}
                    <CustomSelect
                        value={filterType}
                        onChange={(val) => setFilterType(val as LeaveRequestType | 'all')}
                        options={[
                            { value: 'all', label: 'כל הסוגים' },
                            { value: 'vacation', label: 'חופשה' },
                            { value: 'sick', label: 'מחלה' },
                            { value: 'personal', label: 'יום אישי' },
                            { value: 'unpaid', label: 'ללא תשלום' },
                            { value: 'other', label: 'אחר' }
                        ]}
                        className="w-40 md:w-40"
                    />
                    <CustomSelect
                        value={filterStatus}
                        onChange={(val) => setFilterStatus(val as LeaveRequestStatus | 'all')}
                        options={[
                            { value: 'all', label: 'כל הסטטוסים' },
                            { value: 'pending', label: 'ממתין' },
                            { value: 'approved', label: 'אושר' },
                            { value: 'rejected', label: 'נדחה' },
                            { value: 'cancelled', label: 'בוטל' }
                        ]}
                        className="w-40 md:w-40"
                    />
                </div>
            </div>

            {/* Requests List */}
            {isLoading ? (
                <div className="py-6">
                    <SkeletonGrid cards={4} columns={1} />
                </div>
            ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">אין בקשות חופש</h3>
                    <p className="text-sm text-gray-500">עובדים יכולים לבקש חופש ממסך החשבון שלהם</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {requests.map((request) => {
                        const employee = users.find(u => u.id === request.employeeId);
                        return (
                            <motion.div
                                key={request.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-6"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${getStatusColor(request.status)}`}>
                                                {getStatusLabel(request.status)}
                                            </span>
                                            {Boolean((request as any)?.metadata?.isUrgent) && (
                                                <span className="text-xs px-2 py-1 rounded-full font-bold bg-amber-100 text-amber-700 flex items-center gap-1">
                                                    <AlertCircle size={12} />
                                                    דחוף
                                                </span>
                                            )}
                                            <span className="text-xs px-2 py-1 rounded-full font-bold bg-purple-100 text-purple-700">
                                                {getLeaveTypeLabel(request.leaveType)}
                                            </span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                                {employee?.name || 'עובד לא ידוע'}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    {formatDate(request.startDate)} - {formatDate(request.endDate)}
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {request.daysRequested} ימים
                                                </div>
                                            </div>
                                            {request.reason && (
                                                <p className="text-sm text-gray-600 mt-2">{request.reason}</p>
                                            )}
                                            {Boolean((request as any)?.metadata?.needsMoreInfo) && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                                                    <p className="text-sm font-bold text-amber-900 mb-1">נדרש מידע נוסף:</p>
                                                    <p className="text-sm text-amber-800">{String((request as any)?.metadata?.moreInfoRequest || 'נא לספק סיבה מפורטת יותר')}</p>
                                                </div>
                                            )}
                                            {request.rejectionReason && (
                                                <p className="text-sm text-red-600 mt-2">
                                                    סיבת דחייה: {request.rejectionReason}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {isAdmin && request.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(request.id)}
                                                    className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-all"
                                                    title="אשר"
                                                >
                                                    <Check size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleRequestMoreInfo(request.id)}
                                                    className="p-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-all"
                                                    title="בקש סיבה טובה יותר"
                                                >
                                                    <MessageCircle size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(request.id, '')}
                                                    className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                                                    title="דחה"
                                                >
                                                    <Ban size={18} />
                                                </button>
                                            </>
                                        )}
                                        {(isAdmin || request.employeeId === currentUser?.id) && request.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setEditingRequest(request);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-all"
                                                    title="ערוך"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(request.id)}
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
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <LeaveRequestModal
                        request={editingRequest}
                        onClose={() => {
                            setIsModalOpen(false);
                            setEditingRequest(null);
                        }}
                        onSuccess={() => {
                            setIsModalOpen(false);
                            setEditingRequest(null);
                            loadRequests();
                            addToast(editingRequest ? 'בקשת חופש עודכנה בהצלחה' : 'בקשת חופש נוצרה בהצלחה', 'success');
                        }}
                        addToast={addToast}
                        users={users}
                        canCreateForOthers={canCreateForOthers}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
