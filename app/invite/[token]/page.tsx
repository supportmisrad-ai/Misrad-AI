/**
 * Invitation Form Page
 * /invite/[token]
 * 
 * Public page for clients to complete their onboarding form
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic';
import { motion } from 'framer-motion';
import { Building2, User, Mail, Phone, Globe, MapPin, FileText, Upload, Check, X, Loader2 } from 'lucide-react';

interface InvitationData {
    token: string;
    expiresAt?: string;
    isUsed: boolean;
    completed?: boolean;
    usedAt?: string;
    companyName?: string;
    ceoName?: string;
    prefill: {
        ceoName: string;
        ceoEmail: string;
        ceoPhone: string;
        companyName: string;
        companyId: string;
        companyLogo: string;
        companyAddress: string;
        companyWebsite: string;
        additionalNotes: string;
    };
}

export default function InvitePage() {
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
        ceoFirstName: '',
        ceoLastName: '',
        ceoEmail: '',
        ceoPhone: '',
        ceoPhoneCountry: '+972', // Default to Israel
        companyName: '',
        companyId: '', // ח.פ./ע.מ.
        companyLogo: '',
        companyAddress: '',
        companyWebsite: '',
        additionalNotes: ''
    });

    // Load invitation data
    useEffect(() => {
        if (!token) {
            setError('קישור לא תקין');
            setIsLoading(false);
            return;
        }

        const loadInvitation = async () => {
            try {
                const response = await fetch(`/api/invitations/token/${token}`);
                
                if (!response.ok) {
                    let errorData;
                    try {
                        errorData = await response.json();
                    } catch (parseError) {
                        // If JSON parsing fails, use status text
                        throw new Error(`שגיאה ${response.status}: ${response.statusText || 'שגיאה בטעינת הקישור'}`);
                    }
                    
                    // Check if form was already completed
                    if (response.status === 410 && errorData.completed) {
                        setInvitation({
                            token,
                            isUsed: true,
                            completed: true,
                            usedAt: errorData.usedAt,
                            companyName: errorData.companyName,
                            ceoName: errorData.ceoName,
                            prefill: {
                                ceoName: '',
                                ceoEmail: '',
                                ceoPhone: '',
                                companyName: '',
                                companyId: '',
                                companyLogo: '',
                                companyAddress: '',
                                companyWebsite: '',
                                additionalNotes: ''
                            }
                        });
                        setIsLoading(false);
                        return;
                    }
                    throw new Error(errorData.error || 'שגיאה בטעינת הקישור');
                }

                let data;
                try {
                    data = await response.json();
                } catch (parseError) {
                    throw new Error('שגיאה בפענוח התשובה מהשרת');
                }
                
                if (!data || !data.invitation) {
                    throw new Error('נתונים לא תקינים מהשרת');
                }
                
                setInvitation(data.invitation);

                // Pre-fill form with existing data
                if (data.invitation.prefill) {
                    // Split ceoName into first and last name if exists
                    const fullName = data.invitation.prefill.ceoName || '';
                    const nameParts = fullName.split(' ');
                    const firstName = nameParts[0] || '';
                    const lastName = nameParts.slice(1).join(' ') || '';
                    
                    // Extract country code from phone if exists
                    const phone = data.invitation.prefill.ceoPhone || '';
                    const phoneMatch = phone.match(/^(\+\d{1,4})/);
                    const countryCode = phoneMatch ? phoneMatch[1] : '+972';
                    const phoneNumber = phone.replace(/^\+\d{1,4}\s*/, '');
                    
                    setFormData({
                        ceoFirstName: firstName,
                        ceoLastName: lastName,
                        ceoEmail: data.invitation.prefill.ceoEmail || '',
                        ceoPhone: phoneNumber,
                        ceoPhoneCountry: countryCode,
                        companyName: data.invitation.prefill.companyName || '',
                        companyId: data.invitation.prefill.companyId || '',
                        companyLogo: data.invitation.prefill.companyLogo || '',
                        companyAddress: data.invitation.prefill.companyAddress || '',
                        companyWebsite: data.invitation.prefill.companyWebsite || '',
                        additionalNotes: data.invitation.prefill.additionalNotes || ''
                    });
                }
            } catch (err: any) {
                setError(err.message || 'שגיאה בטעינת הקישור');
            } finally {
                setIsLoading(false);
            }
        };

        loadInvitation();
    }, [token]);

    // Handle logo upload
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Check file size
            if (file.size > 5 * 1024 * 1024) {
                const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
                setError(`הקובץ גדול מדי (${fileSizeMB}MB). מקסימום מותר: 5MB. אנא בחר קובץ קטן יותר.`);
                return;
            }
            
            // Check file type
            const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setError('סוג קובץ לא נתמך. אנא בחר תמונה (PNG, JPG, SVG או WebP)');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, companyLogo: reader.result as string }));
                setError(null); // Clear any previous errors
            };
            reader.onerror = () => {
                setError('שגיאה בקריאת הקובץ. אנא נסה שוב.');
            };
            reader.readAsDataURL(file);
        }
    };

    // Validate phone number
    const validatePhone = (phone: string, countryCode: string) => {
        const fullPhone = `${countryCode}${phone}`.replace(/\s/g, '');
        // Basic validation: should be at least 10 digits after country code
        const digitsOnly = fullPhone.replace(/\D/g, '');
        return digitsOnly.length >= 10;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        // Validate required fields
        if (!formData.ceoFirstName || !formData.ceoLastName) {
            setError('נא למלא שם פרטי ושם משפחה');
            setIsSubmitting(false);
            return;
        }

        if (!formData.ceoEmail) {
            setError('נא למלא כתובת אימייל');
            setIsSubmitting(false);
            return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.ceoEmail)) {
            setError('כתובת אימייל לא תקינה');
            setIsSubmitting(false);
            return;
        }

        // Validate phone if provided
        if (formData.ceoPhone && !validatePhone(formData.ceoPhone, formData.ceoPhoneCountry)) {
            setError('מספר טלפון לא תקין. נא להזין מספר טלפון מלא');
            setIsSubmitting(false);
            return;
        }

        if (!formData.companyName) {
            setError('נא למלא שם החברה');
            setIsSubmitting(false);
            return;
        }

        try {
            // Combine first and last name
            const ceoName = `${formData.ceoFirstName} ${formData.ceoLastName}`.trim();
            // Combine country code and phone
            const fullPhone = formData.ceoPhone ? `${formData.ceoPhoneCountry} ${formData.ceoPhone}`.trim() : '';

            const response = await fetch(`/api/invitations/complete/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ceoName,
                    ceoEmail: formData.ceoEmail,
                    ceoPhone: fullPhone,
                    companyName: formData.companyName,
                    companyId: formData.companyId,
                    companyLogo: formData.companyLogo,
                    companyAddress: formData.companyAddress,
                    companyWebsite: formData.companyWebsite,
                    additionalNotes: formData.additionalNotes
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'שגיאה בשליחת הטופס');
            }

            const result = await response.json();
            setSuccess(true);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'שגיאה בשליחת הטופס');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <div className="text-center relative z-10">
                    <div className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                        <Loader2 size={48} className="animate-spin text-indigo-400 mx-auto mb-4" />
                        <p className="text-white font-bold text-lg">טוען...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show completion message if form was already completed
    if (invitation?.completed) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative z-10"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-green-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2 bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent">
                        הטופס כבר הושלם
                    </h1>
                    <p className="text-slate-400 mb-4">
                        {invitation.companyName && (
                            <span className="block mb-2">החברה <strong className="text-white">{invitation.companyName}</strong></span>
                        )}
                        {invitation.ceoName && (
                            <span className="block mb-2">על ידי <strong className="text-white">{invitation.ceoName}</strong></span>
                        )}
                        {invitation.usedAt && (
                            <span className="block text-sm text-slate-500">
                                בתאריך: {new Date(invitation.usedAt).toLocaleDateString('he-IL', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        )}
                    </p>
                    <p className="text-slate-500 text-sm">
                        קישור זה חד פעמי ואינו זמין לשימוש חוזר
                    </p>
                </motion.div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-3xl"></div>
                </div>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative z-10"
                >
                    <div className="w-16 h-16 bg-red-500/20 backdrop-blur-sm border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X size={32} className="text-red-400" />
                </div>
                    <h1 className="text-2xl font-black text-white mb-2 bg-gradient-to-r from-white via-red-200 to-red-300 bg-clip-text text-transparent">שגיאה</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                </motion.div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
                {/* Animated Background */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 max-w-md w-full text-center relative z-10"
                >
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} className="text-green-400" />
                    </div>
                    <h1 className="text-2xl font-black text-white mb-2 bg-gradient-to-r from-white via-green-200 to-emerald-200 bg-clip-text text-transparent">תודה רבה!</h1>
                    <p className="text-slate-400 mb-6">
                        הפרטים נשלחו בהצלחה. נחזור אליך בהקדם.
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#0f0f1a] to-[#0a0a0a] py-12 px-4 relative overflow-hidden" dir="rtl">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -right-1/4 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 -left-1/4 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-blue-500/3 rounded-full blur-3xl"></div>
            </div>
            
            <div className="max-w-2xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-black/20 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl p-8 md:p-12"
                >
                    {/* Header with Nexus Branding */}
                    <div className="text-center mb-8">
                        {/* Nexus OS Logo/Branding */}
                        <div className="flex items-center justify-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-900/50">
                                <div className="w-6 h-6 bg-white rounded-full"></div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-black text-white tracking-tight">Misrad</div>
                                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">MISRAD</div>
                            </div>
                        </div>
                        
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-sm border border-indigo-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-900/30">
                            <Building2 size={40} className="text-indigo-400" />
                        </div>
                        <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-white via-indigo-200 to-purple-200 bg-clip-text text-transparent">
                            השלמת פרטי עסק
                        </h1>
                        <p className="text-slate-400 text-lg">
                            אנא מלא את הפרטים הבאים כדי להשלים את ההרשמה
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3"
                        >
                            <X size={20} className="text-red-400 flex-shrink-0" />
                            <p className="text-red-300 text-sm font-bold">{error}</p>
                        </motion.div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* CEO First Name */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <User size={16} className="text-indigo-400" />
                                שם פרטי של מנכ"ל <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.ceoFirstName}
                                onChange={(e) => setFormData(prev => ({ ...prev, ceoFirstName: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="שם פרטי"
                            />
                        </div>

                        {/* CEO Last Name */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <User size={16} className="text-indigo-400" />
                                שם משפחה של מנכ"ל <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.ceoLastName}
                                onChange={(e) => setFormData(prev => ({ ...prev, ceoLastName: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="שם משפחה"
                            />
                        </div>

                        {/* CEO Email */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Mail size={16} className="text-indigo-400" />
                                אימייל מנכ"ל <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.ceoEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, ceoEmail: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="example@company.com"
                            />
                        </div>

                        {/* CEO Phone */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Phone size={16} className="text-indigo-400" />
                                טלפון מנכ"ל
                            </label>
                            <div className="flex gap-2">
                                <select
                                    value={formData.ceoPhoneCountry}
                                    onChange={(e) => setFormData(prev => ({ ...prev, ceoPhoneCountry: e.target.value }))}
                                    className="px-3 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                >
                                    <option value="+972">🇮🇱 +972</option>
                                    <option value="+1">🇺🇸 +1</option>
                                    <option value="+44">🇬🇧 +44</option>
                                    <option value="+49">🇩🇪 +49</option>
                                    <option value="+33">🇫🇷 +33</option>
                                    <option value="+39">🇮🇹 +39</option>
                                    <option value="+34">🇪🇸 +34</option>
                                    <option value="+971">🇦🇪 +971</option>
                                    <option value="+966">🇸🇦 +966</option>
                                </select>
                            <input
                                type="tel"
                                value={formData.ceoPhone}
                                    onChange={(e) => {
                                        // Only allow digits, spaces, and dashes
                                        const value = e.target.value.replace(/[^\d\s-]/g, '');
                                        setFormData(prev => ({ ...prev, ceoPhone: value }));
                                    }}
                                    className="flex-1 px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                    placeholder="50-1234567"
                            />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">מספר טלפון מלא: {formData.ceoPhoneCountry} {formData.ceoPhone || '...'}</p>
                        </div>

                        {/* Company Name */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-400" />
                                שם החברה <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.companyName}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="שם החברה בע״מ"
                            />
                        </div>

                        {/* Company ID (ח.פ./ע.מ.) */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-400" />
                                ח.פ./ע.מ. (לצורך חשבוניות)
                            </label>
                            <input
                                type="text"
                                value={formData.companyId}
                                onChange={(e) => {
                                    // Only allow digits and dashes
                                    const value = e.target.value.replace(/[^\d-]/g, '');
                                    setFormData(prev => ({ ...prev, companyId: value }));
                                }}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="123456789"
                            />
                            <p className="text-xs text-slate-500 mt-1">מספר זה ישמש ליצירת חשבוניות</p>
                        </div>

                        {/* Company Logo */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Upload size={16} className="text-indigo-400" />
                                לוגו החברה
                            </label>
                            <div className="space-y-3">
                                {formData.companyLogo && (
                                    <div className="w-32 h-32 rounded-xl border-2 border-white/10 bg-black/40 backdrop-blur-sm overflow-hidden shadow-lg">
                                        <img src={formData.companyLogo} alt="Company Logo" className="w-full h-full object-contain p-2" />
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 file:cursor-pointer outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                />
                                <p className="text-xs text-slate-400">מומלץ להעלות קובץ PNG או SVG שקוף (מקסימום 5MB)</p>
                            </div>
                        </div>

                        {/* Company Address */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <MapPin size={16} className="text-indigo-400" />
                                כתובת החברה
                            </label>
                            <input
                                type="text"
                                value={formData.companyAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyAddress: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="רחוב, עיר, מיקוד"
                            />
                        </div>

                        {/* Company Website */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-indigo-400" />
                                אתר החברה
                            </label>
                            <input
                                type="url"
                                value={formData.companyWebsite}
                                onChange={(e) => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-all"
                                placeholder="https://www.company.com"
                            />
                        </div>

                        {/* Additional Notes */}
                        <div>
                            <label className="block text-sm font-bold text-white mb-2 flex items-center gap-2">
                                <FileText size={16} className="text-indigo-400" />
                                הערות נוספות
                            </label>
                            <textarea
                                value={formData.additionalNotes}
                                onChange={(e) => setFormData(prev => ({ ...prev, additionalNotes: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl text-white placeholder-slate-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 resize-none transition-all"
                                placeholder="הערות או מידע נוסף..."
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/50 backdrop-blur-sm border border-white/10 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    שולח...
                                </>
                            ) : (
                                <>
                                    <Check size={20} />
                                    שלח פרטים
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer with Nexus Branding */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-6 h-6 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <div className="w-3 h-3 bg-white rounded-full"></div>
                            </div>
                            <span className="text-sm font-bold text-slate-400">Powered by</span>
                            <span className="text-sm font-black text-white">Nexus OS</span>
                        </div>
                        <p className="text-xs text-slate-500">
                            מערכת ניהול עסקים מתקדמת • בטוח ומאובטח • תמיכה 24/7
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}

