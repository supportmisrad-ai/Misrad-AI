'use client';

/**
 * Event Request Modal
 * 
 * Modal for creating/editing team events
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, MapPin, Users, Clock, FileText } from 'lucide-react';
import { TeamEvent, TeamEventType } from '../../../types';
import { formatHebrewDate } from '../../../lib/hebrew-calendar';
import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';

let showHebrewDatesPreference = false;

interface EventRequestModalProps {
    event?: TeamEvent | null;
    onClose: () => void;
    onSuccess: () => void;
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EventRequestModal: React.FC<EventRequestModalProps> = ({
    event,
    onClose,
    onSuccess,
    addToast
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHebrewDates, setShowHebrewDates] = useState(() => showHebrewDatesPreference);
    const [formData, setFormData] = useState({
        title: event?.title || '',
        description: event?.description || '',
        eventType: (event?.eventType || 'group_meeting') as TeamEventType,
        startDate: event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
        endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
        allDay: event?.allDay || false,
        location: event?.location || '',
        requiredAttendees: event?.requiredAttendees || [],
        optionalAttendees: event?.optionalAttendees || [],
        requiresApproval: event?.requiresApproval || false,
        reminderDaysBefore: event?.reminderDaysBefore || 1
    });

    useEffect(() => {
        showHebrewDatesPreference = showHebrewDates;
    }, [showHebrewDates]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const unwrap = (data: any) =>
            (data as any)?.data && typeof (data as any).data === 'object' ? (data as any).data : data;
        
        if (!formData.title) {
            addToast('נא למלא כותרת האירוע', 'error');
            return;
        }
        
        if (!formData.startDate) {
            addToast('נא למלא תאריך ושעה התחלה', 'error');
            return;
        }
        
        if (!formData.endDate) {
            addToast('נא למלא תאריך ושעה סיום', 'error');
            return;
        }
        
        if (new Date(formData.startDate) > new Date(formData.endDate)) {
            addToast('תאריך סיום חייב להיות אחרי תאריך התחלה', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const url = event ? `/api/team-events/${event.id}` : '/api/team-events';
            const method = event ? 'PATCH' : 'POST';

            const orgSlug = typeof window !== 'undefined' ? getWorkspaceOrgSlugFromPathname(window.location.pathname) : null;

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', ...(orgSlug ? { 'x-org-id': orgSlug } : {}) },
                body: JSON.stringify({
                    ...formData,
                    startDate: new Date(formData.startDate).toISOString(),
                    endDate: new Date(formData.endDate).toISOString()
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errPayload = unwrap(errorData);
                throw new Error((errorData as any)?.error || (errPayload as any)?.error || 'שגיאה בשמירת אירוע');
            }

            onSuccess();
        } catch (error: any) {
            addToast(error.message || 'שגיאה בשמירת אירוע', 'error');
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
                        <h2 className="text-lg font-bold text-gray-900">{event ? 'עריכת אירוע' : 'יצירת אירוע חדש'}</h2>
                        <p className="text-xs text-gray-500">פגישות העשרה, ימי כיף, הדרכות ופגישות קבוצתיות</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            כותרת האירוע *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                            placeholder="לדוגמה: הדרכת מכירות Q4"
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            תיאור
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300 resize-none"
                            rows={3}
                            placeholder="פרטים נוספים על האירוע..."
                        />
                    </div>

                    {/* Event Type */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            סוג אירוע *
                        </label>
                        <select
                            value={formData.eventType}
                            onChange={(e) => setFormData({ ...formData, eventType: e.target.value as TeamEventType })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                            required
                        >
                            <option value="training">הדרכה</option>
                            <option value="fun_day">יום כיף</option>
                            <option value="group_meeting">פגישה קבוצתית</option>
                            <option value="enrichment">העשרה</option>
                            <option value="company_event">אירוע חברה</option>
                            <option value="other">אחר</option>
                        </select>
                    </div>

                    {/* Hebrew Dates Toggle */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="showHebrewDates"
                            checked={showHebrewDates}
                            onChange={(e) => setShowHebrewDates(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="showHebrewDates" className="text-sm text-gray-700">
                            הצג תאריכים עבריים
                        </label>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                תאריך ושעה התחלה *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                <input
                                    type="datetime-local"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer hover:border-gray-300"
                                    required
                                />
                            </div>
                            {showHebrewDates && formData.startDate && (
                                <p className="text-xs text-purple-600 mt-1 font-bold">
                                    עברי: {formatHebrewDate(new Date(formData.startDate), { includeYear: true })}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">
                                תאריך ושעה סיום *
                            </label>
                            <div className="relative">
                                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                <input
                                    type="datetime-local"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer hover:border-gray-300"
                                    required
                                />
                            </div>
                            {showHebrewDates && formData.endDate && (
                                <p className="text-xs text-purple-600 mt-1 font-bold">
                                    עברי: {formatHebrewDate(new Date(formData.endDate), { includeYear: true })}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* All Day */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="allDay"
                            checked={formData.allDay}
                            onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="allDay" className="text-sm text-gray-700">
                            אירוע לכל היום
                        </label>
                    </div>

                    {/* Location */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            מיקום
                        </label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                            placeholder="לדוגמה: חדר ישיבות, משרד ראשי"
                        />
                    </div>

                    {/* Requires Approval */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="requiresApproval"
                            checked={formData.requiresApproval}
                            onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="requiresApproval" className="text-sm text-gray-700">
                            דורש אישור מנהל
                        </label>
                    </div>

                    {/* Reminder */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            תזכורת (ימים לפני האירוע)
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="30"
                            value={formData.reminderDaysBefore}
                            onChange={(e) => setFormData({ ...formData, reminderDaysBefore: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all hover:border-gray-300"
                        />
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
                            {isSubmitting ? 'שומר...' : (event ? 'עדכן' : 'צור אירוע')}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
