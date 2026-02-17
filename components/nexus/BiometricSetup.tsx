'use client';

import React, { useState } from 'react';
import { useUser, useClerk } from '@clerk/nextjs';
import { Shield, Smartphone, CircleCheckBig, CircleAlert, Loader2, X, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';

export const BiometricSetup: React.FC = () => {
    const { user } = useUser();
    const clerk = useClerk();
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const handleSetupPasskey = async () => {
        if (!user) {
            setStatus('error');
            setErrorMessage('משתמש לא מחובר');
            return;
        }

        setIsLoading(true);
        setStatus('idle');
        setErrorMessage('');

        try {
            // Check if WebAuthn is supported
            if (!window.PublicKeyCredential) {
                throw new Error('המכשיר או הדפדפן שלך לא תומכים בזיהוי ביומטרי');
            }

            if (!user) {
                throw new Error('משתמש לא מחובר');
            }

            // Clerk Passkeys API - try multiple methods
            // Note: Clerk's Passkey API might vary by version
            let passkeyCreated = false;
            let lastError: unknown = null;

            // Method 1: Try user.createPasskey() - Clerk's standard method
            const userRecord = user as unknown as Record<string, unknown>;
            if (user && typeof userRecord.createPasskey === 'function') {
                try {
                    console.log('Trying user.createPasskey()...');
                    await (userRecord.createPasskey as (opts: { name: string }) => Promise<unknown>)({
                        name: 'MISRAD AI - זיהוי ביומטרי',
                    });
                    passkeyCreated = true;
                } catch (err: unknown) {
                    console.error('user.createPasskey() failed:', err);
                    lastError = err;
                }
            }

            // Method 2: Try user.passkeys.create() - alternative API
            const passkeysRecord = user?.passkeys as unknown as Record<string, unknown> | undefined;
            if (!passkeyCreated && passkeysRecord && typeof passkeysRecord.create === 'function') {
                try {
                    console.log('Trying user.passkeys.create()...');
                    await (passkeysRecord.create as (opts: { name: string }) => Promise<unknown>)({
                        name: 'MISRAD AI - זיהוי ביומטרי',
                    });
                    passkeyCreated = true;
                } catch (err: unknown) {
                    console.error('user.passkeys.create() failed:', err);
                    lastError = err;
                }
            }

            // Method 3: Try using Clerk client directly
            if (!passkeyCreated && clerk) {
                try {
                    console.log('Trying clerk.user.createPasskey()...');
                    const clerkRecord = clerk as unknown as Record<string, unknown>;
                    const clerkUser = clerkRecord.user as Record<string, unknown> | undefined;
                    if (clerkUser && typeof clerkUser.createPasskey === 'function') {
                        await (clerkUser.createPasskey as (opts: { name: string }) => Promise<unknown>)({
                            name: 'MISRAD AI - זיהוי ביומטרי',
                        });
                        passkeyCreated = true;
                    }
                } catch (err: unknown) {
                    console.error('clerk.user.createPasskey() failed:', err);
                    lastError = err;
                }
            }

            // If all methods fail, provide helpful error message
            if (!passkeyCreated) {
                const errorDetails = lastError instanceof Error ? lastError.message : String(lastError || 'לא ידוע');
                console.error('All passkey creation methods failed. Last error:', errorDetails);
                
                // Check if it's a specific Clerk error
                if (errorDetails.includes('not enabled') || errorDetails.includes('not enabled on this instance')) {
                    throw new Error('מפתחות אבטחה (Passkeys) לא מופעלים במערכת כרגע. אנא פנה למנהל המערכת להפעלת הפיצ\'ר.');
                } else if (errorDetails.includes('additional verification') || errorDetails.includes('verification required') || errorDetails.includes('need to provide additional')) {
                    throw new Error('נדרש אימות נוסף. אנא ודא שיש לך אימות דו-שלבי (2FA) מופעל, או התחבר מחדש עם אימות נוסף לפני יצירת מפתח אבטחה.');
                } else if (errorDetails.includes('passkey') || errorDetails.includes('webauthn')) {
                    throw new Error(`שגיאה ביצירת מפתח אבטחה: ${errorDetails}. אנא פנה למנהל המערכת.`);
                } else if (errorDetails.includes('not supported') || errorDetails.includes('unsupported')) {
                    throw new Error('הדפדפן או המכשיר שלך לא תומכים במפתחות אבטחה. נסה בדפדפן אחר או במכשיר אחר.');
                } else {
                    throw new Error(`לא ניתן ליצור מפתח אבטחה. שגיאה: ${errorDetails}. אנא בדוק את הקונסול לפרטים נוספים.`);
                }
            }

            setStatus('success');
            
            // Reset success message after 3 seconds
            setTimeout(() => {
                setStatus('idle');
            }, 3000);

        } catch (error: unknown) {
            console.error('Passkey creation error:', error);
            const errorObj = error instanceof Error ? error : null;
            console.error('Error details:', {
                message: errorObj?.message,
                name: errorObj?.name,
                stack: errorObj?.stack,
                user: user ? 'exists' : 'missing',
                clerk: clerk ? 'exists' : 'missing',
            });
            
            let errorMsg = 'שגיאה בהפעלת זיהוי ביומטרי';
            
            if (errorObj?.message) {
                const msg = errorObj.message.toLowerCase();
                
                if (msg.includes('not supported') || msg.includes('לא תומך') || msg.includes('unsupported')) {
                    errorMsg = 'המכשיר או הדפדפן שלך לא תומכים בזיהוי ביומטרי. נסה ב-Chrome, Safari או Edge.';
                } else if (msg.includes('additional verification') || msg.includes('verification required') || msg.includes('need to provide additional')) {
                    errorMsg = 'נדרש אימות נוסף. אנא הפעל אימות דו-שלבי (2FA) או התחבר מחדש עם אימות נוסף לפני יצירת Passkey.';
                } else if (msg.includes('cancelled') || msg.includes('בוטל') || msg.includes('abort')) {
                    errorMsg = 'הפעולה בוטלה על ידך';
                } else if (msg.includes('timeout')) {
                    errorMsg = 'הפעולה ארכה יותר מדי זמן. נסה שוב';
                } else if (msg.includes('not allowed') || msg.includes('permission')) {
                    errorMsg = 'אין הרשאה ליצור Passkey. אנא בדוק את הגדרות הדפדפן.';
                } else if (msg.includes('passkey') || msg.includes('webauthn')) {
                    errorMsg = `בעיה ביצירת Passkey: ${errorObj.message}`;
                } else {
                    errorMsg = errorObj.message;
                }
            } else {
                errorMsg = `שגיאה לא ידועה: ${String(error)}`;
            }
            
            // Add debugging info for developer
            if (process.env.NODE_ENV === 'development') {
                errorMsg += ` (פרטים בקונסול)`;
            }
            
            setErrorMessage(errorMsg);
            setStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    // Check if user already has passkeys
    const hasPasskeys = user?.passkeys && user.passkeys.length > 0;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Scan size={24} className="text-white" />
                </div>
                
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                            זיהוי ביומטרי (Passkeys)
                        </h3>
                        {hasPasskeys && (
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-200">
                                פעיל
                            </span>
                        )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-4">
                        השתמש ב-Face ID, Touch ID או מפתח אבטחה כדי להתחבר במהירות וביטחון ללא סיסמה.
                    </p>

                    <AnimatePresence mode="wait">
                        {status === 'success' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2"
                            >
                                <CircleCheckBig size={18} className="text-green-600 flex-shrink-0" />
                                <p className="text-sm font-bold text-green-700">
                                    זיהוי ביומטרי הופעל בהצלחה!
                                </p>
                            </motion.div>
                        )}

                        {status === 'error' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"
                            >
                                <CircleAlert size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-red-700 mb-1">
                                        שגיאה בהפעלת זיהוי ביומטרי
                                    </p>
                                    <p className="text-xs text-red-600">
                                        {errorMessage}
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleSetupPasskey}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-gray-200"
                        >
                            {isLoading ? (
                                <>
                                    <Skeleton className="w-[18px] h-[18px] rounded-full bg-white/30" />
                                    <span>מפעיל...</span>
                                </>
                            ) : hasPasskeys ? (
                                <>
                                    <Scan size={18} />
                                    <span>הוסף מפתח נוסף</span>
                                </>
                            ) : (
                                <>
                                    <Scan size={18} />
                                    <span>הפעל זיהוי ביומטרי (FaceID/TouchID)</span>
                                </>
                            )}
                        </button>

                        {hasPasskeys && (
                            <div className="text-xs text-gray-500">
                                {user.passkeys.length} מפתח{user.passkeys.length > 1 ? 'ות' : ''} פעיל{user.passkeys.length > 1 ? 'ים' : ''}
                            </div>
                        )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                            <CircleAlert size={14} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold mb-1">מידע חשוב:</p>
                                <ul className="list-disc list-inside space-y-1 text-gray-600">
                                    <li>זיהוי ביומטרי עובד רק בדפדפנים תומכים (Chrome, Safari, Edge)</li>
                                    <li>במחשב, תוכל להשתמש במפתח אבטחה פיזי</li>
                                    <li>במכשיר נייד, תוכל להשתמש ב-Face ID או Touch ID</li>
                                    <li>תמיד תוכל להתחבר גם עם סיסמה</li>
                                    <li className="font-bold text-orange-600">נדרש אימות דו-שלבי (2FA) פעיל לפני יצירת Passkey</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

