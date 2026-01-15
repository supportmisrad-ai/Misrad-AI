import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Mail, User, Loader2, Shield } from 'lucide-react';
import { Tenant } from '../../types';
import { getWorkspaceOrgIdFromPathname } from '@/lib/os/nexus-routing';

interface AddUserToTenantModalProps {
    tenant: Tenant;
    onClose: () => void;
    onSuccess?: () => void;
}

export const AddUserToTenantModal: React.FC<AddUserToTenantModalProps> = ({ tenant, onClose, onSuccess }) => {
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
            const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgId ? { 'x-org-id': orgId } : {}),
                },
                body: JSON.stringify({
                    ...formData,
                    tenantId: tenant.id, // Associate user with the selected tenant
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה ביצירת המשתמש');
            }

            const data = await response.json();
            
            // Add user email to tenant's allowedEmails list (if not already present)
            try {
                const currentAllowedEmails = tenant.allowedEmails || [];
                if (!currentAllowedEmails.includes(formData.email)) {
                    const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                    const tenantResponse = await fetch(`/api/tenants/${tenant.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(orgId ? { 'x-org-id': orgId } : {}),
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
                const orgId = typeof window !== 'undefined' ? getWorkspaceOrgIdFromPathname(window.location.pathname) : null;
                const inviteResponse = await fetch('/api/employees/invite', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(orgId ? { 'x-org-id': orgId } : {}),
                    },
                    body: JSON.stringify({
                        email: formData.email,
                        name: formData.name,
                        role: formData.role,
                    }),
                });

                if (!inviteResponse.ok) {
                    console.warn('Failed to send invitation email, but user was created');
                }
            } catch (inviteError) {
                console.warn('Error sending invitation:', inviteError);
            }

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            setError(err.message || 'שגיאה ביצירת המשתמש');
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
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
                            >
                                <X size={18} />
                            </button>
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
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl py-2.5 pr-4 pl-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 transition-all"
                                >
                                    <option value="עובד">עובד</option>
                                    <option value="מנהל">מנהל</option>
                                    <option value="מנכ״ל">מנכ״ל</option>
                                    <option value="אדמין">אדמין</option>
                                </select>
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
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl font-bold text-slate-700 transition-all"
                                >
                                    ביטול
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            יוצר...
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus size={16} />
                                            הוסף משתמש
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

