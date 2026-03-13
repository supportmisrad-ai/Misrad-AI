'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Check, TriangleAlert, Shield, ExternalLink } from 'lucide-react';

export const AdminAiConfigPanel: React.FC = () => {
    const [aiKeyConfigured, setAiKeyConfigured] = useState(false);
    const [isCheckingAiKey, setIsCheckingAiKey] = useState(true);

    useEffect(() => {
        const checkAiKeyStatus = async () => {
            try {
                const response = await fetch('/api/settings/ai-key');
                if (response.ok) {
                    const data = await response.json();
                    setAiKeyConfigured(data.configured);
                }
            } catch (error) {
                console.error('Error checking AI key status:', error);
            } finally {
                setIsCheckingAiKey(false);
            }
        };
        checkAiKeyStatus();
    }, []);

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-8 pb-16 md:pb-20 px-4 sm:px-6 lg:px-8"
        >
            <div className="flex items-center gap-3">
                <Shield size={28} className="text-indigo-600" />
                <div>
                    <h2 className="text-xl font-bold text-gray-900">הגדרות AI — רק לאדמין</h2>
                    <p className="text-sm text-gray-500">תצורת מפתחות API ומשתני סביבה למערכת.</p>
                </div>
            </div>

            {/* Security Warning */}
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                    <Shield size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-bold text-amber-900 text-sm mb-1">אזור מוגן — רק למנהלי מערכת</h3>
                        <p className="text-xs text-amber-700">
                            הגדרות אלו משפיעות על כל המערכת. שינויים דורשים ידע טכני והבנת סיכוני אבטחה.
                        </p>
                    </div>
                </div>
            </div>

            {/* AI Key Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                <div className="flex items-center gap-2">
                    <Zap size={18} className="text-indigo-600" />
                    <h3 className="font-bold text-gray-900">מפתח AI (Google Gemini)</h3>
                </div>
                
                <p className="text-xs text-gray-500">
                    מפתח ה-API של Google Gemini מוגדר כמשתנה סביבה (environment variable) — זה הפתרון המאובטח ביותר.
                    משתמשי הקצה לא רואים את ההגדרה הזו.
                </p>

                <div className="space-y-3">
                    {isCheckingAiKey ? (
                        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl">
                            <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mr-2" />
                            <span className="text-sm text-gray-600">בודק סטטוס...</span>
                        </div>
                    ) : (
                        <>
                            <div className={`p-4 rounded-xl border-2 ${
                                aiKeyConfigured 
                                    ? 'bg-green-50 border-green-200' 
                                    : 'bg-yellow-50 border-yellow-200'
                            }`}>
                                <div className="flex items-center gap-3">
                                    {aiKeyConfigured ? (
                                        <>
                                            <Check size={20} className="text-green-600" />
                                            <div>
                                                <div className="font-bold text-sm text-green-900">מפתח AI מוגדר</div>
                                                <div className="text-xs text-green-700">המפתח מוגדר במשתני סביבה ופעיל</div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <TriangleAlert size={20} className="text-yellow-600" />
                                            <div>
                                                <div className="font-bold text-sm text-yellow-900">מפתח AI לא מוגדר</div>
                                                <div className="text-xs text-yellow-700">יש להוסיף את המפתח למשתני סביבה</div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <h4 className="font-bold text-xs text-gray-900 mb-3">איך להגדיר:</h4>
                                <div className="space-y-3 text-xs text-gray-600">
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold text-gray-900">1.</span>
                                        <div>
                                            קבל מפתח: 
                                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline ml-1 inline-flex items-center gap-1">
                                                Google AI Studio <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold text-gray-900">2.</span>
                                        <div>
                                            <span className="font-medium">לפיתוח (.env.local):</span>
                                            <code className="block mt-1 p-2 bg-gray-900 text-green-400 rounded font-mono text-[10px] dir-ltr text-left">
                                                GEMINI_API_KEY=your-api-key-here
                                            </code>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold text-gray-900">3.</span>
                                        <div>
                                            <span className="font-medium">ב-Vercel פרודוקשן:</span>
                                            <p className="mt-1">Settings → Environment Variables → הוסף GEMINI_API_KEY</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200">
                                    <div className="flex items-start gap-2 text-amber-700 text-xs">
                                        <TriangleAlert size={14} className="flex-shrink-0 mt-0.5" />
                                        <p><strong>חשוב:</strong> המפתח נשמר רק בשרת ולא נחשף ללקוח. אף פעם אל תשמור מפתחות API בקוד הקליינט!</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Other Admin Settings */}
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-sm mb-1">מדריך הגדרות מערכת</h3>
                        <p className="text-xs text-slate-400">תיעוד מלא של כל משתני הסביבה הנדרשים</p>
                    </div>
                    <a 
                        href="https://docs.misrad-ai.com/admin/config" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors inline-flex items-center gap-2"
                    >
                        פתח docs <ExternalLink size={14} />
                    </a>
                </div>
            </div>
        </motion.div>
    );
};

export default AdminAiConfigPanel;
