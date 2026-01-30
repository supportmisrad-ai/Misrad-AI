
import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Calendar, Webhook, Copy, Check, Code, Play, FileText, AlertTriangle } from 'lucide-react';
import { GreenInvoiceConnectModal } from '../GreenInvoiceConnectModal';
import { Skeleton } from '@/components/ui/skeletons';

export const IntegrationsTab: React.FC = () => {
    const { isCalendarConnected, connectGoogleCalendar, isGreenInvoiceConnected, connectGreenInvoice } = useData();
    const [webhookUrl] = useState('');
    const [copied, setCopied] = useState('');
    const [showGreenInvoiceModal, setShowGreenInvoiceModal] = useState(false);
    const [aiKeyConfigured, setAiKeyConfigured] = useState(false);
    const [isCheckingAiKey, setIsCheckingAiKey] = useState(true);
    const [oauthError, setOauthError] = useState<string | null>(null);
    const [oauthSuccess, setOauthSuccess] = useState<string | null>(null);
    const [oauthConfig, setOauthConfig] = useState<{
        configured: boolean;
        details?: any;
        recommendations?: any;
    } | null>(null);
    const [isCheckingOAuth, setIsCheckingOAuth] = useState(true);
    
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied('url');
        setTimeout(() => setCopied(''), 2000);
    };

    // Check AI key status on mount
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

    // Check Google OAuth configuration
    useEffect(() => {
        const checkOAuthConfig = async () => {
            try {
                const response = await fetch('/api/integrations/google/test');
                if (response.ok) {
                    const data = await response.json();
                    setOauthConfig(data);
                }
            } catch (error) {
                console.error('Error checking OAuth config:', error);
            } finally {
                setIsCheckingOAuth(false);
            }
        };
        checkOAuthConfig();
    }, []);

            // Check for OAuth errors and success in URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const error = params.get('error');
        const success = params.get('success');
        
        if (error) {
            if (error === 'oauth_not_configured' || error === 'invalid_client') {
                setOauthError('invalid_client');
            } else if (error === 'oauth_denied') {
                setOauthError('oauth_denied');
            } else if (error.includes('redirect_uri_mismatch') || error.includes('redirect')) {
                setOauthError('redirect_uri_mismatch');
            }
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
        }
        
        if (success) {
            if (success === 'calendar_connected' || success === 'green_invoice_connected') {
                setOauthSuccess(success);
                // Clean URL after showing success message
                setTimeout(() => {
                    window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
                }, 5000); // Auto-hide after 5 seconds
            }
        }
    }, []);

    return (
        <motion.div key="integrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-16 md:pb-20">
            <AnimatePresence>
                {showGreenInvoiceModal && (
                    <GreenInvoiceConnectModal
                        isOpen={showGreenInvoiceModal}
                        onClose={() => setShowGreenInvoiceModal(false)}
                        onSuccess={() => {
                            // Navigate to integrations tab with success message
                            const currentUrl = window.location.href;
                            const baseUrl = currentUrl.split('#')[0];
                            window.location.href = `${baseUrl}#/settings?tab=integrations&success=green_invoice_connected`;
                        }}
                    />
                )}
            </AnimatePresence>

            <div>
                <h2 className="text-xl font-bold text-gray-900">אינטגרציות וחיבורים</h2>
                <p className="text-sm text-gray-500">חבר את Nexus למערכות חיצוניות לאוטומציה מלאה.</p>
            </div>

            {/* OAuth Success Messages */}
            <AnimatePresence>
                {oauthSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-50 border-2 border-green-200 rounded-xl p-4"
                    >
                        <div className="flex items-start gap-3">
                            <Check size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-bold text-sm text-green-900 mb-1">
                                    {oauthSuccess === 'calendar_connected' 
                                        ? '✅ Google Calendar מחובר בהצלחה!' 
                                        : '✅ מורנינג מחובר בהצלחה!'}
                                </h3>
                                <p className="text-xs text-green-700">
                                    {oauthSuccess === 'calendar_connected' 
                                        ? 'החיבור ל-Google Calendar הושלם בהצלחה. המשימות שלך יסתנכרנו אוטומטית.' 
                                        : 'החיבור למורנינג הושלם בהצלחה. אתה יכול ליצור חשבוניות ישירות מהמערכת.'}
                                </p>
                            </div>
                            <button
                                onClick={() => setOauthSuccess(null)}
                                className="text-green-600 hover:text-green-800 flex-shrink-0 text-lg font-bold leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* OAuth Error Messages */}
            <AnimatePresence>
                {oauthError && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 border-2 border-red-200 rounded-xl p-4"
                    >
                        <div className="flex items-start gap-3">
                            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-bold text-sm text-red-900 mb-2">
                                    {oauthError === 'invalid_client' 
                                        ? 'שגיאת הגדרת OAuth' 
                                        : oauthError === 'redirect_uri_mismatch'
                                        ? 'שגיאת Redirect URI'
                                        : 'שגיאה בהתחברות ל-Google'}
                                </h3>
                                {oauthError === 'redirect_uri_mismatch' ? (
                                    <div className="text-xs text-red-700 space-y-2">
                                        <p className="font-bold">הבעיה: ה-Redirect URI לא תואם למה שהוגדר ב-Google Cloud Console</p>
                                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 my-2">
                                            <p className="font-bold mb-1">צעדים לתיקון:</p>
                                            <ol className="list-decimal list-inside space-y-1 mr-4">
                                                <li>פתח את <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Cloud Console → Credentials</a></li>
                                                <li>לחץ על ה-OAuth 2.0 Client ID שלך</li>
                                                <li>ב-<strong>"Authorized redirect URIs"</strong> הוסף בדיוק (ללא רווחים):</li>
                                            </ol>
                                            <div className="bg-white p-2 rounded mt-2 font-mono text-[10px] dir-ltr text-left border border-red-300">
                                                http://localhost:4000/api/integrations/google/callback
                                            </div>
                                            <p className="mt-2 text-[10px]">⚠️ חשוב: ה-URL חייב להיות זהה בדיוק - כולל http (לא https), localhost, הפורט 4000, והנתיב המלא</p>
                                            <p className="mt-2 text-[10px]">💡 אחרי הוספת ה-URI, לחץ "שמור" ולאחר מכן נסה להתחבר שוב</p>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <a 
                                                href="https://console.cloud.google.com/apis/credentials" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-red-700 underline font-bold text-xs"
                                            >
                                                → פתח Google Cloud Console
                                            </a>
                                        </div>
                                    </div>
                                ) : oauthError === 'invalid_client' ? (
                                    <div className="text-xs text-red-700 space-y-2">
                                        <p>המפתח OAuth של Google לא נמצא או לא תקין. יש לבדוק:</p>
                                        <ol className="list-decimal list-inside space-y-1 mr-4">
                                            <li>ודא שה-<code className="bg-red-100 px-1 rounded">GOOGLE_CLIENT_ID</code> ו-<code className="bg-red-100 px-1 rounded">GOOGLE_CLIENT_SECRET</code> מוגדרים ב-<code className="bg-red-100 px-1 rounded">.env.local</code></li>
                                            <li>ודא שהמפתחות נכונים ב-<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="underline font-bold">Google Cloud Console</a></li>
                                            <li>ודא שה-<code className="bg-red-100 px-1 rounded">GOOGLE_REDIRECT_URI</code> תואם בדיוק ל-<strong>Authorized redirect URIs</strong> ב-Google Cloud Console</li>
                                            <li>עצור והפעל מחדש את השרת אחרי הוספת המשתנים</li>
                                        </ol>
                                        <div className="mt-3 pt-3 border-t border-red-200">
                                            <a 
                                                href="https://console.cloud.google.com/apis/credentials" 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-red-700 underline font-bold text-xs"
                                            >
                                                → פתח Google Cloud Console
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-red-700">ההרשאה בוטלה. נסה שוב והפעם אשר את ההרשאות.</p>
                                )}
                            </div>
                            <button
                                onClick={() => setOauthError(null)}
                                className="text-red-600 hover:text-red-800 flex-shrink-0 text-lg font-bold leading-none"
                            >
                                ×
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Integrations */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-green-600" /> מערכות כספים</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-green-100">
                                <img 
                                    src="https://www.greeninvoice.co.il/wp-content/uploads/2021/06/green-invoice-logo.png" 
                                    alt="חשבונית ירוקה (מורנינג)" 
                                    className="w-8 h-8 object-contain"
                                    onError={(e) => {
                                        // Fallback to text if image fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                            parent.innerHTML = '<span class="text-green-600 font-bold text-xs">מ</span>';
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">מורנינג</div>
                                <div className="text-xs text-gray-500">{isGreenInvoiceConnected ? 'מחובר ופעיל' : 'לא מחובר'}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => isGreenInvoiceConnected ? null : setShowGreenInvoiceModal(true)}
                            disabled={isGreenInvoiceConnected}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isGreenInvoiceConnected ? 'bg-green-100 text-green-700 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {isGreenInvoiceConnected ? 'מחובר' : 'התחבר'}
                        </button>
                    </div>

                    <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-bold text-gray-900">מדריך התחברות</div>
                                <div className="text-xs text-gray-500">בקרוב: סרטון הסבר קצר (YouTube)</div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-700">
                                <Play size={16} />
                            </div>
                        </div>
                        <div className="aspect-video bg-black/5 flex items-center justify-center text-xs text-gray-500">
                            Placeholder: YouTube Embed
                        </div>
                    </div>
                </div>

                {/* Google Services */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Google Workspace</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <img 
                                    src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" 
                                    alt="Google Calendar" 
                                    className="w-6 h-6"
                                    onError={(e) => {
                                        // Fallback to icon if image fails to load
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        const parent = (e.target as HTMLImageElement).parentElement;
                                        if (parent) {
                                            parent.innerHTML = '<svg class="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>';
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">Google Calendar</div>
                                <div className="text-xs text-gray-500">
                                    {isCalendarConnected ? 'מחובר ופעיל' : 
                                     isCheckingOAuth ? 'בודק הגדרות...' :
                                     oauthConfig?.configured ? 'מוכן להתחברות' : 'מפתחות OAuth לא מוגדרים'}
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => connectGoogleCalendar()}
                            disabled={isCalendarConnected || !oauthConfig?.configured}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                                isCalendarConnected 
                                    ? 'bg-green-100 text-green-700 cursor-default' 
                                    : oauthConfig?.configured
                                    ? 'bg-black text-white hover:bg-gray-800'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isCalendarConnected ? 'מחובר' : 'התחבר'}
                        </button>
                    </div>
                    {!isCheckingOAuth && oauthConfig && !oauthConfig.configured && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-800">
                            <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                <div>
                                    <div className="font-bold mb-1">מפתחות OAuth לא מוגדרים</div>
                                    {oauthConfig.recommendations && (
                                        <ul className="list-disc list-inside space-y-1 mr-2">
                                            {Object.values(oauthConfig.recommendations).map((rec: any, i: number) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* AI Configuration */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Zap size={18} className="text-indigo-600" /> מפתח AI (Google Gemini)</h3>
                    <p className="text-xs text-gray-500">
                        מפתח ה-API של Google Gemini מוגדר כמשתנה סביבה (environment variable) - זה הפתרון המאובטח ביותר.
                    </p>
                    <div className="space-y-3">
                        {isCheckingAiKey ? (
                            <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl">
                                <Skeleton className="h-5 w-5 rounded-full" />
                                <span className="mr-2 text-sm text-gray-600">בודק סטטוס...</span>
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
                                                <AlertTriangle size={20} className="text-yellow-600" />
                                                <div>
                                                    <div className="font-bold text-sm text-yellow-900">מפתח AI לא מוגדר</div>
                                                    <div className="text-xs text-yellow-700">יש להוסיף את המפתח למשתני סביבה</div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-xs text-gray-900 mb-2">איך להגדיר:</h4>
                                    <div className="space-y-2 text-xs text-gray-600">
                                        <div>
                                            <strong>1. קבל מפתח:</strong> <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Google AI Studio</a>
                                        </div>
                                        <div>
                                            <strong>2. הוסף ל-.env.local:</strong>
                                            <code className="block mt-1 p-2 bg-gray-900 text-green-400 rounded font-mono text-[10px] dir-ltr text-left">
                                                API_KEY=your-api-key-here
                                            </code>
                                        </div>
                                        <div>
                                            <strong>3. ב-Vercel:</strong> Settings → Environment Variables → הוסף <code className="bg-gray-200 px-1 rounded">API_KEY</code>
                                        </div>
                                        <div className="pt-2 border-t border-gray-200">
                                            <strong>⚠️ חשוב:</strong> המפתח נשמר רק בשרת ולא נחשף ללקוח. זה הפתרון המאובטח ביותר.
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* CRM Webhook */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Webhook size={18} className="text-purple-500" /> CRM Webhook</h3>
                    <p className="text-xs text-gray-500">
                        השתמש בכתובת זו כדי לקלוט לידים אוטומטית ממערכות חיצוניות (כגון פייסבוק, וורדפרס, וכו').
                    </p>
                    <div className="relative">
                        <input 
                            readOnly 
                            value={webhookUrl}
                            placeholder="הכתובת תופיע לאחר הפעלה"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-600 outline-none"
                        />
                        <button 
                            onClick={() => webhookUrl && copyToClipboard(webhookUrl)}
                            disabled={!webhookUrl}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {copied === 'url' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                <div className="col-span-1 lg:col-span-2 bg-gray-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex flex-col gap-2">
                        <h3 className="font-bold flex items-center gap-2"><Code size={18} className="text-blue-400" /> סימולטור System</h3>
                        <p className="text-xs text-gray-400">הסימולטור אינו זמין כרגע.</p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
