'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Phone, Save, CircleCheckBig, CircleAlert, ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, Headphones } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';
import { usePathname } from 'next/navigation';

// Zod schema matching real VoiceCenter credentials
const telephonyConfigSchema = z.object({
    provider: z.literal('voicenter'),
    credentials: z.object({
        code: z.string().min(1, 'קוד Click2Call הוא שדה חובה'),
        defaultExtension: z.string().optional(),
        eventsToken: z.string().optional(),
        email: z.string().optional(),
        password: z.string().optional(),
        sipUsername: z.string().optional(),
        sipPassword: z.string().optional(),
        webrtcToken: z.string().optional(),
    }),
    isActive: z.boolean()
});

type TelephonyConfigFormData = z.infer<typeof telephonyConfigSchema>;

interface TelephonyIntegration {
    id: string;
    provider: string;
    isActive: boolean;
    configured: boolean;
    createdAt: string;
    updatedAt: string;
}

interface TelephonyConfigResponse {
    tenantId: string;
    integrations: TelephonyIntegration[];
}

// Simple toast component without external dependencies
const SimpleToast: React.FC<{
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 4000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-bold ${
            type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
            {type === 'success' ? <CircleCheckBig size={16} /> : <CircleAlert size={16} />}
            {message}
        </div>
    );
};

export const TelephonyConfigForm: React.FC = () => {
    const pathname = usePathname();
    const orgSlug = pathname?.match(/\/w\/([^/]+)/)?.[1] || '';
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [existingIntegration, setExistingIntegration] = useState<TelephonyIntegration | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const addToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
    };

    const {
        register,
        handleSubmit,
        formState: { errors },
        setValue,
        watch
    } = useForm<TelephonyConfigFormData>({
        resolver: zodResolver(telephonyConfigSchema),
        defaultValues: {
            provider: 'voicenter',
            credentials: {
                code: '',
                defaultExtension: '',
                eventsToken: '',
                email: '',
                password: '',
                sipUsername: '',
                sipPassword: '',
                webrtcToken: '',
            },
            isActive: false
        }
    });

    const isActive = watch('isActive');

    // Fetch existing configuration on mount
    useEffect(() => {
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/settings/telephony', {
                    headers: orgSlug ? { 'x-org-id': encodeURIComponent(orgSlug) } : {},
                });
                if (!response.ok) {
                    throw new Error('שגיאה בטעינת התצורה');
                }

                const data: TelephonyConfigResponse = await response.json();
                
                const voicenterIntegration = data.integrations.find(
                    (int) => int.provider.toLowerCase() === 'voicenter'
                );

                if (voicenterIntegration) {
                    setExistingIntegration(voicenterIntegration);
                    setValue('isActive', voicenterIntegration.isActive);
                }
            } catch (error: unknown) {
                console.error('Error fetching telephony config:', error);
                if (!(error instanceof Error) || error.message !== 'שגיאה בטעינת התצורה') {
                    addToast('שגיאה בטעינת תצורת הטלפוניה', 'error');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [setValue, orgSlug]);

    const onSubmit = async (data: TelephonyConfigFormData) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/settings/telephony', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    ...(orgSlug ? { 'x-org-id': encodeURIComponent(orgSlug) } : {}),
                },
                body: JSON.stringify({
                    provider: data.provider,
                    credentials: data.credentials,
                    isActive: data.isActive
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'שגיאה בשמירה' }));
                throw new Error(errorData.error || 'שגיאה בשמירת התצורה');
            }

            const result = await response.json();
            addToast('תצורת הטלפוניה נשמרה בהצלחה', 'success');
            
            if (result.integration) {
                setExistingIntegration({
                    id: result.integration.id,
                    provider: result.integration.provider,
                    isActive: result.integration.isActive,
                    configured: true,
                    createdAt: existingIntegration?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }
        } catch (error: unknown) {
            console.error('Error saving telephony config:', error);
            addToast((error instanceof Error ? error.message : String(error)) || 'שגיאה בשמירת תצורת הטלפוניה', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-center py-12">
                    <Skeleton className="w-8 h-8 rounded-full bg-indigo-100" />
                    <span className="mr-3 text-gray-600">טוען תצורה...</span>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-200">
                        <Phone className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900">הגדרות Voicenter</h2>
                        <p className="text-xs text-gray-500">הפרטים מה-CPanel של Voicenter</p>
                    </div>
                </div>

                {existingIntegration && existingIntegration.configured && (
                    <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                        <CircleCheckBig className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <p className="text-xs font-bold text-emerald-800">
                            מוגדר — {existingIntegration.isActive ? 'פעיל' : 'לא פעיל'}
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    {/* ⁤⁤ Required: Click2Call Code ⁤⁤ */}
                    <div className="space-y-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <KeyRound size={14} />
                            פרטי חיבור (חובה)
                        </h3>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                קוד Click2Call <span className="text-red-500">*</span>
                            </label>
                            <p className="text-[11px] text-gray-400 mb-2">
                                נמצא ב-CPanel → API → קליק2קול (שורת &quot;code&quot;)
                            </p>
                            <input
                                type="text"
                                {...register('credentials.code')}
                                placeholder="למשל: UsANIssbzdmsSwrXDMsM"
                                dir="ltr"
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                            {errors.credentials?.code && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <CircleAlert className="w-3 h-3" />
                                    {errors.credentials.code.message}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                שלוחת ברירת מחדל
                            </label>
                            <p className="text-[11px] text-gray-400 mb-2">
                                מספר השלוחה שלך ב-Voicenter (הגדרות → משתמשים)
                            </p>
                            <input
                                type="text"
                                {...register('credentials.defaultExtension')}
                                placeholder="למשל: 1131"
                                dir="ltr"
                                className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                            />
                        </div>
                    </div>

                    {/* ⁤⁤ Advanced: Events SDK ⁤⁤ */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Headphones size={14} />
                                הגדרות מתקדמות (Events SDK)
                            </span>
                            {showAdvanced ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </button>

                        {showAdvanced && (
                            <div className="p-4 space-y-4 border-t border-slate-200">
                                <p className="text-[11px] text-gray-400">
                                    לצפייה בשיחות בזמן אמת, הקפצת מסך, ו-WebRTC widget. נמצא ב-CPanel → API → דיווחי זמן אמת.
                                </p>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        טוקן Real-Time Events
                                    </label>
                                    <input
                                        type="text"
                                        {...register('credentials.eventsToken')}
                                        placeholder="הטוקן מלשונית 'טוקן' בדיווחי זמן אמת"
                                        dir="ltr"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 text-[13px]"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        אימייל CPanel
                                    </label>
                                    <input
                                        type="email"
                                        {...register('credentials.email')}
                                        placeholder="האימייל שהגדרת ב-Voicenter CPanel"
                                        dir="ltr"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        סיסמת CPanel
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            {...register('credentials.password')}
                                            placeholder="הסיסמה שהגדרת ב-Voicenter CPanel"
                                            dir="ltr"
                                            className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 pl-12 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <hr className="border-slate-200 my-4" />

                                <p className="text-[11px] text-slate-500 font-bold uppercase">
                                    🔐 פרטי SIP (ל-WebRTC Widget)
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    נמצא ב-CPanel → הגדרות → שלוחות → גלגל שיניים על השלוחה
                                </p>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        שם משתמש SIP
                                    </label>
                                    <input
                                        type="text"
                                        {...register('credentials.sipUsername')}
                                        placeholder="למשל: 1131 (מספר השלוחה)"
                                        dir="ltr"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        סיסמת SIP
                                    </label>
                                    <input
                                        type="password"
                                        {...register('credentials.sipPassword')}
                                        placeholder="הסיסמה משדה 'סיסמת SIP' ב-CPanel"
                                        dir="ltr"
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                                    />
                                </div>

                                <hr className="border-slate-200 my-4" />

                                <p className="text-[11px] text-slate-500 font-bold uppercase">
                                    🌐 WebRTC Token (Softphone)
                                </p>
                                <p className="text-[11px] text-gray-400">
                                    JWT Token לחיוג ישיר מהדפדפן — מקבלים מ-Voicenter
                                </p>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-1.5">
                                        WebRTC Token
                                    </label>
                                    <textarea
                                        {...register('credentials.webrtcToken')}
                                        placeholder="eyJhbGciOiJSUzI1NiIs... (JWT Token ל-WebRTC)"
                                        dir="ltr"
                                        rows={3}
                                        className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-xs text-gray-900 font-mono outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-0.5">
                                הפעל אינטגרציה
                            </label>
                            <p className="text-[11px] text-gray-400">
                                {isActive ? 'המרכזייה פעילה — שיחות, הקלטות ו-Screen Pop מופעלים' : 'כבוי — לא ייצאו/ייכנסו שיחות דרך המערכת'}
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                {...register('isActive')}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                        </label>
                    </div>

                    {/* Submit */}
                    <div className="flex justify-end pt-3">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            {isSaving ? (
                                <>
                                    <Skeleton className="w-4 h-4 rounded-full bg-white/30" />
                                    שומר...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    שמור הגדרות
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
            {toast && (
                <SimpleToast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                />
            )}
        </>
    );
};

