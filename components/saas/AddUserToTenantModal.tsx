'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, User, Shield } from 'lucide-react';
import { Tenant } from '../../types';
import { createNexusUser, sendNexusUserInvitation } from '@/app/actions/nexus';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/CustomSelect';
import { useBackButtonClose } from '@/hooks/useBackButtonClose';

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const msg = (error as Record<string, unknown>)['message'];
        if (typeof msg === 'string') return msg;
    }
    return '';
}

interface AddUserToTenantModalProps {
    tenant: Tenant;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AddUserToTenantModal: React.FC<AddUserToTenantModalProps> = ({ tenant, onClose, onSuccess }) => {
    useBackButtonClose(true, onClose);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'עובד',
        phone: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const orgId = String(tenant.subdomain || '').trim();
            if (!orgId) {
                throw new Error('לא ניתן לזהות סביבת עבודה (org)');
            }

            const createdUser = await createNexusUser({
                orgId,
                input: {
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    phone: formData.phone,
                    avatar: '',
                    department: undefined,
                    online: false,
                    capacity: 0,
                    location: undefined,
                    bio: undefined,
                    paymentType: undefined,
                    hourlyRate: undefined,
                    monthlySalary: undefined,
                    commissionPct: undefined,
                    bonusPerTask: undefined,
                    accumulatedBonus: 0,
                    streakDays: 0,
                    weeklyScore: undefined,
                    pendingReward: undefined,
                    targets: undefined,
                    notificationPreferences: undefined,
                    uiPreferences: undefined,
                    twoFactorEnabled: false,
                    isSuperAdmin: false,
                    managerId: undefined,
                    managed_department: undefined,
                    tenantId: tenant.id,
                    billingInfo: undefined,
                },
            });
            
            // Add user email to tenant's allowedEmails list (if not already present)
            try {
                const currentAllowedEmails = tenant.allowedEmails || [];
                if (!currentAllowedEmails.includes(formData.email)) {
                    const tenantResponse = await fetch(`/api/admin/tenants/${tenant.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-org-id': orgId,
                        },
                        body: JSON.stringify({
                            allowedEmails: [...currentAllowedEmails, formData.email],
                        }),
                    });

                    if (!tenantResponse.ok) {
                        console.warn('Failed to add email to tenant allowed list, but user was created');
                    }
                }
            } catch (tenantError) {
                console.warn('Error updating tenant allowed emails:', tenantError);
            }
            
            // Send invitation email to the user
            try {
                await sendNexusUserInvitation({
                    orgId,
                    email: formData.email,
                    userId: createdUser.id,
                    userName: formData.name,
                    role: formData.role,
                    department: null,
                });
            } catch (inviteError) {
                console.warn('Error sending invitation:', inviteError);
            }

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: unknown) {
            setError(getErrorMessage(err) || 'שגיאה ביצירת המשתמש');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 relative overflow-hidden backdrop-blur-xl"
                >
                    {/* Background Effects */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                    
                    <div className="relative z-10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                                    <UserPlus size={20} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-slate-900">הוסף משתמש</h2>
                                    <p className="text-xs text-slate-600 mt-0.5">{tenant.name}</p>
                                </div>
                            </div>
                            <Button onClick={onClose} type="button" variant="ghost" size="icon" className="h-10 w-10 text-slate-500 hover:text-slate-900">
                                <X size={18} />
                            </Button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    שם מלא *
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                                        placeholder="הזן שם מלא"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    אימייל *
                                </label>
                                <div className="relative">
                                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                                        placeholder="user@example.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    תפקיד
                                </label>
                                <CustomSelect
                                    value={formData.role}
                                    onChange={(val) => setFormData({ ...formData, role: val })}
                                    options={[
                                        { value: 'עובד', label: 'עובד' },
                                        { value: 'מנהל', label: 'מנהל' },
                                        { value: 'מנכ״ל', label: 'מנכ״ל' },
                                        { value: 'אדמין', label: 'אדמין' },
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">
                                    טלפון (אופציונלי)
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-4 pl-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                                    placeholder="05X-XXXXXXX"
                                />
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={onClose}
                                    variant="outline"
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-700"
                                >
                                    ביטול
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>יוצר...</>
                                    ) : (
                                        <>
                                            <UserPlus size={16} />
                                            הוסף משתמש
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

