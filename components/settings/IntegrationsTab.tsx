
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Calendar, HardDrive, Webhook, Copy, Check, Code, Play, FileText } from 'lucide-react';
import { GoogleAuthModal } from '../GoogleAuthModal';

export const IntegrationsTab: React.FC = () => {
    const { isCalendarConnected, connectGoogleCalendar, isDriveConnected, connectGoogleDrive, onboardClientFromWebhook, isGreenInvoiceConnected, connectGreenInvoice } = useData();
    const [webhookUrl] = useState(`https://api.nexus-os.co/webhooks/${Math.random().toString(36).substring(7)}`);
    const [copied, setCopied] = useState('');
    const [showGoogleAuth, setShowGoogleAuth] = useState(false);
    const [authServiceType, setAuthServiceType] = useState('');
    
    const [salesOsPayload, setSalesOsPayload] = useState(JSON.stringify({
        client_id: "UUID-1234",
        company_name: "Google Israel",
        contact_person: {
          name: "Moshe Cohen",
          phone: "+972-50-1234567",
          email: "moshe@google.com",
          role: "VP Marketing"
        },
        deal_details: {
          package_type: "Video_Retainer_Premium",
          value: 15000,
          currency: "ILS",
          start_date: "2023-11-01"
        },
        sales_notes: "הלקוח רגיש למחיר, הבטחנו סרטון ראשון תוך שבוע. אוהב תקשורת בוואטסאפ.",
        source: "Facebook Ads - Q3 Campaign"
    }, null, 2));
    const [simulationStatus, setSimulationStatus] = useState<'success' | null>(null);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied('url');
        setTimeout(() => setCopied(''), 2000);
    };

    const startGoogleAuth = (service: string) => {
        setAuthServiceType(service);
        setShowGoogleAuth(true);
    };

    const finishGoogleAuth = () => {
        if (authServiceType === 'Calendar') connectGoogleCalendar();
        else if (authServiceType === 'Drive') connectGoogleDrive();
    };

    const handleSimulateSalesSync = () => {
        try {
            const payload = JSON.parse(salesOsPayload);
            onboardClientFromWebhook(payload);
            setSimulationStatus('success');
            setTimeout(() => setSimulationStatus(null), 3000);
        } catch (e) {
            alert('JSON לא תקין.');
        }
    };

    return (
        <motion.div key="integrations" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-20">
            <AnimatePresence>
                {showGoogleAuth && (
                    <GoogleAuthModal 
                        onClose={() => setShowGoogleAuth(false)} 
                        onSuccess={finishGoogleAuth}
                        serviceName={authServiceType}
                    />
                )}
            </AnimatePresence>

            <div>
                <h2 className="text-xl font-bold text-gray-900">אינטגרציות וחיבורים</h2>
                <p className="text-sm text-gray-500">חבר את Nexus למערכות חיצוניות לאוטומציה מלאה.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Integrations */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><FileText size={18} className="text-green-600" /> מערכות כספים</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-green-50/50 rounded-xl border border-green-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-green-100">
                                <span className="text-green-600 font-bold text-xs">GR</span>
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">חשבונית ירוקה (Green Invoice)</div>
                                <div className="text-xs text-gray-500">{isGreenInvoiceConnected ? 'מחובר ופעיל' : 'לא מחובר'}</div>
                            </div>
                        </div>
                        <button 
                            onClick={connectGreenInvoice}
                            disabled={isGreenInvoiceConnected}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isGreenInvoiceConnected ? 'bg-green-100 text-green-700 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {isGreenInvoiceConnected ? 'מחובר' : 'התחבר'}
                        </button>
                    </div>
                </div>

                {/* Google Services */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2"><Zap size={18} className="text-yellow-500" /> Google Workspace</h3>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Calendar size={20} className="text-blue-500" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">Google Calendar</div>
                                <div className="text-xs text-gray-500">{isCalendarConnected ? 'מחובר ופעיל' : 'לא מחובר'}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => startGoogleAuth('Calendar')}
                            disabled={isCalendarConnected}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isCalendarConnected ? 'bg-green-100 text-green-700 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {isCalendarConnected ? 'מחובר' : 'התחבר'}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <HardDrive size={20} className="text-green-500" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-900">Google Drive</div>
                                <div className="text-xs text-gray-500">{isDriveConnected ? 'מחובר ופעיל' : 'לא מחובר'}</div>
                            </div>
                        </div>
                        <button 
                            onClick={() => startGoogleAuth('Drive')}
                            disabled={isDriveConnected}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${isDriveConnected ? 'bg-green-100 text-green-700 cursor-default' : 'bg-black text-white hover:bg-gray-800'}`}
                        >
                            {isDriveConnected ? 'מחובר' : 'התחבר'}
                        </button>
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
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-600 outline-none"
                        />
                        <button 
                            onClick={() => copyToClipboard(webhookUrl)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        >
                            {copied === 'url' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* Sales OS Simulator */}
                <div className="col-span-1 lg:col-span-2 bg-gray-900 text-white p-6 rounded-2xl shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10 flex flex-col gap-4">
                        <h3 className="font-bold flex items-center gap-2"><Code size={18} className="text-blue-400" /> סימולטור Sales OS</h3>
                        <p className="text-xs text-gray-400">בדוק את האינטגרציה על ידי שליחת JSON לדוגמה. המערכת תיצור לקוח חדש אוטומטית.</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <textarea 
                                value={salesOsPayload}
                                onChange={(e) => setSalesOsPayload(e.target.value)}
                                className="bg-black/50 border border-gray-700 rounded-xl p-4 font-mono text-xs text-green-400 w-full h-40 outline-none focus:border-blue-500 transition-colors resize-none"
                            />
                            <div className="flex flex-col justify-center gap-4">
                                <div className="text-xs text-gray-400 space-y-2">
                                    <p>• מדמה קריאת API נכנסת</p>
                                    <p>• יוצר כרטיס לקוח בסטטוס Onboarding</p>
                                    <p>• מפעיל אוטומציות (אם הוגדרו)</p>
                                </div>
                                <button 
                                    onClick={handleSimulateSalesSync}
                                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
                                >
                                    {simulationStatus === 'success' ? <Check size={18} /> : <Play size={18} />}
                                    {simulationStatus === 'success' ? 'הנתונים נקלטו!' : 'הרץ סימולציה'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
