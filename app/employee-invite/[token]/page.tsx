/**
 * Employee Invitation Form Page
 * /employee-invite/[token]
 * 
 * Public page for employees to complete their signup form
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Briefcase, Building2, Calendar, DollarSign, Check, X, Loader2, ArrowRight } from 'lucide-react';

interface InvitationData {
    token: string;
    employeeEmail?: string;
    employeeName?: string;
    employeePhone?: string;
    department?: string;
    role?: string;
    paymentType?: 'hourly' | 'monthly';
    hourlyRate?: number;
    monthlySalary?: number;
    commissionPct?: number;
    startDate?: string;
    notes?: string;
    expiresAt?: string;
    isUsed: boolean;
    usedAt?: string;
}

export default function EmployeeInvitePage() {
    const params = useParams();
    const router = useRouter();
    const token = params?.token as string;

    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        bio: '',
        location: ''
    });

    // Load invitation data
    useEffect(() => {
        if (!token) return;

        const loadInvitation = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(`/api/employees/invite/${token}`);
                
                if (response.status === 404) {
                    setError('קישור הזמנה לא נמצא');
                    setIsLoading(false);
                    return;
                }

                if (response.status === 410) {
                    const data = await response.json();
                    setError(data.error || 'קישור זה כבר שימש או פג תוקף');
                    setIsLoading(false);
                    return;
                }

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'שגיאה בטעינת הקישור');
                }

                const data = await response.json();
                setInvitation(data.invitation);

                // Pre-fill form with invitation data
                if (data.invitation) {
                    setFormData(prev => ({
                        ...prev,
                        name: data.invitation.employeeName || '',
                        email: data.invitation.employeeEmail || '',
                        phone: data.invitation.employeePhone || ''
                    }));
                }
            } catch (err: any) {
                console.error('[EmployeeInvite] Error loading invitation:', err);
                setError(err.message || 'שגיאה בטעינת הקישור');
            } finally {
                setIsLoading(false);
            }
        };

        loadInvitation();
    }, [token]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        // Validation
        if (!formData.name.trim()) {
            setError('נא להזין שם');
            return;
        }

        if (!formData.email.trim() || !formData.email.includes('@')) {
            setError('נא להזין אימייל תקין');
            return;
        }

        if (!formData.password || formData.password.length < 6) {
            setError('נא להזין סיסמה (לפחות 6 תווים)');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('הסיסמאות לא תואמות');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/employees/invite/${token}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim(),
                    phone: formData.phone.trim() || null,
                    password: formData.password, // Will be used for Clerk signup
                    bio: formData.bio.trim() || null,
                    location: formData.location.trim() || null
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'שגיאה בהשלמת ההרשמה');
            }

            const data = await response.json();
            setSuccess(true);

            // Redirect to signup page after 2 seconds
            setTimeout(() => {
                if (data.signupUrl) {
                    window.location.href = data.signupUrl;
                } else {
                    router.push('/sign-up?email=' + encodeURIComponent(formData.email) + '&invited=true&employee=true');
                }
            }, 2000);

        } catch (err: any) {
            console.error('[EmployeeInvite] Error submitting form:', err);
            setError(err.message || 'שגיאה בהשלמת ההרשמה');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mx-auto mb-4" />
                    <p className="text-white text-lg">טוען...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/40 backdrop-blur-2xl border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
                >
                    <X className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-white mb-2">שגיאה</h1>
                    <p className="text-slate-300">{error}</p>
                </motion.div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/40 backdrop-blur-2xl border border-green-500/30 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl"
                >
                    <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-white mb-2">הרשמה הושלמה בהצלחה!</h1>
                    <p className="text-slate-300 mb-4">מעבירים אותך לעמוד ההרשמה...</p>
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl"
            >
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">הצטרף לצוות</h1>
                    <p className="text-slate-400">הוזמנת להצטרף ל-{invitation?.department || 'הצוות'}</p>
                </div>

                {/* Invitation Details */}
                {invitation && (
                    <div className="bg-indigo-500/10 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-indigo-500/20">
                        <h3 className="text-sm font-bold text-indigo-300 uppercase mb-4">פרטי ההזמנה</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {invitation.role && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Briefcase size={16} className="text-indigo-400" />
                                    <span className="font-bold">תפקיד:</span>
                                    <span>{invitation.role}</span>
                                </div>
                            )}
                            {invitation.department && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Building2 size={16} className="text-indigo-400" />
                                    <span className="font-bold">מחלקה:</span>
                                    <span>{invitation.department}</span>
                                </div>
                            )}
                            {(invitation.monthlySalary || invitation.hourlyRate) && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <DollarSign size={16} className="text-indigo-400" />
                                    <span className="font-bold">שכר:</span>
                                    <span>
                                        {invitation.paymentType === 'hourly'
                                            ? `${invitation.hourlyRate} ₪ לשעה`
                                            : `${invitation.monthlySalary} ₪ לחודש`
                                        }
                                        {invitation.commissionPct && ` + ${invitation.commissionPct}% עמלה`}
                                    </span>
                                </div>
                            )}
                            {invitation.startDate && (
                                <div className="flex items-center gap-2 text-slate-300">
                                    <Calendar size={16} className="text-indigo-400" />
                                    <span className="font-bold">תאריך התחלה:</span>
                                    <span>{new Date(invitation.startDate).toLocaleDateString('he-IL')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">שם מלא *</label>
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 pr-10 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                    placeholder="שם פרטי ומשפחה"
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">אימייל *</label>
                            <div className="relative">
                                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 pr-10 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                    placeholder="your@email.com"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">טלפון</label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 pr-10 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                    placeholder="+972-50-123-4567"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">מיקום</label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                placeholder="תל אביב, ירושלים..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">סיסמה *</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                placeholder="לפחות 6 תווים"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">אימות סיסמה *</label>
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all"
                                placeholder="הזן שוב"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">אודות (אופציונלי)</label>
                        <textarea
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:border-indigo-500/50 focus:outline-none transition-all min-h-[100px] resize-none"
                            placeholder="ספר על עצמך..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-sm shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                שולח...
                            </>
                        ) : (
                            <>
                                השלם הרשמה
                                <ArrowRight size={18} className="rotate-180" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>
        </div>
    );
}
