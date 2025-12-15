
import React from 'react';
import { motion } from 'framer-motion';
import { Tenant, Product } from '../../types';
import { Globe } from 'lucide-react';

interface AddTenantModalProps {
    onClose: () => void;
    onAdd: (tenant: Omit<Tenant, 'id' | 'joinedAt' | 'logo' | 'modules' | 'status' | 'usersCount' | 'mrr'>, mrr: number) => void;
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

        onAdd({ 
            name, 
            ownerEmail: email, 
            subdomain: subdomain.toLowerCase().replace(/\s+/g, '-'), // Sanitize
            plan,
            region: region as any
        }, mrr);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            >
                <h3 className="text-xl font-bold text-white mb-6">הקמת לקוח חדש (Provisioning)</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">שם העסק</label>
                        <input name="name" required className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:border-indigo-500 outline-none" placeholder="Acme Corp" />
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">כתובת המערכת (Subdomain)</label>
                        <div className="flex items-center">
                            <span className="text-slate-500 bg-slate-900 border border-slate-600 border-l-0 rounded-r-xl p-3 text-sm">https://</span>
                            <input 
                                name="subdomain" 
                                required 
                                className="flex-1 bg-slate-900 border-y border-slate-600 p-3 text-white focus:border-indigo-500 outline-none text-left dir-ltr font-mono text-sm" 
                                placeholder="acme" 
                            />
                            <span className="text-slate-500 bg-slate-900 border border-slate-600 border-r-0 rounded-l-xl p-3 text-sm">.nexus-os.co</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">כתובת זו תשמש את כל עובדי החברה לכניסה למערכת.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">אימייל בעלים (Admin)</label>
                        <input name="email" required type="email" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:border-indigo-500 outline-none dir-ltr text-right" placeholder="admin@acme.com" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">חבילה</label>
                            <select name="plan" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:border-indigo-500 outline-none">
                                {products.map(p => (
                                    <option key={p.id} value={p.name}>{p.name} - ₪{p.price}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">איזור שרת (DB)</label>
                            <select name="region" className="w-full bg-slate-900 border border-slate-600 rounded-xl p-3 text-white focus:border-indigo-500 outline-none">
                                <option value="il-central">Israel (TLV)</option>
                                <option value="eu-west">Europe (Frankfurt)</option>
                                <option value="us-east">USA (N. Virginia)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 border-t border-slate-700 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">ביטול</button>
                        <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors flex items-center gap-2">
                            <Globe size={16} /> הקם שרת
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};
