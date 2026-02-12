'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tenant, Product, ModuleId } from '../../types';
import { Building2, Mail, Globe2, Package, Server, X, Sparkles, Phone, Users, Languages, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StyledDropdown } from '@/components/ui/StyledDropdown';

interface AddTenantModalProps {
    onClose: () => void;
    onAdd: (tenant: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] }, mrr: number) => void;
    products: Product[];
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ onClose, onAdd, products }) => {
    const [selectedPlan, setSelectedPlan] = useState(products[0]?.name || '');
    const [selectedRegion, setSelectedRegion] = useState<NonNullable<Tenant['region']>>('il-central');

    const handleRegionChange = (value: string) => {
        if (value === 'il-central' || value === 'eu-west' || value === 'us-east') {
            setSelectedRegion(value);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const subdomain = (form.elements.namedItem('subdomain') as HTMLInputElement).value;
        const phone = (form.elements.namedItem('phone') as HTMLInputElement)?.value || undefined;
        const maxUsers = (form.elements.namedItem('maxUsers') as HTMLInputElement)?.value;
        const defaultLanguage = (form.elements.namedItem('defaultLanguage') as HTMLSelectElement)?.value || 'he';
        const activationDate = (form.elements.namedItem('activationDate') as HTMLInputElement)?.value || undefined;
        const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement)?.value || undefined;
        
        const selectedProduct = products.find(p => p.name === selectedPlan);
        const mrr = selectedProduct ? selectedProduct.price : 0;
        const defaultModules = selectedProduct?.modules || ['crm', 'team'];

        onAdd({ 
            name, 
            ownerEmail: email, 
            subdomain: String(subdomain ?? '').toLowerCase().replace(/\s+/g, '-'),
            plan: selectedPlan,
            region: selectedRegion,
            modules: defaultModules,
            phone,
            maxUsers: maxUsers ? parseInt(maxUsers) : undefined,
            defaultLanguage,
            activationDate,
            notes
        }, mrr);
    };

    const planOptions = products.map(p => ({
        value: p.name,
        label: `${p.name} • ₪${p.price}`
    }));

    const regionOptions: Array<{ value: NonNullable<Tenant['region']>; label: string }> = [
        { value: 'il-central', label: 'Israel (TLV)' },
        { value: 'eu-west', label: 'Europe (Frankfurt)' },
        { value: 'us-east', label: 'USA (N. Virginia)' }
    ];

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-indigo-900/60 backdrop-blur-md"
                    onClick={onClose}
                />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.92, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 30 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative bg-gradient-to-br from-white via-white to-slate-50/50 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200/60"
                >
                    {/* Gradient Overlay Effects */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-100/30 via-purple-50/20 to-transparent rounded-full blur-3xl opacity-60 -translate-y-1/2 translate-x-1/4" />
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-slate-100/40 via-indigo-50/20 to-transparent rounded-full blur-3xl opacity-50 translate-y-1/2 -translate-x-1/4" />
                    
                    {/* Header */}
                    <div className="relative border-b border-slate-200/60 bg-gradient-to-r from-white/80 to-slate-50/60 backdrop-blur-xl px-8 py-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-md opacity-40" />
                                <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-center shadow-lg">
                                    <Building2 className="w-7 h-7 text-white" strokeWidth={2.5} />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">הוסף חשבון SaaS</h3>
                                <p className="text-sm text-slate-500 font-medium mt-0.5">צור חשבון חדש ללקוח במערכת</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl hover:bg-slate-200/60 active:bg-slate-300/60 flex items-center justify-center transition-all hover:scale-105"
                        >
                            <X className="w-5 h-5 text-slate-600" strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="relative p-8">
                        <div className="space-y-6">
                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <Building2 className="w-4 h-4 text-indigo-600" />
                                    שם העסק *
                                </label>
                                <Input name="name" required placeholder="Acme Corp" className="h-12 text-base" />
                            </div>
                        
                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <Globe2 className="w-4 h-4 text-indigo-600" />
                                    כתובת המערכת (Subdomain) *
                                </label>
                                <div className="flex items-stretch rounded-xl border-2 border-slate-200 overflow-hidden bg-white shadow-sm focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-100 transition-all">
                                    <span className="flex items-center px-4 text-sm font-bold text-slate-600 bg-gradient-to-br from-slate-50 to-slate-100/80 border-l border-slate-200">https://</span>
                                    <input 
                                        name="subdomain" 
                                        required 
                                        className="flex-1 px-4 py-3 text-base font-bold text-slate-900 placeholder:text-slate-400 outline-none text-left dir-ltr font-mono bg-white" 
                                        placeholder="acme" 
                                    />
                                    <span className="flex items-center px-4 text-sm font-bold text-slate-600 bg-gradient-to-br from-slate-50 to-slate-100/80 border-r border-slate-200">.nexus-os.co</span>
                                </div>
                                <div className="mt-3 flex items-start gap-2 px-1">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                    <p className="text-xs text-slate-600 leading-relaxed">כתובת ייחודית לארגון - כל העובדים ישתמשו בה לכניסה למערכת</p>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <Mail className="w-4 h-4 text-indigo-600" />
                                    אימייל בעלים (Admin) *
                                </label>
                                <Input name="email" required type="email" placeholder="admin@acme.com" className="h-12 text-base dir-ltr text-right" />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <Phone className="w-4 h-4 text-indigo-600" />
                                    טלפון ליצירת קשר
                                </label>
                                <Input name="phone" type="tel" placeholder="050-1234567" className="h-12 text-base dir-ltr text-right" />
                            </div>
                        
                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                        <Package className="w-4 h-4 text-indigo-600" />
                                        חבילה *
                                    </label>
                                    <StyledDropdown
                                        value={selectedPlan}
                                        onChange={setSelectedPlan}
                                        options={planOptions}
                                        variant="default"
                                    />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                        <Server className="w-4 h-4 text-indigo-600" />
                                        איזור שרת *
                                    </label>
                                    <StyledDropdown
                                        value={selectedRegion}
                                        onChange={handleRegionChange}
                                        options={regionOptions}
                                        variant="default"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-5">
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                        <Users className="w-4 h-4 text-indigo-600" />
                                        כמות משתמשים מקסימלית
                                    </label>
                                    <Input name="maxUsers" type="number" min="1" placeholder="10" className="h-12 text-base" />
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                        <Languages className="w-4 h-4 text-indigo-600" />
                                        שפת ברירת מחדל
                                    </label>
                                    <select
                                        name="defaultLanguage"
                                        defaultValue="he"
                                        className="w-full h-12 px-4 text-base font-bold text-slate-900 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all"
                                    >
                                        <option value="he">עברית</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <Calendar className="w-4 h-4 text-indigo-600" />
                                    תאריך הפעלה
                                </label>
                                <Input name="activationDate" type="date" className="h-12 text-base" />
                            </div>

                            <div>
                                <label className="flex items-center gap-2 text-sm font-black text-slate-800 mb-3">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                    הערות פנימיות
                                </label>
                                <textarea
                                    name="notes"
                                    rows={3}
                                    placeholder="הערות או הוראות מיוחדות..."
                                    className="w-full px-4 py-3 text-base font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 transition-all resize-none"
                                />
                            </div>

                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-slate-200">
                            <Button 
                                type="button" 
                                onClick={onClose} 
                                variant="outline" 
                                size="lg"
                                className="px-6 hover:bg-slate-100"
                            >
                                ביטול
                            </Button>
                            <Button 
                                type="submit" 
                                size="lg"
                                className="px-8 gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-105 transition-all"
                            >
                                <Building2 className="w-5 h-5" strokeWidth={2.5} />
                                <span className="font-black">צור חשבון</span>
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
