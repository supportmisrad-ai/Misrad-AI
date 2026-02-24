'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useData } from '../../context/DataContext';
import {
    MessageSquare,
    Smartphone,
    Mail,
    Save,
    CircleCheckBig,
    CircleAlert,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Shield,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeletons';

// ─── Types ──────────────────────────────────────────────────────────

interface ChannelStatus {
    configured: boolean;
    active: boolean;
}

interface ChannelsState {
    whatsapp: ChannelStatus;
    sms: ChannelStatus;
    email: ChannelStatus;
}

type ChannelKey = 'whatsapp' | 'sms' | 'email';

// ─── Channel Config ─────────────────────────────────────────────────

const CHANNEL_META: Record<ChannelKey, {
    label: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    docsUrl: string;
    docsLabel: string;
}> = {
    whatsapp: {
        label: 'WhatsApp Business',
        icon: MessageSquare,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        description: 'שלח הודעות WhatsApp ללידים ולקוחות דרך Meta Cloud API',
        docsUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
        docsLabel: 'Meta Cloud API Docs',
    },
    sms: {
        label: 'SMS (Twilio)',
        icon: Smartphone,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        description: 'שלח הודעות SMS ללידים ולקוחות דרך Twilio',
        docsUrl: 'https://www.twilio.com/docs/messaging/quickstart',
        docsLabel: 'Twilio SMS Docs',
    },
    email: {
        label: 'Email (Resend)',
        icon: Mail,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        description: 'שלח אימיילים ללידים ולקוחות מתוך מרכז התקשורת',
        docsUrl: 'https://resend.com/docs/introduction',
        docsLabel: 'Resend Docs',
    },
};

// ─── Component ──────────────────────────────────────────────────────

export const MessagingConfigForm: React.FC = () => {
    const { addToast } = useData();
    const [isLoading, setIsLoading] = useState(true);
    const [channels, setChannels] = useState<ChannelsState>({
        whatsapp: { configured: false, active: false },
        sms: { configured: false, active: false },
        email: { configured: false, active: false },
    });
    const [expandedChannel, setExpandedChannel] = useState<ChannelKey | null>(null);
    const [savingChannel, setSavingChannel] = useState<ChannelKey | null>(null);

    // WhatsApp fields
    const [waPhoneNumberId, setWaPhoneNumberId] = useState('');
    const [waAccessToken, setWaAccessToken] = useState('');
    const [waBusinessAccountId, setWaBusinessAccountId] = useState('');
    const [waIsActive, setWaIsActive] = useState(true);

    // SMS fields
    const [smsAccountSid, setSmsAccountSid] = useState('');
    const [smsAuthToken, setSmsAuthToken] = useState('');
    const [smsFromNumber, setSmsFromNumber] = useState('');
    const [smsIsActive, setSmsIsActive] = useState(true);

    // Email fields
    const [emailFromAddress, setEmailFromAddress] = useState('');
    const [emailFromName, setEmailFromName] = useState('');
    const [emailReplyTo, setEmailReplyTo] = useState('');
    const [emailIsActive, setEmailIsActive] = useState(true);

    // Fetch channel status
    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/settings/messaging');
            if (!response.ok) throw new Error('שגיאה בטעינת הגדרות');
            const data: { channels: ChannelsState } = await response.json();
            setChannels(data.channels);
        } catch (error) {
            console.error('Error fetching messaging config:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Save handler
    const handleSave = async (channel: ChannelKey) => {
        setSavingChannel(channel);

        let credentials: Record<string, unknown> = {};
        let isActive = true;

        switch (channel) {
            case 'whatsapp':
                if (!waPhoneNumberId.trim() || !waAccessToken.trim()) {
                    addToast('Phone Number ID ו-Access Token הם שדות חובה', 'error');
                    setSavingChannel(null);
                    return;
                }
                credentials = {
                    phoneNumberId: waPhoneNumberId.trim(),
                    accessToken: waAccessToken.trim(),
                    businessAccountId: waBusinessAccountId.trim() || undefined,
                };
                isActive = waIsActive;
                break;

            case 'sms':
                if (!smsAccountSid.trim() || !smsAuthToken.trim() || !smsFromNumber.trim()) {
                    addToast('Account SID, Auth Token ומספר שולח הם שדות חובה', 'error');
                    setSavingChannel(null);
                    return;
                }
                credentials = {
                    accountSid: smsAccountSid.trim(),
                    authToken: smsAuthToken.trim(),
                    fromNumber: smsFromNumber.trim(),
                };
                isActive = smsIsActive;
                break;

            case 'email':
                if (!emailFromAddress.trim()) {
                    addToast('כתובת שולח היא שדה חובה', 'error');
                    setSavingChannel(null);
                    return;
                }
                credentials = {
                    fromAddress: emailFromAddress.trim(),
                    fromName: emailFromName.trim() || 'MISRAD AI',
                    replyTo: emailReplyTo.trim() || undefined,
                };
                isActive = emailIsActive;
                break;
        }

        try {
            const response = await fetch('/api/settings/messaging', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel, credentials, isActive }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'שגיאה בשמירה' }));
                throw new Error(errorData.error || 'שגיאה בשמירת ההגדרות');
            }

            addToast(`הגדרות ${CHANNEL_META[channel].label} נשמרו בהצלחה`, 'success');
            await fetchStatus();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : 'שגיאה בשמירה';
            addToast(msg, 'error');
        } finally {
            setSavingChannel(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
                <Skeleton className="h-20 rounded-2xl" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                    <Shield size={20} className="text-indigo-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">ערוצי תקשורת</h3>
                    <p className="text-sm text-slate-500">הגדר WhatsApp, SMS ו-Email לשליחת הודעות מתוך מרכז התקשורת</p>
                </div>
            </div>

            {(Object.keys(CHANNEL_META) as ChannelKey[]).map((key) => {
                const meta = CHANNEL_META[key];
                const status = channels[key];
                const isExpanded = expandedChannel === key;
                const isSaving = savingChannel === key;
                const Icon = meta.icon;

                return (
                    <div
                        key={key}
                        className={`border rounded-2xl overflow-hidden transition-all ${
                            isExpanded ? `${meta.borderColor} shadow-lg` : 'border-slate-200 hover:border-slate-300'
                        }`}
                    >
                        {/* Header */}
                        <button
                            type="button"
                            onClick={() => setExpandedChannel(isExpanded ? null : key)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 bg-white hover:bg-slate-50/50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${meta.bgColor} border ${meta.borderColor}`}>
                                    <Icon size={20} className={meta.color} />
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-slate-900 text-sm sm:text-base">{meta.label}</div>
                                    <div className="text-xs text-slate-500">{meta.description}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                {status.configured ? (
                                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                        status.active
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        <CircleCheckBig size={12} />
                                        {status.active ? 'פעיל' : 'מושבת'}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                        <CircleAlert size={12} />
                                        לא מוגדר
                                    </span>
                                )}
                                {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                            </div>
                        </button>

                        {/* Expanded Form */}
                        {isExpanded && (
                            <div className="border-t border-slate-100 p-4 sm:p-6 bg-slate-50/30 space-y-4">
                                {/* Documentation link */}
                                <a
                                    href={meta.docsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`inline-flex items-center gap-2 text-xs font-bold ${meta.color} hover:underline`}
                                >
                                    <ExternalLink size={12} />
                                    {meta.docsLabel}
                                </a>

                                {/* WhatsApp Form */}
                                {key === 'whatsapp' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone Number ID *</label>
                                            <input
                                                type="text"
                                                value={waPhoneNumberId}
                                                onChange={(e) => setWaPhoneNumberId(e.target.value)}
                                                placeholder="מזהה מספר הטלפון מ-Meta Business"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Access Token *</label>
                                            <input
                                                type="password"
                                                value={waAccessToken}
                                                onChange={(e) => setWaAccessToken(e.target.value)}
                                                placeholder="Permanent Token או System User Token"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Business Account ID (אופציונלי)</label>
                                            <input
                                                type="text"
                                                value={waBusinessAccountId}
                                                onChange={(e) => setWaBusinessAccountId(e.target.value)}
                                                placeholder="WABA ID"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={waIsActive}
                                                onChange={(e) => setWaIsActive(e.target.checked)}
                                                className="w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">ערוץ פעיל</span>
                                        </label>
                                    </div>
                                )}

                                {/* SMS Form */}
                                {key === 'sms' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Account SID *</label>
                                            <input
                                                type="text"
                                                value={smsAccountSid}
                                                onChange={(e) => setSmsAccountSid(e.target.value)}
                                                placeholder="AC..."
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Auth Token *</label>
                                            <input
                                                type="password"
                                                value={smsAuthToken}
                                                onChange={(e) => setSmsAuthToken(e.target.value)}
                                                placeholder="Auth Token מדשבורד Twilio"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">מספר שולח (From Number) *</label>
                                            <input
                                                type="text"
                                                value={smsFromNumber}
                                                onChange={(e) => setSmsFromNumber(e.target.value)}
                                                placeholder="+972..."
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={smsIsActive}
                                                onChange={(e) => setSmsIsActive(e.target.checked)}
                                                className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">ערוץ פעיל</span>
                                        </label>
                                    </div>
                                )}

                                {/* Email Form */}
                                {key === 'email' && (
                                    <div className="space-y-3">
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-medium">
                                            המערכת משתמשת ב-Resend לשליחת אימיילים. אם RESEND_API_KEY מוגדר במשתני הסביבה — Email כבר פעיל.
                                            הגדרות אלו מאפשרות התאמה אישית של כתובת השולח.
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">כתובת שולח *</label>
                                            <input
                                                type="email"
                                                value={emailFromAddress}
                                                onChange={(e) => setEmailFromAddress(e.target.value)}
                                                placeholder="hello@yourcompany.com"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">שם שולח</label>
                                            <input
                                                type="text"
                                                value={emailFromName}
                                                onChange={(e) => setEmailFromName(e.target.value)}
                                                placeholder="MISRAD AI"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1.5">Reply-To (אופציונלי)</label>
                                            <input
                                                type="email"
                                                value={emailReplyTo}
                                                onChange={(e) => setEmailReplyTo(e.target.value)}
                                                placeholder="support@yourcompany.com"
                                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white font-mono"
                                                dir="ltr"
                                            />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={emailIsActive}
                                                onChange={(e) => setEmailIsActive(e.target.checked)}
                                                className="w-5 h-5 rounded-md border-slate-300 text-amber-600 focus:ring-amber-500"
                                            />
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-slate-900">ערוץ פעיל</span>
                                        </label>
                                    </div>
                                )}

                                {/* Save Button */}
                                <button
                                    type="button"
                                    onClick={() => handleSave(key)}
                                    disabled={isSaving}
                                    className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 ${
                                        key === 'whatsapp' ? 'bg-emerald-600 hover:bg-emerald-700' :
                                        key === 'sms' ? 'bg-blue-600 hover:bg-blue-700' :
                                        'bg-amber-600 hover:bg-amber-700'
                                    }`}
                                >
                                    {isSaving ? (
                                        <Skeleton className="w-5 h-5 rounded-full bg-white/30" />
                                    ) : (
                                        <Save size={16} />
                                    )}
                                    {isSaving ? 'שומר...' : 'שמור הגדרות'}
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default MessagingConfigForm;
