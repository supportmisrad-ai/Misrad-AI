'use client';

import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Package, Tag } from 'lucide-react';
import { Product, ProductUnit } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

const UNIT_LABELS: Record<ProductUnit, string> = {
    unit: 'יחידה',
    hour: 'שעה',
    session: 'פגישה',
    month: 'חודשי',
    project: 'פרויקט',
    package: 'חבילה',
};

const COLOR_OPTIONS = [
    { value: 'bg-blue-600', label: 'כחול' },
    { value: 'bg-emerald-600', label: 'ירוק' },
    { value: 'bg-amber-500', label: 'כתום' },
    { value: 'bg-rose-600', label: 'אדום' },
    { value: 'bg-violet-600', label: 'סגול' },
    { value: 'bg-slate-900', label: 'שחור' },
    { value: 'bg-indigo-600', label: 'אינדיגו' },
    { value: 'bg-pink-500', label: 'ורוד' },
];

const EMPTY_PRODUCT: Partial<Product> = {
    id: '', name: '', description: '', price: 0,
    unit: 'unit', category: '', sku: '', color: 'bg-blue-600',
    isActive: true,
};

export const ProductsTab: React.FC = () => {
    const { products, saveProductsCatalog, deleteProduct, hasPermission, addToast, currentUser } = useData();
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({ ...EMPTY_PRODUCT });
    const [isShaking, setIsShaking] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    
    const [productToDelete, setProductToDelete] = useState<{id: string, name: string} | null>(null);

    const canEditProducts = hasPermission('manage_system') || currentUser?.isTenantAdmin;

    const handleAddProduct = async () => {
        if (!newProduct.name || !newProduct.name.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        if (!newProduct.price || newProduct.price <= 0) {
            addToast('נא להזין מחיר תקין', 'error');
            return;
        }
        
        const productToAdd: Product = {
            id: `prod_${Date.now()}`,
            name: newProduct.name.trim(),
            description: newProduct.description?.trim() || undefined,
            price: newProduct.price,
            unit: newProduct.unit || 'unit',
            category: newProduct.category?.trim() || undefined,
            sku: newProduct.sku?.trim() || undefined,
            color: newProduct.color || 'bg-blue-600',
            isActive: true,
        };

        const prev = Array.isArray(products) ? products : [];
        const next = [...prev, productToAdd];
        const ok = await saveProductsCatalog(next);
        if (!ok) return;

        addToast(`המוצר "${productToAdd.name}" נוסף לקטלוג`, 'success');
        setNewProduct({ ...EMPTY_PRODUCT });
        setIsAddingProduct(false);
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

    const activeProducts = products.filter((p: Product) => p.isActive !== false);
    const inactiveProducts = products.filter((p: Product) => p.isActive === false);

    const toggleActive = async (product: Product) => {
        const next = products.map((p: Product) =>
            p.id === product.id ? { ...p, isActive: !p.isActive } : p
        );
        const ok = await saveProductsCatalog(next);
        if (ok) {
            addToast(product.isActive !== false ? `"${product.name}" הועבר ללא פעיל` : `"${product.name}" הופעל מחדש`, 'info');
        }
    };

    const renderProductCard = (product: Product) => (
        <div key={product.id} className={`bg-white p-6 rounded-2xl border shadow-sm flex flex-col justify-between group transition-all ${product.isActive === false ? 'border-gray-100 opacity-60' : 'border-gray-200 hover:border-gray-300'}`}>
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className={`h-2 w-12 rounded-full ${product.color?.split(' ')[0] || 'bg-blue-600'}`} />
                    {product.category && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-full px-2.5 py-0.5 border border-gray-100">
                            <Tag size={12} />
                            {product.category}
                        </span>
                    )}
                </div>
                <h3 className="font-bold text-lg text-gray-900">{product.name}</h3>
                {product.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{product.description}</p>
                )}
                <div className="flex items-baseline gap-2 mt-3">
                    <span className="text-2xl font-black text-gray-900">₪{product.price.toLocaleString()}</span>
                    {product.unit && product.unit !== 'unit' && (
                        <span className="text-sm text-gray-400">/ {UNIT_LABELS[product.unit] || product.unit}</span>
                    )}
                </div>
                {product.sku && (
                    <p className="text-xs text-gray-400 mt-1 font-mono">מק״ט: {product.sku}</p>
                )}
            </div>
            {canEditProducts && (
                <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center">
                    <button
                        onClick={() => toggleActive(product)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                            product.isActive !== false
                                ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                                : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                    >
                        {product.isActive !== false ? 'השבת' : 'הפעל'}
                    </button>
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
    );

    return (
        <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!productToDelete}
                onClose={() => setProductToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת מוצר"
                description="המוצר יימחק לצמיתות מהקטלוג."
                itemName={productToDelete?.name}
                isHardDelete={true}
            />

            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">קטלוג מוצרים ושירותים</h2>
                    <p className="text-sm text-gray-500">המוצרים והשירותים שהעסק שלך מציע ללקוחות.</p>
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
                        <h3 className="font-bold text-gray-900 mb-4">הוספת מוצר / שירות</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <input 
                                ref={nameInputRef}
                                type="text" 
                                placeholder="שם המוצר (למשל: ייעוץ אישי, חבילת שיווק)" 
                                value={newProduct.name}
                                onChange={(e) => { setNewProduct({...newProduct, name: e.target.value}); setIsShaking(false); }}
                                className={`p-3 border rounded-xl outline-none transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                            />
                            <input 
                                type="text" 
                                placeholder="תיאור קצר (אופציונלי)" 
                                value={newProduct.description || ''}
                                onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <input 
                                type="number" 
                                placeholder="מחיר (₪)" 
                                value={newProduct.price || ''}
                                onChange={(e) => setNewProduct({...newProduct, price: Number(e.target.value)})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black"
                            />
                            <select
                                value={newProduct.unit || 'unit'}
                                onChange={(e) => setNewProduct({...newProduct, unit: e.target.value as ProductUnit})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black bg-white"
                            >
                                {(Object.entries(UNIT_LABELS) as [ProductUnit, string][]).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                            <input 
                                type="text" 
                                placeholder="קטגוריה (אופציונלי)" 
                                value={newProduct.category || ''}
                                onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black"
                            />
                            <input 
                                type="text" 
                                placeholder="מק״ט (אופציונלי)" 
                                value={newProduct.sku || ''}
                                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
                                className="p-3 border border-gray-200 rounded-xl outline-none focus:border-black dir-ltr"
                            />
                        </div>

                        <div className="mb-4">
                            <div className="text-sm font-bold text-gray-900 mb-2">צבע</div>
                            <div className="flex flex-wrap gap-2">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        onClick={() => setNewProduct({...newProduct, color: c.value})}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${c.value} ${
                                            newProduct.color === c.value
                                                ? 'border-black ring-2 ring-offset-2 ring-black scale-110'
                                                : 'border-transparent hover:scale-105'
                                        }`}
                                        aria-label={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => { setIsAddingProduct(false); setNewProduct({ ...EMPTY_PRODUCT }); }} className="px-4 py-2 text-gray-500 font-bold hover:bg-gray-200 rounded-xl transition-colors">ביטול</button>
                            <button onClick={handleAddProduct} className="px-6 py-2 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-colors">שמור</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {products.length === 0 && !isAddingProduct && (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Package size={48} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">עוד אין מוצרים בקטלוג</h3>
                    <p className="text-sm text-gray-500 mb-6">הוסיפו את המוצרים והשירותים שהעסק מציע ללקוחות</p>
                    {canEditProducts && (
                        <button
                            onClick={() => setIsAddingProduct(true)}
                            className="bg-black text-white px-6 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 hover:bg-gray-800 transition-colors"
                        >
                            <Plus size={18} /> הוספת מוצר ראשון
                        </button>
                    )}
                </div>
            )}

            {activeProducts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {activeProducts.map(renderProductCard)}
                </div>
            )}

            {inactiveProducts.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-sm font-bold text-gray-400 mb-3">לא פעילים ({inactiveProducts.length})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {inactiveProducts.map(renderProductCard)}
                    </div>
                </div>
            )}
        </motion.div>
    );
};
