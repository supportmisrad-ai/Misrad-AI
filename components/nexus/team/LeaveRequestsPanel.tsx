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
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';
import { isTenantAdminRole } from '@/lib/constants/roles';

let leaveRequestsCache: LeaveRequest[] = [];
let showHebrewDatesPreference = false;

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    const obj = asObject(error);
    const msg = obj?.message;
    return typeof msg === 'string' ? msg : '';
}

function getString(obj: Record<string, unknown>, key: string, fallback = ''): string {
    const v = obj[key];
    return typeof v === 'string' ? v : String(v ?? fallback);
}

function getNullableString(obj: Record<string, unknown>, key: string): string | null {
    const v = obj[key];
    if (v == null) return null;
    return typeof v === 'string' ? v : String(v);
}

function getNumber(obj: Record<string, unknown>, key: string, fallback = 0): number {
    const v = obj[key];
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : fallback;
}

function isLeaveRequestType(value: string): value is LeaveRequestType {
    return value === 'vacation' || value === 'sick' || value === 'personal' || value === 'unpaid' || value === 'other';
}

function isLeaveRequestStatus(value: string): value is LeaveRequestStatus {
    return value === 'pending' || value === 'approved' || value === 'rejected' || value === 'cancelled';
}

function parseLeaveRequest(value: unknown): LeaveRequest | null {
    const obj = asObject(value);
    if (!obj) return null;

    const leaveTypeStr = getString(obj, 'leaveType', getString(obj, 'leave_type'));
    const statusStr = getString(obj, 'status');
    if (!isLeaveRequestType(leaveTypeStr) || !isLeaveRequestStatus(statusStr)) return null;

    const id = getString(obj, 'id');
    const employeeId = getString(obj, 'employeeId', getString(obj, 'employee_id'));
    if (!id || !employeeId) return null;

    const startDate = getString(obj, 'startDate', getString(obj, 'start_date'));
    const endDate = getString(obj, 'endDate', getString(obj, 'end_date'));

    const request: LeaveRequest = {
        id,
        employeeId,
        leaveType: leaveTypeStr,
        startDate,
        endDate,
        daysRequested: getNumber(obj, 'daysRequested', getNumber(obj, 'days_requested', 0)),
        status: statusStr,
        reason: getNullableString(obj, 'reason') ?? undefined,
        requestedBy: getNullableString(obj, 'requestedBy') ?? undefined,
        approvedBy: getNullableString(obj, 'approvedBy') ?? undefined,
        approvedAt: getNullableString(obj, 'approvedAt') ?? undefined,
        rejectionReason: getNullableString(obj, 'rejectionReason') ?? undefined,
        createdAt: getString(obj, 'createdAt', getString(obj, 'created_at')),
        updatedAt: getString(obj, 'updatedAt', getString(obj, 'updated_at')),
        metadata: asObject(obj['metadata']) ?? undefined,
    };

    return request;
}

function isLeaveRequest(value: LeaveRequest | null): value is LeaveRequest {
    return Boolean(value);
}

function unwrap(data: unknown): unknown {
    const obj = asObject(data);
    const inner = obj ? asObject(obj.data) : null;
    if (inner) return inner;
    return data;
}

function getApiErrorMessage(payload: unknown, raw: unknown, fallback: string): string {
    const payloadObj = asObject(payload);
    const rawObj = asObject(raw);
    const fromPayload = payloadObj && typeof payloadObj.error === 'string' ? payloadObj.error : '';
    const fromRaw = rawObj && typeof rawObj.error === 'string' ? rawObj.error : '';
    return String(fromPayload || fromRaw || fallback);
}

function getMetadata(request: LeaveRequest): Record<string, unknown> {
    const obj = asObject(request);
    const meta = obj ? asObject(obj.metadata) : null;
    return meta ?? {};
}

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
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests?${params.toString()}`, {
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });
            const loadTime = performance.now() - startTime;
            console.log(`[LeaveRequests] Load time: ${loadTime.toFixed(2)}ms`);

            const raw: unknown = await response.json().catch(() => ({}));
            const payload = unwrap(raw);

            if (!response.ok) {
                throw new Error(getApiErrorMessage(payload, raw, `Failed to load requests (${response.status})`));
            }

            const payloadObj = asObject(payload) ?? {};
            const requestsRaw = payloadObj.requests;
            const newRequests: LeaveRequest[] = Array.isArray(requestsRaw)
                ? requestsRaw.map(parseLeaveRequest).filter(isLeaveRequest)
                : [];
            console.log(
                '[LeaveRequests] Loaded requests:',
                newRequests.length,
                'Urgent:',
                newRequests.filter((r) => Boolean(getMetadata(r)['isUrgent'])).length
            );
            setRequests(newRequests);
            
            // Update cache only if no filters (full list)
            if (filterType === 'all' && filterStatus === 'all' && filterEmployee === 'all') {
                setCachedRequests(newRequests);
                leaveRequestsCache = newRequests;
            }
        } catch (error: unknown) {
            console.error('[LeaveRequests] Error loading requests:', error);
            // Keep cached data on error
            if (requests.length === 0 && cachedRequests.length > 0) {
                setRequests(cachedRequests);
            }
            addToast(getErrorMessage(error) || 'שגיאה בטעינת בקשות חופש', 'error');
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
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'DELETE',
                headers: orgSlug ? { 'x-org-id': orgSlug } : undefined
            });

            if (!response.ok) {
                const raw: unknown = await response.json().catch(() => ({}));
                const payload = unwrap(raw);
                throw new Error(getApiErrorMessage(payload, raw, 'שגיאה במחיקת בקשת חופש'));
            }

            addToast('בקשת חופש נמחקה בהצלחה', 'success');
            loadRequests(true);
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה במחיקת בקשת חופש', 'error');
        }
    };

    const handleApprove = async (requestId: string) => {
        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ status: 'approved' }),
            });

            if (!response.ok) {
                const raw: unknown = await response.json().catch(() => ({}));
                const payload = unwrap(raw);
                throw new Error(getApiErrorMessage(payload, raw, 'שגיאה באישור בקשת חופש'));
            }

            addToast('בקשת חופש אושרה בהצלחה', 'success');
            loadRequests(true);
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה באישור בקשת חופש', 'error');
        }
    };

    const handleReject = async (requestId: string, reason: string) => {
        const rejectionReason = reason || prompt('נא להזין סיבת דחייה:');
        if (!rejectionReason) return;

        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ status: 'rejected', rejectionReason }),
            });

            if (!response.ok) {
                const raw: unknown = await response.json().catch(() => ({}));
                const payload = unwrap(raw);
                throw new Error(getApiErrorMessage(payload, raw, 'שגיאה בדחיית בקשת חופש'));
            }

            addToast('בקשת חופש נדחתה', 'info');
            loadRequests(true);
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה בדחיית בקשת חופש', 'error');
        }
    };

    const handleRequestMoreInfo = async (requestId: string) => {
        const moreInfoRequest = prompt('מה תרצה לבקש מהעובד? (למשל: "נא לספק סיבה מפורטת יותר"):');
        if (!moreInfoRequest) return;

        try {
            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;
            const response = await fetch(`/api/leave-requests/${requestId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({ 
                    requestMoreInfo: true,
                    moreInfoRequest: moreInfoRequest
                }),
            });

            if (!response.ok) {
                const raw: unknown = await response.json().catch(() => ({}));
                const payload = unwrap(raw);
                throw new Error(getApiErrorMessage(payload, raw, 'שגיאה בבקשת מידע נוסף'));
            }

            addToast('הבקשה נשלחה לעובד', 'success');
            loadRequests(true);
        } catch (error: unknown) {
            addToast(getErrorMessage(error) || 'שגיאה בבקשת מידע נוסף', 'error');
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

    const isAdmin = currentUser?.isSuperAdmin || isTenantAdminRole(currentUser?.role);
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
                        const metadata = getMetadata(request);
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
                                            {Boolean(metadata['isUrgent']) && (
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
                                            {Boolean(metadata['needsMoreInfo']) && (
                                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                                                    <p className="text-sm font-bold text-amber-900 mb-1">נדרש מידע נוסף:</p>
                                                    <p className="text-sm text-amber-800">{String(metadata['moreInfoRequest'] || 'נא לספק סיבה מפורטת יותר')}</p>
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
