'use client';
import React from 'react';
import { Zap, CircleCheckBig, CircleX, Wifi, Rss, Lock, KeyRound, ShieldCheck, Mail, MessageSquare, Newspaper, Hammer } from 'lucide-react';

const DataConnectivityView = () => {
    return (
        <div dir="rtl" className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8 text-right">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800 flex items-center justify-start gap-3">
                    <Zap size={24} className="text-slate-400" />
                    קישוריות וזרימת נתונים
                </h2>
                <p className="text-slate-500 font-medium mt-1">
                    ניהול צנרת המידע מהלקוח למערכת (Omnichannel API)
                </p>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Channels */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-2">זמינות שרת API</h3>
                            <div className="flex items-center gap-2 text-green-500 font-bold">
                                <CircleCheckBig size={18} />
                                <span>99.98%</span>
                            </div>
                        </div>
                         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="font-bold text-slate-800 mb-2">Latency</h3>
                             <div className="flex items-center gap-2 text-slate-500 font-bold">
                                <Wifi size={18} />
                                <span>12ms</span>
                            </div>
                        </div>
                    </div>

                    {/* Channels List */}
                    <div className="space-y-4">
                        {/* WhatsApp */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <MessageSquare className="text-green-500" size={32}/>
                                <div>
                                    <h4 className="font-bold text-slate-800">WhatsApp Business API</h4>
                                    <p className="text-sm text-slate-500">Meta Cloud API</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                <div className="text-right sm:text-left">
                                    <span className="font-bold text-green-500 flex items-center gap-2"><CircleCheckBig size={16}/> מחובר</span>
                                    <p className="text-xs text-slate-400">Latency: 12ms</p>
                                </div>
                                <button className="text-sm font-semibold text-primary hover:underline ml-auto">הגדרות ערוץ</button>
                            </div>
                        </div>
                         {/* Email */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Mail className="text-blue-500" size={32}/>
                                <div>
                                    <h4 className="font-bold text-slate-800">Email Sync (G-Suite)</h4>
                                    <p className="text-sm text-slate-500">Google OAuth</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                 <div className="text-right sm:text-left">
                                    <span className="font-bold text-green-500 flex items-center gap-2"><CircleCheckBig size={16}/> מחובר</span>
                                    <p className="text-xs text-slate-400">Latency: 45ms</p>
                                </div>
                                <button className="text-sm font-semibold text-primary hover:underline ml-auto">הגדרות ערוץ</button>
                            </div>
                        </div>
                        {/* SMS */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Mail className="text-slate-400" size={32}/>
                                <div>
                                    <h4 className="font-bold text-slate-500">SMS Gateway</h4>
                                    <p className="text-sm text-slate-400">Twilio / 019</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full sm:w-auto">
                                <span className="font-bold text-red-500 flex items-center gap-2"><CircleX size={16}/> מנותק</span>
                                <button className="text-sm font-bold bg-primary text-white py-2 px-4 rounded-lg shadow-md hover:bg-primary/90 transition-colors ml-auto">הגדר חיבור עכשיו</button>
                            </div>
                        </div>
                         {/* Customer Portal */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <Newspaper className="text-indigo-500" size={32}/>
                                <div>
                                    <h4 className="font-bold text-slate-800">Customer Portal events</h4>
                                    <p className="text-sm text-slate-500">Internal Native</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-6 w-full sm:w-auto">
                                 <div className="text-right sm:text-left">
                                    <span className="font-bold text-green-500 flex items-center gap-2"><CircleCheckBig size={16}/> מחובר</span>
                                    <p className="text-xs text-slate-400">Latency: 2ms</p>
                                </div>
                                <button className="text-sm font-semibold text-primary hover:underline ml-auto">הגדרות ערוץ</button>
                            </div>
                        </div>
                    </div>

                     {/* Security Section */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                           <ShieldCheck className="text-slate-400"/> אבטחת חיבור (Security)
                        </h3>
                        <p className="text-slate-500">ניהול מפתחות גישה לערוצים</p>
                         <div className="!mt-6">
                            <label className="font-semibold text-slate-600">API Webhook URL</label>
                            <input type="text" readOnly value="https://api.nexus.os/v1/webhook" className="w-full mt-1 p-2 bg-slate-100 rounded-md border border-slate-300 text-left" />
                        </div>
                        <div>
                           <h4 className="font-semibold text-slate-600">SSL Encryption</h4>
                           <p className="text-sm text-slate-500">החיבור מוצפן ב-AES-256 ומאושר Meta Business.</p>
                        </div>
                         <button className="text-sm font-bold bg-slate-800 text-white py-2 px-4 rounded-lg shadow-md hover:bg-slate-700 transition-colors flex items-center gap-2">
                           <KeyRound size={16}/> נהל מפתחות
                        </button>
                    </div>
                </div>

                {/* Right Column: Webhook Stream */}
                <div className="lg:col-span-1 bg-slate-900 p-6 rounded-2xl border border-slate-700 shadow-lg flex flex-col h-full">
                    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                        <Rss className="text-green-400" />
                        Webhook Live Stream
                    </h3>
                    <p className="text-sm text-slate-400 mb-4">צפייה בנתונים גולמיים נכנסים</p>
                    <div className="bg-black flex-grow rounded-md p-4 font-mono text-sm text-green-400 overflow-auto h-64">
                        <p>Listening for incoming events...</p>
                        <p className="text-slate-500 mt-2">Endpoint: https://api.nexus.os/v1/webhook</p>
                    </div>
                    <button className="mt-4 w-full text-sm font-semibold text-slate-300 hover:text-red-400 transition-colors">
                        מחק לוגים
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataConnectivityView;

