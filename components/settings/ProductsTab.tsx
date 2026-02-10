'use client';

import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { ModuleId, Product } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { MODULES_CONFIG } from '../saas/SaasConstants';

export const ProductsTab: React.FC = () => {
    const { products, saveProductsCatalog, deleteProduct, hasPermission, addToast } = useData();
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ id: '', name: '', price: 0, color: 'bg-gray-800 text-white', modules: [] });
    const [isShaking, setIsShaking] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    
    // Delete Modal
    const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);

    const canEditProducts = hasPermission('manage_system');

    const handleAddProduct = async () => {
        if(!newProduct.name || !newProduct.name.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const modules = Array.isArray(newProduct.modules) ? (newProduct.modules as ModuleId[]) : [];
        if (modules.length === 0) {
            addToast('נא לבחור לפחות מודול אחד לחבילה', 'error');
            return;
        }
        
        const productToAdd: Product = { ...newProduct, id: `prod_${Date.now()}`, modules } as Product;
        const prev = Array.isArray(products) ? products : [];
        const next = [...prev, productToAdd];
        const ok = await saveProductsCatalog(next);
        if (!ok) return;

        addToast(`המוצר "${newProduct.name}" נוסף לקטלוג`, 'success');

        setNewProduct({ id: '', name: '', price: 0, color: 'bg-gray-800 text-white', modules: [] });
        setIsAddingProduct(false);
    };

    const toggleNewProductModule = (moduleId: ModuleId) => {
        setNewProduct(prev => {
            const current = Array.isArray(prev.modules) ? (prev.modules as ModuleId[]) : [];
            const next = current.includes(moduleId) ? current.filter(m => m !== moduleId) : [...current, moduleId];
            return { ...prev, modules: next };
        });
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setProductToDelete({ id, name });
    };

    const confirmDelete = () => {
        if (productToDelete) {
            deleteProduct(productToDelete.id);
            setProductToDelete(null);
        }
    };

    return (
        <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת מוצר"
                description="המוצר יימחק מהקטלוג. המידע על רכישות עבר לא יימחק אך המוצר לא יהיה זמין לבחירה."
                itemName={productToDelete?.name}
                isHardDelete={true}
            />

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">קטלוג מוצרים</h2>
                    <p className="text-sm text-gray-500">ניהול חבילות ושירותים למכירה.</p>
                </div>
                {canEditProducts && (
                    <button 
                        onClick={() => { setIsAddingProduct(true); setIsShaking(false); }}
                        className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-gray-800 transition-colors"
                    >
                        <Plus size={18} /> מוצר חדש
                    </button>
                )}
            </div>

            <AnimatePresence>
                {isAddingProduct && canEditProducts && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 overflow-hidden mb-6">
                        <h3 className="font-bold text-gray-900 mb-4">הוספת מוצר חדש</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <input 
                                ref={nameInputRef}
                                type="text" 
                                placeholder="שם המוצר (למשל: ייעוץ אישי)" 
                                value={newProduct.name}
                                onChange={(e) => { setNewProduct({...newProduct, name: e.target.value}); setIsShaking(false); }}
                                className={`p-3 border rounded-xl outline-none transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                            />
                            <input 
                                type="number" 
                                placeholder="מחיר (₪)" 
                                value={newProduct.price || ''}
                                onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black"
                            />
                            <input 
                                type="text" 
                                placeholder="צבע (Tailwind Class, e.g. bg-red-500)" 
                                value={newProduct.color}
                                onChange={(e) => setNewProduct({...newProduct, color: e.target.value})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black dir-ltr"
                            />
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">מודולים בחבילה</div>
                            <div className="flex flex-wrap gap-2">
                                {MODULES_CONFIG.map((m) => {
                                    const selected = Array.isArray(newProduct.modules) && (newProduct.modules as ModuleId[]).includes(m.id as ModuleId);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => toggleNewProductModule(m.id as ModuleId)}
                                            className={`px-3 py-2 rounded-xl border text-sm font-bold transition-colors flex items-center gap-2 ${
                                                selected
                                                    ? 'bg-black text-white border-black'
                                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <m.icon size={16} className={selected ? 'text-white' : m.color} />
                                            {m.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsAddingProduct(false)} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors">ביטול</button>
                            <button onClick={handleAddProduct} className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">שמור</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {products.map((product: Product) => (
                    <div key={product.id} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between group hover:border-gray-300 transition-all">
                        <div>
                            <div className={`h-2 w-12 rounded-full mb-4 ${product.color.split(' ')[0]}`}></div>
                            <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                            <p className="text-2xl font-black text-gray-900 mt-2">₪{product.price.toLocaleString()}</p>
                            {Array.isArray(product.modules) && product.modules.length > 0 ? (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {product.modules.map((mod) => {
                                        const conf = MODULES_CONFIG.find((c) => c.id === mod);
                                        return (
                                            <span key={mod} className="inline-flex items-center gap-1 rounded-full bg-gray-50 border border-gray-200 px-2.5 py-1 text-xs font-bold text-gray-700">
                                                {conf ? <conf.icon size={14} className={conf.color} /> : null}
                                                {conf?.label || mod}
                                            </span>
                                        );
                                    })}
                                </div>
                            ) : null}
                        </div>
                        {canEditProducts && (
                            <div className="mt-6 pt-4 border-t border-gray-50 flex justify-end">
                                <button 
                                    onClick={(e) => handleDeleteClick(e, product.id, product.name)}
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                    aria-label={`מחק מוצר ${product.name}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
