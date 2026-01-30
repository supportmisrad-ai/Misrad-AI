'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useData } from '../../context/DataContext';
import { Phone, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

// Zod schema for form validation
const telephonyConfigSchema = z.object({
    provider: z.literal('voicenter'),
    credentials: z.object({
        UserCode: z.string().min(1, 'UserCode הוא שדה חובה'),
        OrganizationCode: z.string().min(1, 'OrganizationCode הוא שדה חובה')
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

export const TelephonyConfigForm: React.FC = () => {
    const { addToast } = useData();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [existingIntegration, setExistingIntegration] = useState<TelephonyIntegration | null>(null);
    const [credentials, setCredentials] = useState<{ UserCode?: string; OrganizationCode?: string }>({});

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
                UserCode: '',
                OrganizationCode: ''
            },
            isActive: false
        }
    });

    const provider = watch('provider');
    const isActive = watch('isActive');

    // Fetch existing configuration on mount
    useEffect(() => {
        const fetchConfig = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/settings/telephony');
                if (!response.ok) {
                    throw new Error('שגיאה בטעינת התצורה');
                }

                const data: TelephonyConfigResponse = await response.json();
                
                // Find Voicenter integration if exists
                const voicenterIntegration = data.integrations.find(
                    (int) => int.provider.toLowerCase() === 'voicenter'
                );

                if (voicenterIntegration) {
                    setExistingIntegration(voicenterIntegration);
                    setValue('isActive', voicenterIntegration.isActive);
                }
            } catch (error: any) {
                console.error('Error fetching telephony config:', error);
                // Don't show error toast on initial load if no config exists
                if (error.message !== 'שגיאה בטעינת התצורה') {
                    addToast('שגיאה בטעינת תצורת הטלפוניה', 'error');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchConfig();
    }, [setValue, addToast]);

    // Load credentials if integration exists (separate call to get credentials)
    useEffect(() => {
        const loadCredentials = async () => {
            if (existingIntegration) {
                try {
                    // Note: The GET endpoint doesn't return credentials for security
                    // So we'll just use the stored credentials from state
                    // In a real implementation, you might want to decrypt them here
                } catch (error) {
                    console.error('Error loading credentials:', error);
                }
            }
        };

        loadCredentials();
    }, [existingIntegration]);

    const onSubmit = async (data: TelephonyConfigFormData) => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/settings/telephony', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
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
            
            // Update existing integration state
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
        } catch (error: any) {
            console.error('Error saving telephony config:', error);
            addToast(error.message || 'שגיאה בשמירת תצורת הטלפוניה', 'error');
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
        <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <Phone className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">הגדרות טלפוניה</h2>
                    <p className="text-sm text-gray-500 mt-1">הגדר את ספק הטלפוניה שלך (BYOC)</p>
                </div>
            </div>

            {existingIntegration && existingIntegration.configured && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-bold text-green-900">תצורה קיימת נמצאה</p>
                        <p className="text-xs text-green-700 mt-1">
                            ספק: {existingIntegration.provider} | 
                            סטטוס: {existingIntegration.isActive ? 'פעיל' : 'לא פעיל'}
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                        ספק טלפוניה
                    </label>
                    <select
                        {...register('provider')}
                        className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="voicenter">Voicenter</option>
                    </select>
                    {errors.provider && (
                        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errors.provider.message}
                        </p>
                    )}
                </div>

                {/* Voicenter Credentials */}
                {provider === 'voicenter' && (
                    <div className="space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <h3 className="text-sm font-bold text-gray-900 mb-4">פרטי התחברות Voicenter</h3>
                        
                        {/* UserCode */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                UserCode <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                {...register('credentials.UserCode')}
                                placeholder="הזן את ה-UserCode שלך"
                                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.credentials?.UserCode && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.credentials.UserCode.message}
                                </p>
                            )}
                        </div>

                        {/* OrganizationCode */}
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">
                                OrganizationCode <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                {...register('credentials.OrganizationCode')}
                                placeholder="הזן את ה-OrganizationCode שלך"
                                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.credentials?.OrganizationCode && (
                                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    {errors.credentials.OrganizationCode.message}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-1">
                            הפעל אינטגרציה
                        </label>
                        <p className="text-xs text-gray-500">
                            כאשר מופעל, האינטגרציה תהיה זמינה לשימוש במערכת
                        </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            {...register('isActive')}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
    );
};

