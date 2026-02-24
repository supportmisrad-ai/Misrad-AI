'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Package, Plus, Edit2, Save, X, CircleCheckBig, Trash2, Eye, 
    CircleAlert, ChevronDown, ChevronUp, LayoutDashboard, Zap, HeartPulse, Crown,
    ArrowUp, ArrowDown
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getModuleLabelHe } from '@/lib/os/modules/registry';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/CustomSelect';

export type SystemType = 'nexus' | 'system' | 'client' | 'social' | 'bundle';

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

export const ComprehensivePricingPanel: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    const { addToast, updateSettings } = useData();

    const isNewPricingPlanSet = (candidate: unknown): candidate is LandingPagePlan[] => {
        if (!Array.isArray(candidate)) return false;
        const allowedMonthly = new Set([149, 249, 349]);
        const allowedYearly = new Set([119, 199, 279]);
        for (const p of candidate) {
            if (!p || typeof p !== 'object') return false;
            if (!['nexus', 'system', 'client', 'social', 'bundle'].includes(String((p as Record<string, unknown>).system))) return false;
            const pm = Number((p as Record<string, unknown>).priceMonthly);
            const py = Number((p as Record<string, unknown>).priceYearly);
            if (!allowedMonthly.has(pm)) return false;
            if (!allowedYearly.has(py)) return false;
        }
        // If someone has an empty set, treat it as invalid.
        return candidate.length > 0;
    };
    
    // Load plans from localStorage
    const [plans, setPlans] = useState<LandingPagePlan[]>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('landing_page_plans');
            if (saved) {
                try {
                    const parsed = JSON.parse(saved);
                    if (isNewPricingPlanSet(parsed)) {
                        return parsed;
                    }
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
        social: false,
        bundle: false
    });

    function getDefaultPlans(): LandingPagePlan[] {
        return [
            // Single Module (149)
            { id: 'nexus_single', system: 'nexus', name: `${getModuleLabelHe('nexus')} (למנהלים)`, subtitle: 'מודול בודד (משתמש אחד)', systemSubtitle: 'ניהול עסק', priceMonthly: 149, priceYearly: 119, features: ['משתמש אחד (ללא ניהול צוות)', 'משימות וניהול', 'תמונה רחבה', 'תמיכה בעברית'], recommended: false, order: 0, isActive: true },
            { id: 'system_single', system: 'system', name: getModuleLabelHe('system'), subtitle: 'מודול בודד (משתמש אחד)', systemSubtitle: 'לידים ומכירות', priceMonthly: 149, priceYearly: 119, features: ['משתמש אחד (ללא ניהול צוות)', 'ניהול לידים', 'Pipeline מכירות', 'Follow Up', 'תמיכה בעברית'], recommended: true, order: 0, isActive: true },
            { id: 'client_single', system: 'client', name: getModuleLabelHe('client'), subtitle: 'מודול בודד (משתמש אחד)', systemSubtitle: 'ניהול לקוחות', priceMonthly: 149, priceYearly: 119, features: ['משתמש אחד (ללא ניהול צוות)', 'פורטל לקוח', 'קבוצות', 'פגישות', 'תמיכה בעברית'], recommended: false, order: 0, isActive: true },
            { id: 'social_single', system: 'social', name: getModuleLabelHe('social'), subtitle: 'מודול בודד (משתמש אחד)', systemSubtitle: 'סושיאל', priceMonthly: 149, priceYearly: 119, features: ['משתמש אחד (ללא ניהול צוות)', 'פורטל לקוח', 'תוכן לפי DNA', 'גבייה', 'תמיכה בעברית'], recommended: false, order: 0, isActive: true },

            // Bundle (249 / 349)
            { id: 'bundle_combo', system: 'bundle', name: 'חבילת Combo (2 מודולים)', subtitle: 'בחר 2 מודולים מתוך 4', systemSubtitle: '2 מודולים', priceMonthly: 249, priceYearly: 199, features: ['משתמש אחד (ללא ניהול צוות)', 'בחר 2 מודולים מתוך 4', 'כניסה אחת', 'סנכרון בין המודולים'], recommended: true, order: 0, isActive: true },
            { id: 'full_stack', system: 'bundle', name: 'משרד מלא (4 מודולים)', subtitle: 'כולל 5 משתמשים · +₪39 לכל מושב נוסף', systemSubtitle: '4 מודולים', priceMonthly: 349, priceYearly: 279, features: [getModuleLabelHe('nexus'), getModuleLabelHe('system'), getModuleLabelHe('social'), getModuleLabelHe('client'), 'סנכרון מלא בין כל המודולים'], recommended: false, order: 1, isActive: true }
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

    const systemConfig: Record<SystemType, { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
        nexus: { label: getModuleLabelHe('nexus'), icon: LayoutDashboard, color: 'indigo' },
        system: { label: getModuleLabelHe('system'), icon: Zap, color: 'emerald' },
        client: { label: getModuleLabelHe('client'), icon: HeartPulse, color: 'purple' },
        social: { label: getModuleLabelHe('social'), icon: Zap, color: 'blue' },
        bundle: { label: 'חבילה', icon: Crown, color: 'yellow' }
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
            {!hideHeader ? (
                <div className="flex justify-between items-end mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">ניהול חבילות דפי הנחיתה</h1>
                        <p className="text-slate-600">נהל את כל החבילות מכל המערכות - {getModuleLabelHe('nexus')}, {getModuleLabelHe('system')}, {getModuleLabelHe('client')} וחבילה.</p>
                    </div>
                    <Button
                        onClick={() => {
                            setIsAddingPlan(true);
                            setNewPlan({ ...newPlan, system: selectedSystem });
                        }}
                    >
                        <Plus size={18} /> חבילה חדשה
                    </Button>
                </div>
            ) : null}

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
                        <Button
                            key={system}
                            onClick={() => setSelectedSystem(system)}
                            variant={isActive ? 'default' : 'outline'}
                            className={`h-auto px-6 py-3 rounded-xl font-bold text-sm transition-all flex flex-col items-start gap-1.5 min-w-[140px] ${
                                isActive ? 'shadow-lg shadow-indigo-900/10' : 'bg-white/70 hover:bg-slate-50'
                            }`}
                        >
                            <div className="flex items-center gap-2 w-full">
                                <Icon size={18} />
                                <span className="flex-1 text-right">{config.label}</span>
                                {systemPlansCount > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-700 border border-slate-200'
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
                        </Button>
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
                            className={`bg-white/70 backdrop-blur-2xl border rounded-3xl p-6 transition-all ${
                                isEditing 
                                    ? 'border-indigo-500/50 shadow-indigo-900/50 ring-2 ring-indigo-500/30' 
                                    : plan.isActive
                                        ? 'border-slate-200/70 hover:border-slate-300/80'
                                        : 'border-slate-200/70 opacity-60'
                            }`}
                        >
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">שם החבילה</label>
                                            <input
                                                type="text"
                                                value={displayPlan.name}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, name: e.target.value })}
                                                className="w-full bg-white/80 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">כותרת משנה</label>
                                            <input
                                                type="text"
                                                value={displayPlan.subtitle || ''}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, subtitle: e.target.value })}
                                                className="w-full bg-white/80 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-1">שם נרדף למערכת (בעברית)</label>
                                        <input
                                            type="text"
                                            value={displayPlan.systemSubtitle || ''}
                                            onChange={(e) => setEditedPlan({ ...displayPlan, systemSubtitle: e.target.value })}
                                            className="w-full bg-white/80 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="למשל: לידים ומכירות, ניהול עסק, ניהול לקוחות"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">מחיר חודשי (₪)</label>
                                            <input
                                                type="number"
                                                value={displayPlan.priceMonthly}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, priceMonthly: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/80 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-600 mb-1">מחיר שנתי (₪)</label>
                                            <input
                                                type="number"
                                                value={displayPlan.priceYearly}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, priceYearly: parseInt(e.target.value) || 0 })}
                                                className="w-full bg-white/80 border border-slate-200 rounded-xl p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-600 mb-2">תכונות</label>
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
                                                        className="flex-1 bg-white/80 border border-slate-200 rounded-lg p-2 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                                    />
                                                    <Button
                                                        onClick={() => {
                                                            const updated = displayPlan.features.filter((_, idx) => idx !== i);
                                                            setEditedPlan({ ...displayPlan, features: updated });
                                                        }}
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-9 w-9 text-red-600 hover:bg-red-50"
                                                        aria-label="מחק תכונה"
                                                        title="מחק תכונה"
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() => setEditedPlan({ ...displayPlan, features: [...displayPlan.features, ''] })}
                                            variant="outline"
                                            size="sm"
                                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 text-xs font-bold"
                                        >
                                            <Plus size={14} className="inline mr-1" />
                                            הוסף תכונה
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={displayPlan.recommended || false}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, recommended: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-900">מומלץ (הכי משתלם)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={displayPlan.isActive}
                                                onChange={(e) => setEditedPlan({ ...displayPlan, isActive: e.target.checked })}
                                                className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-900">פעיל</span>
                                        </label>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handleSavePlan}
                                            className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold transition-all"
                                        >
                                            <Save size={16} className="inline mr-2" />
                                            שמור
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                setEditingPlan(null);
                                                setEditedPlan(null);
                                            }}
                                            variant="outline"
                                            className="flex-1 font-bold transition-all"
                                        >
                                            <X size={16} className="inline mr-2" />
                                            בטל
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-black text-slate-900">{displayPlan.name}</h3>
                                            {displayPlan.recommended && (
                                                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-700 text-xs rounded-full border border-indigo-500/30">
                                                    מומלץ
                                                </span>
                                            )}
                                            {!displayPlan.isActive && (
                                                <span className="px-2 py-0.5 bg-red-500/20 text-red-700 text-xs rounded-full border border-red-500/30">
                                                    מוסתר
                                                </span>
                                            )}
                                        </div>
                                        {displayPlan.systemSubtitle && (
                                            <p className="text-xs text-indigo-700 font-medium mb-1">{displayPlan.systemSubtitle}</p>
                                        )}
                                        {displayPlan.subtitle && (
                                            <p className="text-sm text-slate-600 mb-3">{displayPlan.subtitle}</p>
                                        )}
                                        <div className="flex items-baseline gap-2 mb-3">
                                            <span className="text-2xl font-black text-slate-900">₪{displayPlan.priceMonthly}</span>
                                            <span className="text-slate-600 text-sm">/חודש</span>
                                            <span className="text-slate-500 text-xs">(₪{displayPlan.priceYearly} שנתי)</span>
                                            <span className="text-[10px] text-slate-400 font-bold">כולל מע&quot;מ</span>
                                        </div>
                                        <div className="text-xs text-slate-600 mb-2">{displayPlan.features.length} תכונות</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => {
                                                setEditingPlan(plan.id);
                                                setEditedPlan({ ...plan });
                                            }}
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11"
                                            title="ערוך"
                                            aria-label="ערוך"
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => toggleActive(plan.id)}
                                            variant="outline"
                                            size="icon"
                                            className={`h-11 w-11 ${
                                                plan.isActive ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600' : ''
                                            }`}
                                            title={plan.isActive ? 'הסתר' : 'הצג'}
                                            aria-label={plan.isActive ? 'הסתר' : 'הצג'}
                                        >
                                            <CircleCheckBig size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => movePlan(plan.id, 'up')}
                                            disabled={index === 0}
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11 disabled:opacity-50"
                                            title="הזז למעלה"
                                            aria-label="הזז למעלה"
                                        >
                                            <ArrowUp size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => movePlan(plan.id, 'down')}
                                            disabled={index === filteredPlans.length - 1}
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11 disabled:opacity-50"
                                            title="הזז למטה"
                                            aria-label="הזז למטה"
                                        >
                                            <ArrowDown size={16} />
                                        </Button>
                                        <Button
                                            onClick={() => setPlanToDelete(plan.id)}
                                            variant="outline"
                                            size="icon"
                                            className="h-11 w-11 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                                            title="מחק"
                                            aria-label="מחק"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {filteredPlans.length === 0 && (
                <div className="text-center py-16 bg-white/70 rounded-2xl border border-slate-200/70">
                    <Package size={48} className="text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600 mb-4">אין חבילות עבור {systemConfig[selectedSystem].label}</p>
                    <Button
                        onClick={() => {
                            setIsAddingPlan(true);
                            setNewPlan({ ...newPlan, system: selectedSystem });
                        }}
                    >
                        הוסף חבילה ראשונה
                    </Button>
                </div>
            )}

            {/* Add Plan Modal */}
            <AnimatePresence>
                {isAddingPlan && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white/90 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-black text-slate-900">הוסף חבילה חדשה</h3>
                                <Button onClick={() => setIsAddingPlan(false)} variant="ghost" size="icon" className="h-11 w-11" aria-label="סגור" title="סגור">
                                    <X size={24} />
                                </Button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">מערכת</label>
                                    <CustomSelect
                                        value={newPlan.system || 'nexus'}
                                        onChange={(val) => setNewPlan({ ...newPlan, system: val as SystemType })}
                                        options={(Object.keys(systemConfig) as SystemType[]).map(system => ({ value: system, label: systemConfig[system].label }))}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">שם החבילה</label>
                                        <input
                                            type="text"
                                            value={newPlan.name}
                                            onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                            className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="סטארטר"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">כותרת משנה</label>
                                        <input
                                            type="text"
                                            value={newPlan.subtitle || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, subtitle: e.target.value })}
                                            className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="לניהול ארגוני מלא"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">שם נרדף למערכת (בעברית)</label>
                                    <input
                                        type="text"
                                        value={newPlan.systemSubtitle || ''}
                                        onChange={(e) => setNewPlan({ ...newPlan, systemSubtitle: e.target.value })}
                                        className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                        placeholder="למשל: לידים ומכירות, ניהול עסק, ניהול לקוחות"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">מחיר חודשי (₪)</label>
                                        <input
                                            type="number"
                                            value={newPlan.priceMonthly || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, priceMonthly: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="149"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-900 mb-2">מחיר שנתי (₪)</label>
                                        <input
                                            type="number"
                                            value={newPlan.priceYearly || ''}
                                            onChange={(e) => setNewPlan({ ...newPlan, priceYearly: parseInt(e.target.value) || 0 })}
                                            className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none"
                                            placeholder="119"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-900 mb-2">תכונות (מופרדות בשורה חדשה)</label>
                                    <textarea
                                        value={(newPlan.features || []).join('\n')}
                                        onChange={(e) => setNewPlan({ ...newPlan, features: e.target.value.split('\n').filter(f => f.trim()) })}
                                        className="w-full bg-white/80 border border-slate-200 rounded-lg p-3 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200/60 outline-none resize-none"
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
                                            className="w-4 h-4 rounded border-slate-300 bg-white text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-slate-900">מומלץ (הכי משתלם)</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button onClick={() => setIsAddingPlan(false)} variant="outline">ביטול</Button>
                                <Button onClick={handleAddPlan} className="font-bold">הוסף חבילה</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Delete Confirmation */}
            <AnimatePresence>
                {planToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xl">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white/90 backdrop-blur-2xl border border-slate-200/70 rounded-3xl p-8 max-w-md w-full shadow-2xl"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <CircleAlert className="text-red-600" size={24} />
                                <h3 className="text-xl font-bold text-slate-900">מחיקת חבילה</h3>
                            </div>
                            <p className="text-slate-700 mb-6">
                                האם אתה בטוח שברצונך למחוק את החבילה "{plans.find(p => p.id === planToDelete)?.name}"?
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button onClick={() => setPlanToDelete(null)} variant="outline">ביטול</Button>
                                <Button onClick={handleDeletePlan} className="bg-red-600 hover:bg-red-500 text-white">מחק</Button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
