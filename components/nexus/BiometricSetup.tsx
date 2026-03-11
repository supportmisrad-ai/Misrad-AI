'use client';

import React, { useState, useCallback } from 'react';
import { useUser, useSignIn } from '@clerk/nextjs';
import { CircleCheckBig, CircleAlert, Scan, Lock } from 'lucide-react';
import { SetPasswordInline } from '@/components/shared/SetPasswordInline';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeletons';

type FlowStep = 'idle' | 'creating' | 'verify_password' | 'no_password' | 'success' | 'error';

export const BiometricSetup: React.FC = () => {
    const { user } = useUser();
    const { signIn, setActive, isLoaded: signInLoaded } = useSignIn();
    const [flowStep, setFlowStep] = useState<FlowStep>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [password, setPassword] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const hasPasskeys = user?.passkeys && user.passkeys.length > 0;
    const hasPassword = user?.passwordEnabled ?? false;
    const userEmail = user?.primaryEmailAddress?.emailAddress ?? '';

    /** Attempt to create a passkey. Returns true on success, 'needs_verification' if reverification required, or throws. */
    const attemptCreatePasskey = useCallback(async (): Promise<true | 'needs_verification'> => {
        if (!user) throw new Error('משתמש לא מחובר');

        const userRecord = user as unknown as Record<string, unknown>;
        const createFn = userRecord.createPasskey;

        if (typeof createFn !== 'function') {
            // Fallback: try user.passkeys.create()
            const passkeysRecord = user.passkeys as unknown as Record<string, unknown> | undefined;
            if (passkeysRecord && typeof passkeysRecord.create === 'function') {
                try {
                    await (passkeysRecord.create as (opts: { name: string }) => Promise<unknown>)({
                        name: 'MISRAD AI - זיהוי ביומטרי',
                    });
                    return true;
                } catch (err: unknown) {
                    const msg = String((err as Record<string, unknown>)?.message ?? err);
                    if (msg.includes('additional verification') || msg.includes('verification required') || msg.includes('need to provide additional')) {
                        return 'needs_verification';
                    }
                    throw err;
                }
            }
            throw new Error('Passkey creation not available on this Clerk version');
        }

        try {
            await (createFn as (opts: { name: string }) => Promise<unknown>).call(user, {
                name: 'MISRAD AI - זיהוי ביומטרי',
            });
            return true;
        } catch (err: unknown) {
            const msg = String((err as Record<string, unknown>)?.message ?? err);
            if (msg.includes('additional verification') || msg.includes('verification required') || msg.includes('need to provide additional')) {
                return 'needs_verification';
            }
            throw err;
        }
    }, [user]);

    const handleSetupPasskey = async () => {
        if (!user) {
            setErrorMessage('משתמש לא מחובר');
            setFlowStep('error');
            return;
        }

        if (typeof window !== 'undefined' && !window.PublicKeyCredential) {
            setErrorMessage('המכשיר או הדפדפן שלך לא תומכים בזיהוי ביומטרי. נסה ב-Chrome, Safari או Edge.');
            setFlowStep('error');
            return;
        }

        setFlowStep('creating');
        setErrorMessage('');
        setPassword('');

        try {
            const result = await attemptCreatePasskey();
            if (result === true) {
                setFlowStep('success');
                setTimeout(() => setFlowStep('idle'), 3000);
                return;
            }
            // needs_verification - route to the correct sub-flow
            if (hasPassword) {
                setFlowStep('verify_password');
            } else {
                setFlowStep('no_password');
            }
        } catch (err: unknown) {
            handlePasskeyError(err);
        }
    };

    /** User has a password → verify it to get a fresh L2 session, then retry passkey creation */
    const handlePasswordVerifyAndCreate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!signInLoaded || !signIn || !password.trim() || !userEmail) return;

        setIsProcessing(true);
        setErrorMessage('');

        try {
            // Create a fresh sign-in to get a verified (L2) session
            const result = await signIn.create({
                identifier: userEmail,
                password: password.trim(),
            });

            if (result.status === 'complete' && result.createdSessionId) {
                await setActive({ session: result.createdSessionId });
                // Wait for Clerk context to propagate the new session
                await new Promise(r => setTimeout(r, 1200));
                try { await user?.reload(); } catch { /* ignore */ }

                // Retry passkey creation with fresh session
                setFlowStep('creating');
                const createResult = await attemptCreatePasskey();
                if (createResult === true) {
                    setFlowStep('success');
                    setPassword('');
                    setTimeout(() => setFlowStep('idle'), 3000);
                } else {
                    setErrorMessage('האימות הצליח אך יצירת ה-Passkey עדיין נכשלה. נסה להתנתק ולהתחבר מחדש ואז לנסות שוב.');
                    setFlowStep('error');
                }
            } else if (result.status === 'needs_second_factor') {
                setErrorMessage('נדרש אימות דו-שלבי (2FA). התנתק והתחבר מחדש עם אימות מלא, ואז נסה שוב.');
                setFlowStep('error');
            } else {
                setErrorMessage('האימות לא הושלם. בדוק את הסיסמה ונסה שוב.');
            }
        } catch (err: unknown) {
            const clerkErr = err as { errors?: Array<{ message?: string; code?: string }> };
            const code = clerkErr?.errors?.[0]?.code ?? '';
            const msg = String(clerkErr?.errors?.[0]?.message ?? (err as Error)?.message ?? err);

            if (code === 'form_password_incorrect' || msg.includes('incorrect') || msg.includes('password')) {
                setErrorMessage('סיסמה שגויה. נסה שוב.');
            } else {
                setErrorMessage(`שגיאה באימות: ${msg}`);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePasskeyError = (err: unknown) => {
        const errObj = err instanceof Error ? err : null;
        const msg = errObj?.message?.toLowerCase() ?? String(err).toLowerCase();
        let errorMsg = 'שגיאה בהפעלת זיהוי ביומטרי';

        if (msg.includes('not supported') || msg.includes('לא תומך') || msg.includes('unsupported')) {
            errorMsg = 'המכשיר או הדפדפן שלך לא תומכים בזיהוי ביומטרי. נסה ב-Chrome, Safari או Edge.';
        } else if (msg.includes('cancelled') || msg.includes('בוטל') || msg.includes('abort')) {
            // User cancelled - silently return to idle
            setFlowStep('idle');
            return;
        } else if (msg.includes('timeout')) {
            errorMsg = 'הפעולה ארכה יותר מדי זמן. נסה שוב.';
        } else if (msg.includes('not allowed') || msg.includes('permission')) {
            errorMsg = 'אין הרשאה ליצור Passkey. בדוק את הגדרות הדפדפן.';
        } else if (msg.includes('not enabled')) {
            errorMsg = 'Passkeys לא מופעלים במערכת. פנה למנהל המערכת.';
        } else if (errObj?.message) {
            errorMsg = errObj.message;
        }

        console.error('Passkey creation error:', err);
        setErrorMessage(errorMsg);
        setFlowStep('error');
    };

    const isLoading = flowStep === 'creating';

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

                    <AnimatePresence mode="sync">
                        {flowStep === 'success' && (
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

                        {flowStep === 'error' && (
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

                        {flowStep === 'verify_password' && (
                            <motion.form
                                key="verify-password"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                onSubmit={handlePasswordVerifyAndCreate}
                                className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3"
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <Lock size={16} className="text-blue-600" />
                                    <p className="text-sm font-bold text-blue-800">אימות נדרש</p>
                                </div>
                                <p className="text-xs text-blue-700">
                                    לאבטחת חשבונך, הזן את הסיסמה שלך כדי להפעיל זיהוי ביומטרי.
                                </p>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="הזן סיסמה"
                                    autoFocus
                                    className="w-full bg-white border border-blue-200 rounded-lg py-2.5 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-bold"
                                    dir="ltr"
                                />
                                {errorMessage && (
                                    <p className="text-xs text-red-600 font-bold">{errorMessage}</p>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="submit"
                                        disabled={isProcessing || !password.trim()}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                    >
                                        {isProcessing ? 'מאמת...' : 'אמת והפעל'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setFlowStep('idle'); setPassword(''); setErrorMessage(''); }}
                                        className="px-4 py-2.5 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-all text-sm"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            </motion.form>
                        )}

                        {flowStep === 'no_password' && (
                            <motion.div
                                key="no-password"
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                            >
                                <SetPasswordInline
                                    title="נדרשת הגדרת סיסמה"
                                    description="נרשמת באמצעות Google ועדיין לא הגדרת סיסמה. הגדר סיסמה כדי להפעיל זיהוי ביומטרי."
                                    onSuccess={async () => {
                                        // Password was set + fresh session created → retry passkey creation
                                        setFlowStep('creating');
                                        try {
                                            const result = await attemptCreatePasskey();
                                            if (result === true) {
                                                setFlowStep('success');
                                                setTimeout(() => setFlowStep('idle'), 3000);
                                            } else {
                                                setErrorMessage('הסיסמה הוגדרה בהצלחה! כעת התנתק והתחבר מחדש, ואז נסה שוב להפעיל זיהוי ביומטרי.');
                                                setFlowStep('error');
                                            }
                                        } catch {
                                            setErrorMessage('הסיסמה הוגדרה בהצלחה! כעת תוכל להפעיל זיהוי ביומטרי.');
                                            setFlowStep('idle');
                                        }
                                    }}
                                    onCancel={() => { setFlowStep('idle'); setErrorMessage(''); }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {(flowStep === 'idle' || flowStep === 'creating' || flowStep === 'success' || flowStep === 'error') && (
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
                    )}

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
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

