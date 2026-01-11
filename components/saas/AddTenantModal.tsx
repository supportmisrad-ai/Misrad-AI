
import React from 'react';
import { motion } from 'framer-motion';
import { Tenant, Product, ModuleId } from '../../types';
import { Globe } from 'lucide-react';

interface AddTenantModalProps {
    onClose: () => void;
    onAdd: (tenant: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'status' | 'usersCount' | 'mrr'> & { modules?: ModuleId[] }, mrr: number) => void;
    products: Product[];
}

export const AddTenantModal: React.FC<AddTenantModalProps> = ({ onClose, onAdd, products }) => {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const name = (form.elements.namedItem('name') as HTMLInputElement).value;
        const email = (form.elements.namedItem('email') as HTMLInputElement).value;
        const subdomain = (form.elements.namedItem('subdomain') as HTMLInputElement).value;
        const plan = (form.elements.namedItem('plan') as HTMLSelectElement).value;
        const region = (form.elements.namedItem('region') as HTMLSelectElement).value;
        
        const selectedProduct = products.find(p => p.name === plan);
        const mrr = selectedProduct ? selectedProduct.price : 0;
        // Use modules from the selected plan, or default modules if plan not found
        const defaultModules = selectedProduct?.modules || ['crm', 'team'];

        onAdd({ 
            name, 
            ownerEmail: email, 
            subdomain: String(subdomain ?? '').toLowerCase().replace(/\s+/g, '-'), // Sanitize
            plan,
            region: region as any,
            modules: defaultModules // NEW: Automatically assign plan modules
        }, mrr);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] border-2 border-indigo-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl"
            >
                {/* Background Effects */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-6">הוסף לקוח חדש</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">שם העסק *</label>
                            <input name="name" required className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all" placeholder="Acme Corp" />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">כתובת המערכת (Subdomain) *</label>
                            <div className="flex items-center">
                                <span className="text-slate-500 bg-black/40 backdrop-blur-sm border border-white/10 border-l-0 rounded-r-xl p-3 text-sm">https://</span>
                                <input 
                                    name="subdomain" 
                                    required 
                                    className="flex-1 bg-black/40 backdrop-blur-sm border-y border-white/10 p-3 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none text-left dir-ltr font-mono text-sm transition-all" 
                                    placeholder="acme" 
                                />
                                <span className="text-slate-500 bg-black/40 backdrop-blur-sm border border-white/10 border-r-0 rounded-l-xl p-3 text-sm">.nexus-os.co</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">כתובת זו תשמש את כל עובדי החברה לכניסה למערכת.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">אימייל בעלים (Admin) *</label>
                            <input name="email" required type="email" className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none dir-ltr text-right transition-all" placeholder="admin@acme.com" />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">חבילה *</label>
                                <select name="plan" className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all">
                                    {products.map(p => (
                                        <option key={p.id} value={p.name}>{p.name} - ₪{p.price}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-300 mb-2">איזור שרת *</label>
                                <select name="region" className="w-full bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all">
                                    <option value="il-central">Israel (TLV)</option>
                                    <option value="eu-west">Europe (Frankfurt)</option>
                                    <option value="us-east">USA (N. Virginia)</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 border-t border-white/10 pt-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white rounded-xl font-bold transition-all">ביטול</button>
                            <button type="submit" className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/30">
                                <Globe size={16} /> צור לקוח
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};
