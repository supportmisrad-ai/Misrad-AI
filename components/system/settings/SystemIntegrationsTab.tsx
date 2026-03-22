'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Webhook, Copy, Check, Zap, TriangleAlert, ArrowRight, History, Settings } from 'lucide-react';
import { TelephonyConfigForm } from '@/components/settings/TelephonyConfigForm';
import { VoicenterOnboardingPanel } from '@/components/settings/VoicenterOnboardingPanel';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

const CallLogTab = dynamic(() => import('@/components/telephony/CallLogTab'), { ssr: false });

type TabId = 'settings' | 'call-log';

export const SystemIntegrationsTab: React.FC = () => {
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<TabId>('settings');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [copied, setCopied] = useState('');

    // Extract orgSlug from pathname
    const orgSlug = pathname?.match(/\/w\/([^/]+)/)?.[1] || '';

    // Generate webhook URL
    useEffect(() => {
        if (typeof window !== 'undefined' && orgSlug) {
            setWebhookUrl(`${window.location.origin}/api/webhooks/voicenter?orgId=${orgSlug}`);
        }
    }, [orgSlug]);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied('url');
        setTimeout(() => setCopied(''), 2000);
    };

    return (
        <motion.div 
            key="system-integrations" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="space-y-6 pb-16 md:pb-20 px-4 sm:px-6 lg:px-8"
        >
            <div>
                <h2 className="text-xl font-bold text-gray-900">טלפוניה ואינטגרציות</h2>
                <p className="text-sm text-gray-500">חיבור מרכזיית ענן, היסטוריית שיחות, ו-webhooks.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-slate-200 pb-1">
                <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                        activeTab === 'settings'
                            ? 'bg-white border border-b-0 border-slate-200 text-primary -mb-[1px]'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <Settings size={16} />
                    הגדרות
                </button>
                <button
                    onClick={() => setActiveTab('call-log')}
                    className={`px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors flex items-center gap-2 ${
                        activeTab === 'call-log'
                            ? 'bg-white border border-b-0 border-slate-200 text-primary -mb-[1px]'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    <History size={16} />
                    היסטוריית שיחות
                </button>
            </div>

            {/* Settings Tab */}
            {activeTab === 'settings' && (
                <div className="space-y-8">
                    {/* Voicenter Onboarding Panel */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <VoicenterOnboardingPanel />
                    </div>

                    {/* Telephony Configuration */}
                    <div className="bg-gradient-to-br from-rose-50 via-slate-50 to-blue-50 p-6 rounded-2xl border border-rose-200">
                        <div className="flex items-center gap-2 mb-4">
                            <Phone className="text-rose-600" size={20} />
                            <h3 className="font-bold text-gray-900">הגדרות מרכזיית ענן</h3>
                        </div>
                        <TelephonyConfigForm />
                    </div>

                    {/* CRM Webhook Section */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
                        <div className="flex items-center gap-2">
                            <Webhook size={18} className="text-purple-500" />
                            <h3 className="font-bold text-gray-900">Webhook לשיחות ו-Screen Pop</h3>
                        </div>
                        
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <Zap size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-800">
                                    <p className="font-bold mb-1">מה זה עושה?</p>
                                    <p>מקבל אירועי שיחות מ-Voicenter: הקפצת מסך בשיחה נכנסת, שמירת היסטוריית שיחות, וקישור להקלטות.</p>
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-gray-500">
                            העתק את הכתובת הזו והזן אותה ב-Voicenter בהגדרות "Send Call Events" ו-"Screen Pop".
                        </p>
                        
                        <div className="relative">
                            <input 
                                readOnly 
                                value={webhookUrl}
                                placeholder="טוען..."
                                dir="ltr"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs font-mono text-gray-600 outline-none"
                            />
                            <button 
                                onClick={() => webhookUrl && copyToClipboard(webhookUrl)}
                                disabled={!webhookUrl}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {copied === 'url' ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            </button>
                        </div>
                    </div>

                    {/* Documentation Link */}
                    <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold flex items-center gap-2">
                                    <ArrowRight size={18} className="text-blue-400" />
                                    מדריך חיבור Voicenter
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">הסבר מלא איך לחבר את המרכזיה ולהתחיל לקבל שיחות</p>
                            </div>
                            <a 
                                href="https://docs.misrad-ai.com/integrations/voicenter" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition-colors"
                            >
                                פתח מדריך
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Call Log Tab */}
            {activeTab === 'call-log' && orgSlug && (
                <CallLogTab orgSlug={orgSlug} />
            )}
        </motion.div>
    );
};

export default SystemIntegrationsTab;
