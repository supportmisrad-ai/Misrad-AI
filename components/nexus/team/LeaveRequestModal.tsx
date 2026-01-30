'use client';

/**
 * Leave Request Modal
 * 
 * Modal for creating/editing leave requests
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, FileText, Plane, Heart, Coffee, DollarSign, MoreHorizontal, AlertCircle } from 'lucide-react';
import { LeaveRequest, LeaveRequestType } from '../../../types';
import { CustomDatePicker } from '../../CustomDatePicker';
import { CustomSelect } from '../../CustomSelect';
import { SearchableEmployeeSelect } from '../SearchableEmployeeSelect';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

const unwrap = (data: any) => {
    if (data && typeof data === 'object' && data.data && typeof data.data === 'object') {
        return data.data;
    }
    return data;
};

interface LeaveRequestModalProps {
    request?: LeaveRequest | null;
    onClose: () => void;
    onSuccess: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    users?: Array<{ id: string; name: string; email?: string; avatar?: string; role?: string }>;
    canCreateForOthers?: boolean;
}

export const LeaveRequestModal: React.FC<LeaveRequestModalProps> = ({
    request,
    onClose,
    onSuccess,
    addToast,
    users = [],
    canCreateForOthers = false
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isShaking, setIsShaking] = useState(false);
    const startDateRef = useRef<HTMLDivElement>(null);
    const endDateRef = useRef<HTMLDivElement>(null);
    const [formData, setFormData] = useState({
        employeeId: request?.employeeId || '',
        leaveType: (request?.leaveType || 'vacation') as LeaveRequestType,
        startDate: request?.startDate || '',
        endDate: request?.endDate || '',
        daysRequested: request?.daysRequested || 0,
        reason: request?.reason || '',
        isUrgent: Boolean((request as any)?.metadata?.isUrgent)
    });

    // Calculate days automatically when dates change
    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (start <= end) {
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setFormData(prev => ({ ...prev, daysRequested: diffDays }));
            }
        } else {
            setFormData(prev => ({ ...prev, daysRequested: 0 }));
        }
    }, [formData.startDate, formData.endDate]);

    // Check if request is urgent (starts tomorrow or within 3 days)
    const isUrgentEligible = () => {
        if (!formData.startDate) return false;
        const startDate = new Date(formData.startDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(23, 59, 59, 999);
        
        startDate.setHours(0, 0, 0, 0);
        return startDate >= tomorrow && startDate <= threeDaysFromNow;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.startDate || !formData.endDate) {
            addToast('נא למלא תאריך התחלה ותאריך סיום', 'error');
            return;
        }
        
        if (canCreateForOthers && !formData.employeeId) {
            addToast('נא לבחור עובד', 'error');
            return;
        }

        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            addToast('תאריך סיום חייב להיות אחרי תאריך התחלה', 'error');
            return;
        }

        // Calculate days one more time before submitting (in case useEffect didn't run)
        let finalDaysRequested = formData.daysRequested;
        if (formData.startDate && formData.endDate) {
            const start = new Date(formData.startDate);
            const end = new Date(formData.endDate);
            if (start <= end) {
                const diffTime = Math.abs(end.getTime() - start.getTime());
                finalDaysRequested = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }
        }

        if (finalDaysRequested <= 0) {
            addToast('מספר הימים חייב להיות גדול מ-0', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const url = request ? `/api/leave-requests/${request.id}` : '/api/leave-requests';
            const method = request ? 'PATCH' : 'POST';

            const orgSlug = typeof window !== 'undefined'
                ? (getWorkspaceOrgSlugFromPathname(window.location.pathname) || null)
                : null;

            // Prepare request body - only include employeeId if canCreateForOthers is true
            const requestBody: any = {
                leaveType: formData.leaveType,
                startDate: formData.startDate,
                endDate: formData.endDate,
                daysRequested: finalDaysRequested,
                reason: formData.reason || undefined,
                metadata: {
                    isUrgent: formData.isUrgent || false
                }
            };

            // Only include employeeId if creating for others
            if (canCreateForOthers && formData.employeeId) {
                requestBody.employeeId = formData.employeeId;
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': orgSlug } : {}),
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const raw = await response.json().catch(() => ({}));
                const payload = unwrap(raw);
                throw new Error((payload as any)?.error || (raw as any)?.error || 'שגיאה בשמירת בקשת חופש');
            }

            const raw = await response.json().catch(() => ({}));
            unwrap(raw);
            // Don't show toast here - let the parent component handle it via onSuccess
            onSuccess();
            onClose();
        } catch (error: any) {
            addToast(error.message || 'שגיאה בשמירת בקשת חופש', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{request ? 'עריכת בקשת חופש' : 'בקשת חופש חדשה'}</h2>
                        <p className="text-xs text-gray-500">חופשה, מחלה, יום אישי</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Employee (if can create for others) */}
                    {canCreateForOthers && (
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                עובד *
                            </label>
                            <SearchableEmployeeSelect
                                value={formData.employeeId}
                                onChange={(value) => setFormData({ ...formData, employeeId: value })}
                                employees={users.map(user => ({
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                    avatar: user.avatar,
                                    role: user.role
                                }))}
                                placeholder="בחר עובד"
                                required
                            />
                        </div>
                    )}

                    {/* Leave Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            סוג חופש *
                        </label>
                        <CustomSelect
                            value={formData.leaveType}
                            onChange={(value) => setFormData({ ...formData, leaveType: value as LeaveRequestType })}
                            options={[
                                { 
                                    value: 'vacation', 
                                    label: 'חופשה', 
                                    icon: <Plane size={16} className="text-blue-600" />
                                },
                                { 
                                    value: 'sick', 
                                    label: 'מחלה', 
                                    icon: <Heart size={16} className="text-red-600" />
                                },
                                { 
                                    value: 'personal', 
                                    label: 'יום אישי', 
                                    icon: <Coffee size={16} className="text-purple-600" />
                                },
                                { 
                                    value: 'unpaid', 
                                    label: 'חופשה ללא תשלום', 
                                    icon: <DollarSign size={16} className="text-gray-600" />
                                },
                                { 
                                    value: 'other', 
                                    label: 'אחר', 
                                    icon: <MoreHorizontal size={16} className="text-gray-500" />
                                }
                            ]}
                            className="text-sm font-bold"
                        />
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div ref={startDateRef} className={isShaking ? 'animate-shake' : ''}>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                תאריך התחלה *
                            </label>
                            <CustomDatePicker
                                value={formData.startDate}
                                onChange={(value) => {
                                    // If end date exists and new start date is after it, show error
                                    if (formData.endDate && new Date(value) > new Date(formData.endDate)) {
                                        addToast('תאריך התחלה לא יכול להיות אחרי תאריך סיום', 'error');
                                        setIsShaking(true);
                                        setTimeout(() => setIsShaking(false), 500);
                                        return;
                                    }
                                    setFormData(prev => ({ ...prev, startDate: value }));
                                }}
                                onValidationError={(message) => {
                                    addToast(message, 'error');
                                    setIsShaking(true);
                                    setTimeout(() => setIsShaking(false), 500);
                                }}
                                placeholder="בחר תאריך התחלה"
                                minDate={new Date().toISOString().split('T')[0]}
                                maxDate={formData.endDate || undefined}
                                showHebrewDate={true}
                            />
                        </div>
                        <div ref={endDateRef} className={isShaking ? 'animate-shake' : ''}>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                תאריך סיום *
                            </label>
                            <CustomDatePicker
                                value={formData.endDate}
                                onChange={(value) => {
                                    // If start date exists and new end date is before it, show error
                                    if (formData.startDate && new Date(value) < new Date(formData.startDate)) {
                                        addToast('תאריך סיום לא יכול להיות לפני תאריך התחלה', 'error');
                                        setIsShaking(true);
                                        setTimeout(() => setIsShaking(false), 500);
                                        return;
                                    }
                                    setFormData(prev => ({ ...prev, endDate: value }));
                                }}
                                onValidationError={(message) => {
                                    addToast(message, 'error');
                                    setIsShaking(true);
                                    setTimeout(() => setIsShaking(false), 500);
                                }}
                                placeholder="בחר תאריך סיום"
                                minDate={formData.startDate || new Date().toISOString().split('T')[0]}
                                showHebrewDate={true}
                            />
                        </div>
                    </div>

                    {/* Days Requested */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            מספר ימים
                        </label>
                        <input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={formData.daysRequested}
                            onChange={(e) => setFormData({ ...formData, daysRequested: parseFloat(e.target.value) || 0 })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">מחושב אוטומטית לפי התאריכים</p>
                    </div>

                    {/* Urgent Request */}
                    {isUrgentEligible() && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={Boolean(formData.isUrgent)}
                                    onChange={(e) => setFormData({ ...formData, isUrgent: e.target.checked })}
                                    className="w-5 h-5 text-amber-600 border-amber-300 rounded focus:ring-amber-500 focus:ring-2"
                                />
                                <div className="flex items-center gap-2">
                                    <AlertCircle size={18} className="text-amber-600" />
                                    <div>
                                        <span className="text-sm font-bold text-amber-900">בקשה דחופה</span>
                                        <p className="text-xs text-amber-700 mt-0.5">בקשה לתאריך קרוב (מחר עד 3 ימים) - חובה להזין סיבה מפורטת</p>
                                    </div>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            סיבה/הערות {formData.isUrgent && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className={`w-full px-4 py-2.5 border rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300 resize-none ${
                                formData.isUrgent && (!formData.reason || formData.reason.trim().length < 10)
                                    ? 'border-red-300 bg-red-50'
                                    : 'border-gray-200'
                            }`}
                            rows={3}
                            placeholder={formData.isUrgent ? "חובה להזין סיבה מפורטת (לפחות 10 תווים)" : "הערות נוספות (אופציונלי)"}
                            required={Boolean(formData.isUrgent)}
                        />
                        {formData.isUrgent && (
                            <p className="text-xs text-red-600 mt-1">
                                {formData.reason ? `${formData.reason.length}/10 תווים` : 'חובה להזין לפחות 10 תווים'}
                            </p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-bold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                        >
                            {isSubmitting ? 'שומר...' : (request ? 'עדכן' : 'שלח בקשה')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
