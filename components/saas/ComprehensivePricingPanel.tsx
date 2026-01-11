'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, Plus, Edit2, Save, X, CheckCircle2, Trash2, Eye, 
    AlertCircle, ChevronDown, ChevronUp, LayoutDashboard, Zap, HeartPulse, Crown,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { useData } from '../../context/DataContext';

export type SystemType = 'nexus' | 'system' | 'client' | 'bundle';

export interface LandingPagePlan {
    id: string;
    system: SystemType;
    name: string;
    subtitle?: string;
    systemSubtitle?: string; // שם נרדף בעברית למערכת (למשל: "לידים ומכירות", "ניהול עסק")
    priceMonthly: number;
    priceYearly: number;
    features: string[];
    recommended?: boolean;
    order: number;
    isActive: boolean;
}

export const ComprehensivePricingPanel: React.FC = () => {
    const { addToast, updateSettings } = useData();
    
    // Load plans from localStorage
    const [plans, setPlans] = useState<LandingPagePlan[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('landing_page_plans');
            if (saved) {
                try {
                    return JSON.parse(saved);
                } catch (e) {
                    console.error('Error loading plans:', e);
                }
            }
        }
        // Default plans based on current structure
        return getDefaultPlans();
    });

    const [selectedSystem, setSelectedSystem] = useState<SystemType>('nexus');
    const [editingPlan, setEditingPlan] = useState<string | null>(null);
    const [editedPlan, setEditedPlan] = useState<LandingPagePlan | null>(null);
    const [isAddingPlan, setIsAddingPlan] = useState(false);
    const [newPlan, setNewPlan] = useState<Partial<LandingPagePlan>>({
        system: 'nexus',
        name: '',
        subtitle: '',
        systemSubtitle: '',
        priceMonthly: 0,
        priceYearly: 0,
        features: [],
        recommended: false,
        order: 0,
        isActive: true
    });
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);
    const [expandedSystems, setExpandedSystems] = useState<Record<SystemType, boolean>>({
        nexus: true,
        system: false,
        client: false,
        bundle: false
    });

    function getDefaultPlans(): LandingPagePlan[] {
        return [
            // Nexus OS
            { id: 'nexus_starter', system: 'nexus', name: 'סטארטר', subtitle: 'לניהול ארגוני מלא - HR, שכר, פרויקטים', systemSubtitle: 'ניהול עסק', priceMonthly: 599, priceYearly: 479, features: ['עד 5 משתמשים', 'ראייה רוחבית - רואה משימות של כולם', 'ניהול משאבי אנוש (HR)', 'שעון נוכחות', 'חישוב שכר ועמלות', 'פרויקטים חוצי-מחלקות', 'תמיכה באימייל', '2GB אחסון קבצים'], recommended: false, order: 0, isActive: true },
            { id: 'nexus_pro', system: 'nexus', name: 'פרו', subtitle: 'לניהול ארגוני מלא - HR, שכר, פרויקטים', systemSubtitle: 'ניהול עסק', priceMonthly: 1199, priceYearly: 959, features: ['עד 20 משתמשים', 'כל הפיצ׳רים של סטארטר', 'בינה מלאכותית (AI)', 'ניהול עומסים (Workload)', 'דוחות ניהוליים מתקדמים', 'תמיכה עדיפות', '50GB אחסון קבצים', 'אינטגרציות מלאות'], recommended: true, order: 1, isActive: true },
            { id: 'nexus_enterprise', system: 'nexus', name: 'עסקי', subtitle: 'לניהול ארגוני מלא - HR, שכר, פרויקטים', systemSubtitle: 'ניהול עסק', priceMonthly: 2599, priceYearly: 2079, features: ['משתמשים ללא הגבלה', 'כל הפיצ׳רים של פרו', 'Multi-tenant', 'ניהול תפקידים והרשאות מתקדם', 'API מלא', 'אימות SSO', 'גיבויים יומיים', 'תמיכה 24/7', 'אחסון ללא הגבלה', 'ניהול מותאם אישית', 'אימון צוות ייעודי'], recommended: false, order: 2, isActive: true },
            
            // System.OS
            { id: 'system_solo', system: 'system', name: 'Solo', subtitle: 'ללידים ומכירות - לפרילנסרים', systemSubtitle: 'לידים ומכירות', priceMonthly: 99, priceYearly: 79, features: ['משתמש יחיד - מושלם לפרילנסרים', 'משימות אישיות', 'ניהול לידים בסיסי', 'צנרת מכירות (Pipeline)', 'משימות Follow Up (התקשר, שלח מייל)', 'תמיכה באימייל', '500MB אחסון קבצים'], recommended: false, order: 0, isActive: true },
            { id: 'system_starter', system: 'system', name: 'סטארטר', subtitle: 'ללידים ומכירות - עד 3 משתמשים', systemSubtitle: 'לידים ומכירות', priceMonthly: 199, priceYearly: 159, features: ['עד 3 משתמשים', 'משימות אישיות - כל עובד רואה רק את שלו', 'ניהול לידים בסיסי', 'צנרת מכירות (Pipeline)', 'משימות Follow Up (התקשר, שלח מייל)', 'תמיכה באימייל', '1GB אחסון קבצים'], recommended: false, order: 1, isActive: true },
            { id: 'system_pro', system: 'system', name: 'פרו', subtitle: 'ללידים ומכירות - עד 10 משתמשים', systemSubtitle: 'לידים ומכירות', priceMonthly: 399, priceYearly: 319, features: ['עד 10 משתמשים', 'כל הפיצ׳רים של סטארטר', 'AI Copilot בזמן אמת', 'אוטומציות מכירה', 'דוחות מכירה מתקדמים', 'תמיכה עדיפות', '25GB אחסון קבצים', 'אינטגרציות מלאות'], recommended: true, order: 2, isActive: true },
            { id: 'system_enterprise', system: 'system', name: 'עסקי', subtitle: 'ללידים ומכירות - ללא הגבלה', systemSubtitle: 'לידים ומכירות', priceMonthly: 899, priceYearly: 719, features: ['משתמשים ללא הגבלה', 'כל הפיצ׳רים של פרו', 'חייגן מובנה', 'ניתוח ROAS בזמן אמת', 'API מלא', 'אימות SSO', 'גיבויים יומיים', 'תמיכה 24/7', 'אחסון ללא הגבלה', 'ניהול מותאם אישית'], recommended: false, order: 3, isActive: true },
            
            // Client OS
            { id: 'client_solo', system: 'client', name: 'Solo', subtitle: 'ללקוחות וניהול תיקים - לפרילנסרים', systemSubtitle: 'ניהול לקוחות', priceMonthly: 99, priceYearly: 79, features: ['משתמש יחיד - מושלם לפרילנסרים', 'משימות אישיות', 'ניהול לקוחות בסיסי', 'ניתוח רווחיות בסיסי', 'משימות Follow Up (התקשר, שלח מייל)', 'תמיכה באימייל', '500MB אחסון קבצים'], recommended: false, order: 0, isActive: true },
            { id: 'client_starter', system: 'client', name: 'סטארטר', subtitle: 'ללקוחות וניהול תיקים - עד 3 משתמשים', systemSubtitle: 'ניהול לקוחות', priceMonthly: 199, priceYearly: 159, features: ['עד 3 משתמשים', 'משימות אישיות - כל עובד רואה רק את שלו', 'ניהול לקוחות בסיסי', 'ניתוח רווחיות בסיסי', 'משימות Follow Up (התקשר, שלח מייל)', 'תמיכה באימייל', '1GB אחסון קבצים'], recommended: false, order: 1, isActive: true },
            { id: 'client_pro', system: 'client', name: 'פרו', subtitle: 'ללקוחות וניהול תיקים - עד 10 משתמשים', systemSubtitle: 'ניהול לקוחות', priceMonthly: 399, priceYearly: 319, features: ['עד 10 משתמשים', 'כל הפיצ׳רים של סטארטר', 'זיהוי נטישה מוקדם (AI)', 'ניתוח P&L מתקדם', 'דוחות לקוחות מתקדמים', 'תמיכה עדיפות', '25GB אחסון קבצים', 'אינטגרציות מלאות'], recommended: true, order: 2, isActive: true },
            { id: 'client_enterprise', system: 'client', name: 'עסקי', subtitle: 'ללקוחות וניהול תיקים - ללא הגבלה', systemSubtitle: 'ניהול לקוחות', priceMonthly: 899, priceYearly: 719, features: ['משתמשים ללא הגבלה', 'כל הפיצ׳רים של פרו', 'Liability Shield (AI)', 'ניתוח רגשי של שיחות', 'API מלא', 'אימות SSO', 'גיבויים יומיים', 'תמיכה 24/7', 'אחסון ללא הגבלה', 'ניהול מותאם אישית'], recommended: false, order: 3, isActive: true },
            
            // Bundle
            { id: 'bundle_starter', system: 'bundle', name: 'סטארטר', subtitle: 'כל המערכות יחד - לידים, לקוחות, וניהול ארגוני', systemSubtitle: 'כל המערכות יחד', priceMonthly: 899, priceYearly: 719, features: ['כל הפיצ׳רים של Nexus סטארטר', 'כל הפיצ׳רים של System סטארטר', 'כל הפיצ׳רים של Client סטארטר', 'סנכרון מלא בין המערכות', 'תמיכה עדיפות', '3GB אחסון קבצים'], recommended: false, order: 0, isActive: true },
            { id: 'bundle_pro', system: 'bundle', name: 'פרו', subtitle: 'כל המערכות יחד - לידים, לקוחות, וניהול ארגוני', systemSubtitle: 'כל המערכות יחד', priceMonthly: 1899, priceYearly: 1519, features: ['כל הפיצ׳רים של Nexus פרו', 'כל הפיצ׳רים של System פרו', 'כל הפיצ׳רים של Client פרו', 'סנכרון מלא בין המערכות', 'בינה מלאכותית (AI) בכל המערכות', 'תמיכה עדיפות', '100GB אחסון קבצים'], recommended: true, order: 1, isActive: true },
            { id: 'bundle_enterprise', system: 'bundle', name: 'עסקי', subtitle: 'כל המערכות יחד - לידים, לקוחות, וניהול ארגוני', systemSubtitle: 'כל המערכות יחד', priceMonthly: 4199, priceYearly: 3359, features: ['כל הפיצ׳רים של Nexus עסקי', 'כל הפיצ׳רים של System עסקי', 'כל הפיצ׳רים של Client עסקי', 'סנכרון מלא בין המערכות', 'Multi-tenant מלא', 'תמיכה 24/7', 'אחסון ללא הגבלה', 'ניהול מותאם אישית'], recommended: false, order: 2, isActive: true }
        ];
    }

    const savePlans = (updatedPlans: LandingPagePlan[]) => {
        setPlans(updatedPlans);
        if (typeof window !== 'undefined') {
            localStorage.setItem('landing_page_plans', JSON.stringify(updatedPlans));
        }
        updateSettings('landingPagePlans', updatedPlans);
        addToast('חבילות עודכנו בהצלחה!', 'success');
    };

    const systemConfig: Record<SystemType, { label: string; icon: any; color: string }> = {
        nexus: { label: 'Nexus', icon: LayoutDashboard, color: 'indigo' },
        system: { label: 'System', icon: Zap, color: 'emerald' },
        client: { label: 'Client', icon: HeartPulse, color: 'purple' },
        bundle: { label: 'Bundle', icon: Crown, color: 'yellow' }
    };

    const filteredPlans = plans.filter(p => p.system === selectedSystem).sort((a, b) => a.order - b.order);

    const handleSavePlan = () => {
        if (!editedPlan || !editedPlan.name) {
            addToast('נא למלא שם חבילה', 'error');
            return;
        }
        
        const updated = plans.map(p => 
            p.id === editedPlan.id ? editedPlan : p
        );
        savePlans(updated);
        setEditingPlan(null);
        setEditedPlan(null);
    };

    const handleAddPlan = () => {
        if (!newPlan.name || !newPlan.system) {
            addToast('נא למלא שם ומערכת', 'error');
            return;
        }

        const planToAdd: LandingPagePlan = {
            id: `${newPlan.system}_${Date.now()}`,
            system: newPlan.system as SystemType,
            name: newPlan.name,
            subtitle: newPlan.subtitle || '',
            systemSubtitle: newPlan.systemSubtitle || '',
            priceMonthly: newPlan.priceMonthly || 0,
            priceYearly: newPlan.priceYearly || 0,
            features: newPlan.features || [],
            recommended: newPlan.recommended || false,
            order: newPlan.order || filteredPlans.length,
            isActive: newPlan.isActive !== false
        };

        const updated = [...plans, planToAdd];
        savePlans(updated);
        setIsAddingPlan(false);
        setNewPlan({
            system: selectedSystem,
            name: '',
            subtitle: '',
            systemSubtitle: '',
            priceMonthly: 0,
            priceYearly: 0,
            features: [],
            recommended: false,
            order: filteredPlans.length + 1,
            isActive: true
        });
    };

    const handleDeletePlan = () => {
        if (!planToDelete) return;
        const updated = plans.filter(p => p.id !== planToDelete);
        savePlans(updated);
        setPlanToDelete(null);
    };

    const movePlan = (id: string, direction: 'up' | 'down') => {
        const systemPlans = filteredPlans;
        const index = systemPlans.findIndex(p => p.id === id);
        if (index === -1) return;
        
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= systemPlans.length) return;

        const updated = [...plans];
        const currentPlan = updated.find(p => p.id === id);
        const targetPlan = updated.find(p => p.id === systemPlans[newIndex].id);
        
        if (currentPlan && targetPlan) {
            const tempOrder = currentPlan.order;
            currentPlan.order = targetPlan.order;
            targetPlan.order = tempOrder;
        }
        
        savePlans(updated);
    };

    const toggleActive = (id: string) => {
        const updated = plans.map(p => 
            p.id === id ? { ...p, isActive: !p.isActive } : p
        );
        savePlans(updated);
    };

    const addFeature = (planId: string, feature: string) => {
        const updated = plans.map(p => {
            if (p.id === planId) {
                return { ...p, features: [...p.features, feature] };
            }
            return p;
        });
        savePlans(updated);
    };

    const removeFeature = (planId: string, featureIndex: number) => {
        const updated = plans.map(p => {
            if (p.id === planId) {
                return { ...p, features: p.features.filter((_, i) => i !== featureIndex) };
            }
            return p;
        });
        savePlans(updated);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <div className="flex justify-between items-end mb-10">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">ניהול חבילות דפי הנחיתה</h1>
                    <p className="text-slate-400">נהל את כל החבילות מכל המערכות - Nexus, System, Client ו-Bundle.</p>
                </div>
                <button
                    onClick={() => {
                        setIsAddingPlan(true);
                        setNewPlan({ ...newPlan, system: selectedSystem });
                    }}
                    className="bg-indigo-600 text-white hover:bg-indigo-500 px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                >
                    <Plus size={18} /> חבילה חדשה
                </button>
            </div>

            {/* System Tabs */}
            <div className="flex flex-wrap gap-3 mb-8">
                {(Object.keys(systemConfig) as SystemType[]).map((system) => {
                    const config = systemConfig[system];
                    const Icon = config.icon;
                    const isActive = selectedSystem === system;
                    const systemPlansCount = plans.filter(p => p.system === system && p.isActive).length;
                    // Get systemSubtitle from first active plan of this system
                    const firstPlan = plans.find(p => p.system === system && p.isActive);
                    const systemSubtitle = firstPlan?.systemSubtitle || '';
                    
                    return (
                        <button
                            key={system}
                            onClick={() => setSelectedSystem(system)}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-start gap-1.5 min-w-[140px] ${
                                isActive 
                                    ? `bg-${config.color}-600 text-white shadow-lg shadow-${config.color}-900/20` 
                                    : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                            }`}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <Icon size={18} />
                                <span className="flex-1 text-right">{config.label}</span>
                                {systemPlansCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        isActive ? 'bg-white/20' : 'bg-slate-700'
                                    }`}>
                                        {systemPlansCount}
                                    </span>
                                )}
                            </div>
                            {systemSubtitle && (
                                <span className={`text-xs font-normal mr-7 leading-tight ${
                                    isActive ? 'text-white/80' : 'text-slate-500'
                                }`}>
                                    {systemSubtitle}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Plans List */}
            <div className="space-y-4">
                {filteredPlans.map((plan, index) => {
                    const isEditing = editingPlan === plan.id;
                    const displayPlan = isEditing && editedPlan ? editedPlan : plan;
                    const config = systemConfig[plan.system];

                    return (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`bg-black/20 backdrop-blur-2xl border rounded-3xl p-6 transition-all ${
                                isEditing 
                                    ? 'border-indigo-500/50 shadow-indigo-900/50 ring-2 ring-indigo-500/30' 
                                    : plan.isActive
                                        ? 'border-white/10 hover:border-white/20'
                                        : 'border-slate-800 opacity-50'
                            }`}
                        >
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">שם החבילה</label>
                                            <input
                                                type="text"
                                                value={displayPlan.name}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, name: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">כותרת משנה</label>
                                            <input
                                                type="text"
                                                value={displayPlan.subtitle || ''}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, subtitle: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-1">שם נרדף למערכת (בעברית)</label>
                                        <input
                                            type="text"
                                            value={displayPlan.systemSubtitle || ''}
                                            onChange={(e) => setEditedPlan({ ...displayPlan, systemSubtitle: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                            placeholder="למשל: לידים ומכירות, ניהול עסק, ניהול לקוחות"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">מחיר חודשי (₪)</label>
                                            <input
                                                type="number"
                                                value={displayPlan.priceMonthly}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, priceMonthly: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1">מחיר שנתי (₪)</label>
                                            <input
                                                type="number"
                                                value={displayPlan.priceYearly}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, priceYearly: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-sm focus:border-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 mb-2">תכונות</label>
                                        <div className="space-y-2 mb-2">
                                            {displayPlan.features.map((feature, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={feature}
                                                        onChange={(e) => {
                                                            const updated = [...displayPlan.features];
                                                            updated[i] = e.target.value;
                                                            setEditedPlan({ ...displayPlan, features: updated });
                                                        }}
                                                        className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-white text-sm focus:border-indigo-500 outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const updated = displayPlan.features.filter((_, idx) => idx !== i);
                                                            setEditedPlan({ ...displayPlan, features: updated });
                                                        }}
                                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setEditedPlan({ ...displayPlan, features: [...displayPlan.features, ''] })}
                                            className="px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 rounded-lg text-xs font-bold border border-indigo-500/30"
                                        >
                                            <Plus size={14} className="inline mr-1" />
                                            הוסף תכונה
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={displayPlan.recommended || false}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, recommended: e.target.checked })}
                                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-white">מומלץ (הכי משתלם)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={displayPlan.isActive}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-white">פעיל</span>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSavePlan}
                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
                                        >
                                            <Save size={16} className="inline mr-2" />
                                            שמור
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingPlan(null);
                                                setEditedPlan(null);
                                            }}
                                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold transition-all"
                                        >
                                            <X size={16} className="inline mr-2" />
                                            בטל
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-black text-white">{displayPlan.name}</h3>
                                            {displayPlan.recommended && (
                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 text-xs rounded-full border border-indigo-500/30">
                                                    מומלץ
                                                </span>
                                            )}
                                            {!displayPlan.isActive && (
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30">
                                                    מוסתר
                                                </span>
                                            )}
                                        </div>
                                        {displayPlan.systemSubtitle && (
                                            <p className="text-xs text-indigo-400 font-medium mb-1">{displayPlan.systemSubtitle}</p>
                                        )}
                                        {displayPlan.subtitle && (
                                            <p className="text-sm text-slate-400 mb-3">{displayPlan.subtitle}</p>
                                        )}
                                        <div className="flex items-baseline gap-2 mb-3">
                                            <span className="text-2xl font-black text-white">₪{displayPlan.priceMonthly}</span>
                                            <span className="text-slate-400 text-sm">/חודש</span>
                                            <span className="text-slate-500 text-xs">(₪{displayPlan.priceYearly} שנתי)</span>
                                        </div>
                                        <div className="text-xs text-slate-400 mb-2">{displayPlan.features.length} תכונות</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingPlan(plan.id);
                                                setEditedPlan({ ...plan });
                                            }}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                                            title="ערוך"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => toggleActive(plan.id)}
                                            className={`p-2 rounded-lg transition-all ${
                                                plan.isActive 
                                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                                                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                                            }`}
                                            title={plan.isActive ? 'הסתר' : 'הצג'}
                                        >
                                            <CheckCircle2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => movePlan(plan.id, 'up')}
                                            disabled={index === 0}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
                                            title="הזז למעלה"
                                        >
                                            <ArrowUp size={16} />
                                        </button>
                                        <button
                                            onClick={() => movePlan(plan.id, 'down')}
                                            disabled={index === filteredPlans.length - 1}
                                            className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all disabled:opacity-50"
                                            title="הזז למטה"
                                        >
                                            <ArrowDown size={16} />
                                        </button>
                                        <button
                                            onClick={() => setPlanToDelete(plan.id)}
                                            className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all border border-red-500/30"
                                            title="מחק"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {filteredPlans.length === 0 && (
                <div className="text-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800">
                    <Package size={48} className="text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 mb-4">אין חבילות עבור {systemConfig[selectedSystem].label}</p>
                    <button
                        onClick={() => {
                            setIsAddingPlan(true);
                            setNewPlan({ ...newPlan, system: selectedSystem });
                        }}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all"
                    >
                        הוסף חבילה ראשונה
                    </button>
                </div>
            )}

            {/* Add Plan Modal */}
            <AnimatePresence>
                {isAddingPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-white">הוסף חבילה חדשה</h3>
                                <button onClick={() => setIsAddingPlan(false)} className="text-slate-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">מערכת</label>
                                    <select
                                        value={newPlan.system}
                                        onChange={(e) => setNewPlan({ ...newPlan, system: e.target.value as SystemType })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                    >
                                        {(Object.keys(systemConfig) as SystemType[]).map(system => (
                                            <option key={system} value={system}>{systemConfig[system].label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">שם החבילה</label>
                                        <input
                                            type="text"
                                            value={newPlan.name}
                                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            placeholder="סטארטר"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">כותרת משנה</label>
                                        <input
                                            type="text"
                                            value={newPlan.subtitle || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, subtitle: e.target.value })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            placeholder="לניהול ארגוני מלא"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">שם נרדף למערכת (בעברית)</label>
                                    <input
                                        type="text"
                                        value={newPlan.systemSubtitle || ''}
                                        onChange={(e) => setNewPlan({ ...newPlan, systemSubtitle: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                        placeholder="למשל: לידים ומכירות, ניהול עסק, ניהול לקוחות"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">מחיר חודשי (₪)</label>
                                        <input
                                            type="number"
                                            value={newPlan.priceMonthly || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            placeholder="599"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-white mb-2">מחיר שנתי (₪)</label>
                                        <input
                                            type="number"
                                            value={newPlan.priceYearly || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, priceYearly: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-indigo-500 outline-none"
                                            placeholder="479"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-white mb-2">תכונות (מופרדות בשורה חדשה)</label>
                                    <textarea
                                        value={(newPlan.features || []).join('\n')}
                                        onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value.split('\n').filter(f => f.trim()) })}
                                        className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white text-sm focus:border-indigo-500 outline-none resize-none"
                                        rows={6}
                                        placeholder="עד 5 משתמשים&#10;ראייה רוחבית - רואה משימות של כולם&#10;ניהול משאבי אנוש (HR)"
                                    />
                                </div>
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newPlan.recommended || false}
                                            onChange={(e) => setNewPlan({ ...newPlan, recommended: e.target.checked })}
                                            className="w-4 h-4 rounded border-white/20 bg-black/40 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-white">מומלץ (הכי משתלם)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setIsAddingPlan(false)}
                                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleAddPlan}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-bold"
                                >
                                    הוסף חבילה
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {planToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <AlertCircle className="text-red-400" size={24} />
                                <h3 className="text-xl font-bold text-white">מחיקת חבילה</h3>
                            </div>
                            <p className="text-slate-300 mb-6">
                                האם אתה בטוח שברצונך למחוק את החבילה "{plans.find(p => p.id === planToDelete)?.name}"?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setPlanToDelete(null)}
                                    className="px-4 py-2 text-slate-400 hover:text-white"
                                >
                                    ביטול
                                </button>
                                <button
                                    onClick={handleDeletePlan}
                                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500"
                                >
                                    מחק
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
