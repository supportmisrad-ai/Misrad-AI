'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, 
    ShoppingBag, 
    Phone, 
    ChevronRight,
    Building2
} from 'lucide-react';
import { SystemIntegrationsTab } from './SystemIntegrationsTab';

// Tab definitions for System module settings
const SYSTEM_SETTINGS_TABS = [
    { 
        id: 'integrations', 
        label: 'אינטגרציות', 
        short: 'חיבורים', 
        icon: Zap, 
        color: 'text-rose-600',
        desc: 'Voicenter, CRM, Webhooks'
    },
    { 
        id: 'products', 
        label: 'קטלוג מוצרים', 
        short: 'מוצרים', 
        icon: ShoppingBag, 
        color: 'text-emerald-600',
        desc: 'מחירון ושירותים'
    },
];

interface SystemSettingsProps {
    defaultTab?: string;
}

export const SystemSettings: React.FC<SystemSettingsProps> = ({ defaultTab = 'integrations' }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    const activeTabDetails = SYSTEM_SETTINGS_TABS.find(t => t.id === activeTab);

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'integrations':
                return <SystemIntegrationsTab />;
            case 'products':
                // Products will be imported from shared location
                return (
                    <div className="p-8 text-center">
                        <ShoppingBag size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">קטלוג מוצרים</h3>
                        <p className="text-sm text-gray-500">מועבר להגדרות מודול המכירות</p>
                    </div>
                );
            default:
                return <SystemIntegrationsTab />;
        }
    };

    return (
        <div className="flex flex-col lg:flex-row w-full max-w-7xl mx-auto relative lg:h-[calc(100vh-8rem)] lg:overflow-hidden">
            {/* Sidebar */}
            <div className="hidden lg:flex flex-col w-72 h-full border-l border-gray-200 bg-white/50 backdrop-blur-xl shrink-0">
                <div className="pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                        <Building2 size={20} className="text-[#A21D3C]" />
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">הגדרות מכירות</h1>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">ניהול לידים ותקשורת</p>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-2 pt-4">
                    <div className="px-3 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">
                        הגדרות מודול
                    </div>
                    <div className="space-y-2">
                        {SYSTEM_SETTINGS_TABS.map(tab => (
                            <button 
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group text-right border
                                    ${activeTab === tab.id 
                                    ? 'bg-black text-white shadow-lg border-gray-200' 
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-900 shadow-sm'}
                                `}
                            >
                                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'} transition-colors shrink-0`}>
                                    <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : tab.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm">{tab.label}</div>
                                    <div className={`text-xs ${activeTab === tab.id ? 'text-white/70' : 'text-gray-400'}`}>
                                        {tab.desc}
                                    </div>
                                </div>
                                {activeTab === tab.id && <ChevronRight size={16} className="text-white" />}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Header */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 w-full shrink-0">
                <div className="flex items-center gap-2">
                    {activeTabDetails && (
                        <>
                            <div className={`p-1.5 rounded-lg bg-gray-100`}>
                                <activeTabDetails.icon size={18} className={activeTabDetails.color} />
                            </div>
                            <span className="font-bold text-gray-900">{activeTabDetails.label}</span>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 lg:h-full lg:overflow-y-auto overflow-visible p-4 md:p-8 bg-transparent scroll-smooth no-scrollbar pb-28 lg:pb-0">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {renderActiveTab()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SystemSettings;
