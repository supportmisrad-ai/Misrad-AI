'use client';

/**
 * Employee Invitations Panel
 * 
 * Panel for managers/CEOs to create and manage employee invitation links
 */

import { getWorkspaceOrgSlugFromPathname } from '@/lib/os/nexus-routing';
import { SearchableEmployeeSelect } from './SearchableEmployeeSelect';
import { extractData, extractError } from '@/lib/shared/api-types';
import React, { useState, useEffect } from 'react';
import { CustomSelect } from '../CustomSelect';
import { CustomDatePicker } from '../CustomDatePicker';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Copy, Check, X, Plus, Mail, Calendar, User, Building2, ExternalLink, Trash2, RefreshCw, DollarSign, Briefcase, Users, Clock, CheckCircle2 } from 'lucide-react';
import { Skeleton, SkeletonGrid } from '@/components/ui/skeletons';

interface EmployeeInvitation {
    id: string;
    token: string;
    url: string;
    employeeEmail: string;
    employeeName?: string;
    employeePhone?: string;
    department: string;
    role: string;
    paymentType?: 'hourly' | 'monthly';
    hourlyRate?: number;
    monthlySalary?: number;
    commissionPct?: number;
    startDate?: string;
    notes?: string;
    createdBy: string;
    createdAt: string;
    expiresAt?: string;
    usedAt?: string;
    isUsed: boolean;
    isActive: boolean;
}

interface EmployeeInvitationsPanelProps {
    addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const EmployeeInvitationsPanel: React.FC<EmployeeInvitationsPanelProps> = ({ addToast }) => {
    const [invitations, setInvitations] = useState<EmployeeInvitation[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [copiedToken, setCopiedToken] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        employeeEmail: '',
        employeeName: '',
        employeePhone: '',
        department: '',
        role: '',
        paymentType: 'monthly' as 'hourly' | 'monthly',
        hourlyRate: '',
        monthlySalary: '',
        commissionPct: '',
        startDate: '',
        notes: '',
        expiresInDays: 30
    });

    // Load invitations
    const loadInvitations = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/employees/invitations');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || `Failed to load invitations (${response.status})`);
            }
            const data = await response.json().catch(() => ({}));
            const payload = extractData<{ invitations?: EmployeeInvitation[] }>(data);
            const next = Array.isArray(payload?.invitations) ? payload.invitations : [];
            setInvitations(next);
        } catch (error: any) {
            console.error('[EmployeeInvitations] Error loading invitations:', error);
            addToast(error.message || 'שגיאה בטעינת קישורים', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadInvitations();
    }, []);

    // Create new invitation
    const handleCreateInvitation = async () => {
        // Validate
        if (!formData.employeeEmail || !formData.department || !formData.role) {
            addToast('נא למלא: אימייל, מחלקה ותפקיד', 'error');
            return;
        }

        setIsCreating(true);
        try {
            const response = await fetch('/api/employees/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employeeEmail: formData.employeeEmail.trim(),
                    employeeName: formData.employeeName.trim() || null,
                    employeePhone: formData.employeePhone.trim() || null,
                    department: formData.department.trim(),
                    role: formData.role.trim(),
                    paymentType: formData.paymentType || null,
                    hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
                    monthlySalary: formData.monthlySalary ? parseFloat(formData.monthlySalary) : null,
                    commissionPct: formData.commissionPct ? parseInt(formData.commissionPct) : null,
                    startDate: formData.startDate || null,
                    notes: formData.notes.trim() || null,
                    expiresInDays: parseInt(formData.expiresInDays.toString()) || 30
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'Failed to create invitation');
            }

            await response.json().catch(() => ({}));
            addToast('קישור הזמנה נוצר בהצלחה', 'success');
            
            // Reset form
            setFormData({
                employeeEmail: '',
                employeeName: '',
                employeePhone: '',
                department: '',
                role: '',
                paymentType: 'monthly',
                hourlyRate: '',
                monthlySalary: '',
                commissionPct: '',
                startDate: '',
                notes: '',
                expiresInDays: 30
            });
            setIsModalOpen(false);
            
            // Reload invitations
            await loadInvitations();
        } catch (error: any) {
            console.error('[EmployeeInvitations] Error creating invitation:', error);
            addToast(error.message || 'שגיאה ביצירת קישור', 'error');
        } finally {
            setIsCreating(false);
        }
    };

    // Copy link to clipboard
    const handleCopyLink = async (url: string, token: string) => {
        try {
            await navigator.clipboard.writeText(url);
            setCopiedToken(token);
            addToast('קישור הועתק ללוח', 'success');
            setTimeout(() => setCopiedToken(null), 2000);
        } catch (error) {
            addToast('שגיאה בהעתקת קישור', 'error');
        }
    };

    // Deactivate invitation
    const handleDeactivate = async (id: string) => {
        try {
            const response = await fetch(`/api/employees/invitations/${id}/deactivate`, {
                method: 'POST'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMsg = extractError(errorData);
                throw new Error(errorMsg || 'Failed to deactivate invitation');
            }

            addToast('קישור הזמנה בוטל', 'success');
            await loadInvitations();
        } catch (error: unknown) {
            console.error('[EmployeeInvitations] Error deactivating invitation:', error);
            addToast(error instanceof Error ? error.message : 'שגיאה בביטול קישור', 'error');
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'ללא תאריך';
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const stats = {
        total: invitations.length,
        active: invitations.filter(i => !i.isUsed && i.isActive).length,
        used: invitations.filter(i => i.isUsed).length,
        expired: invitations.filter(i => i.expiresAt && new Date(i.expiresAt) < new Date()).length
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">הזמנת עובדים</h1>
                <p className="text-sm text-gray-500">צור קישורי הזמנה לעובדים חדשים, קבע פרטים מראש ועקוב אחר התהליך</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">סה"כ הזמנות</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                            <UserPlus size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">פעילות</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.active}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
                            <Clock size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">נרשמו</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.used}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                            <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1">פג תוקף</p>
                            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.expired}</h3>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                            <X size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-gray-900">קישורי הזמנה</h2>
                    <div className="flex gap-3">
                        <button
                            onClick={loadInvitations}
                            disabled={isLoading}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:border-gray-300 hover:text-gray-900 transition-all disabled:opacity-50"
                            title="רענן"
                        >
                            {isLoading ? <Skeleton className="w-[18px] h-[18px] rounded-full" /> : <RefreshCw size={18} />}
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-4 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} />
                            צור הזמנה חדשה
                        </button>
                    </div>
                </div>
            </div>

            {/* Invitations List */}
            {isLoading ? (
                <div className="py-6">
                    <SkeletonGrid cards={4} columns={1} />
                </div>
            ) : invitations.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                    <UserPlus size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">אין קישורי הזמנה</h3>
                    <p className="text-sm text-gray-500 mb-4">צור קישור הזמנה ראשון לעובד חדש</p>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2 bg-black text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition-all"
                    >
                        צור הזמנה חדשה
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {invitations.map((invitation) => (
                        <motion.div
                            key={invitation.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-gray-300 transition-all p-6"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${invitation.isUsed ? 'bg-green-500' : invitation.isActive ? 'bg-blue-500' : 'bg-gray-500'}`} />
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                                                invitation.isUsed 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : invitation.isActive 
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {invitation.isUsed ? 'נרשם' : invitation.isActive ? 'פעיל' : 'לא פעיל'}
                                            </span>
                                            {invitation.expiresAt && new Date(invitation.expiresAt) < new Date() && (
                                                <span className="text-xs px-2 py-1 rounded-full font-bold bg-red-100 text-red-700">
                                                    פג תוקף
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-1">
                                            {invitation.employeeName || invitation.employeeEmail}
                                        </h3>
                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Mail size={14} />
                                                {invitation.employeeEmail}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Building2 size={14} />
                                                {invitation.department}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Briefcase size={14} />
                                                {invitation.role}
                                            </div>
                                        </div>
                                    </div>
                                    {(invitation.monthlySalary || invitation.hourlyRate) && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <DollarSign size={14} />
                                            {invitation.paymentType === 'hourly' 
                                                ? `${invitation.hourlyRate} ₪ לשעה`
                                                : `${invitation.monthlySalary} ₪ לחודש`
                                            }
                                            {invitation.commissionPct && (
                                                <span className="text-xs">+ {invitation.commissionPct}% עמלה</span>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Calendar size={12} />
                                            נוצר: {formatDate(invitation.createdAt)}
                                        </div>
                                        {invitation.expiresAt && (
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                תפוגה: {formatDate(invitation.expiresAt)}
                                            </div>
                                        )}
                                        {invitation.usedAt && (
                                            <div className="flex items-center gap-1">
                                                <CheckCircle2 size={12} />
                                                נרשם: {formatDate(invitation.usedAt)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!invitation.isUsed && invitation.isActive && (
                                        <button
                                            onClick={() => handleDeactivate(invitation.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                            title="בטל קישור"
                                        >
                                            <X size={18} />
                                        </button>
                                    )}
                                    {!invitation.isUsed && (
                                        <button
                                            onClick={() => handleCopyLink(invitation.url, invitation.token)}
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                            title="העתק קישור"
                                        >
                                            {copiedToken === invitation.token ? (
                                                <Check size={18} className="text-green-600" />
                                            ) : (
                                                <Copy size={18} />
                                            )}
                                        </button>
                                    )}
                                    <a
                                        href={invitation.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                        title="פתח קישור"
                                    >
                                        <ExternalLink size={18} />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                                <h2 className="text-2xl font-bold text-gray-900">צור הזמנה לעובד חדש</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* Required Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">אימייל עובד *</label>
                                        <input
                                            type="email"
                                            value={formData.employeeEmail}
                                            onChange={(e) => setFormData({ ...formData, employeeEmail: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                            placeholder="employee@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שם עובד</label>
                                        <input
                                            type="text"
                                            value={formData.employeeName}
                                            onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                            placeholder="שם פרטי ומשפחה"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">מחלקה *</label>
                                        <input
                                            type="text"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                            placeholder="מכירות, שיווק, וכו'"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תפקיד *</label>
                                        <input
                                            type="text"
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                            placeholder="איש מכירות, מנהל שיווק, וכו'"
                                        />
                                    </div>
                                </div>

                                {/* Payment Details */}
                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <DollarSign size={16} />
                                        פרטי שכר (אופציונלי - ניתן לקבוע מאוחר יותר)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">סוג תשלום</label>
                                            <CustomSelect
                                                value={formData.paymentType}
                                                onChange={(val) => setFormData({ ...formData, paymentType: val as 'hourly' | 'monthly' })}
                                                options={[
                                                    { value: 'monthly', label: 'חודשי' },
                                                    { value: 'hourly', label: 'שעתי' }
                                                ]}
                                                className="w-full"
                                            />
                                        </div>
                                        {formData.paymentType === 'hourly' ? (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">שכר שעתי (₪)</label>
                                                <input
                                                    type="number"
                                                    value={formData.hourlyRate}
                                                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                                    placeholder="100"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">משכורת חודשית (₪)</label>
                                                <input
                                                    type="number"
                                                    value={formData.monthlySalary}
                                                    onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                                    placeholder="10000"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">אחוז עמלה (%)</label>
                                        <input
                                            type="number"
                                            value={formData.commissionPct}
                                            onChange={(e) => setFormData({ ...formData, commissionPct: e.target.value })}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                            placeholder="5"
                                            min="0"
                                            max="100"
                                        />
                                    </div>
                                </div>

                                {/* Additional Details */}
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">טלפון</label>
                                    <input
                                        type="tel"
                                        value={formData.employeePhone}
                                        onChange={(e) => setFormData({ ...formData, employeePhone: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                        placeholder="+972-50-123-4567"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תאריך התחלה</label>
                                    <CustomDatePicker
                                        value={formData.startDate || ''}
                                        onChange={(val) => setFormData({ ...formData, startDate: val })}
                                        placeholder="בחר תאריך התחלה"
                                        showHebrewDate={true}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">הערות</label>
                                    <textarea
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all min-h-[80px] resize-none"
                                        placeholder="הערות פנימיות..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">תוקף (ימים)</label>
                                    <input
                                        type="number"
                                        value={formData.expiresInDays}
                                        onChange={(e) => setFormData({ ...formData, expiresInDays: parseInt(e.target.value) || 30 })}
                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none transition-all"
                                        min="1"
                                        max="365"
                                    />
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleCreateInvitation}
                                    disabled={isCreating || !formData.employeeEmail || !formData.department || !formData.role}
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCreating ? 'יוצר...' : 'צור הזמנה'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
