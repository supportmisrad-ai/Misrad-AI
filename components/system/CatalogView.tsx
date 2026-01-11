'use client';


import React, { useState } from 'react';
import { 
    ShoppingBag, Search, Plus, Edit, Trash2, 
    Tag, DollarSign, Package, Layers, Zap, Info 
} from 'lucide-react';
import { useToast } from './contexts/ToastContext';

interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: 'service' | 'product' | 'retainer';
    active: boolean;
    sku: string;
}

const INITIAL_PRODUCTS: Product[] = [
    
];

const CatalogView: React.FC = () => {
    const { addToast } = useToast();
    const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<string>('all');

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || p.category === filter;
        return matchesSearch && matchesFilter;
    });

    const handleToggleStatus = (id: string) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
        addToast('סטטוס מוצר עודכן', 'success');
    };

    const handleEdit = () => {
        addToast('עריכת מוצר אינה זמינה כרגע', 'info');
    };

    const handleAdd = () => {
        addToast('הוספת מוצר אינה זמינה כרגע', 'info');
    };

    const getCategoryBadge = (cat: string) => {
        switch(cat) {
            case 'service': return <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded border border-indigo-100">שירות</span>;
            case 'retainer': return <span className="bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-1 rounded border border-amber-100">ריטיינר</span>;
            case 'product': return <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded border border-emerald-100">מוצר דיגיטלי</span>;
            default: return null;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <ShoppingBag className="text-indigo-600" strokeWidth={2.5} />
                        קטלוג מוצרים
                    </h2>
                </div>
                <button 
                    onClick={handleAdd}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                >
                    <Plus size={18} />
                    מוצר חדש
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-2">
                <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="חפש לפי שם מוצר או מק״ט..." 
                        className="w-full pl-4 pr-12 py-3 bg-transparent text-sm focus:outline-none font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="h-auto w-px bg-slate-200 mx-2 hidden md:block"></div>
                <div className="flex gap-2 p-1 overflow-x-auto">
                    {[
                        { id: 'all', label: 'הכל' },
                        { id: 'service', label: 'שירותים' },
                        { id: 'retainer', label: 'ריטיינרים' },
                        { id: 'product', label: 'מוצרים' },
                    ].map(cat => (
                        <button 
                            key={cat.id}
                            onClick={() => setFilter(cat.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === cat.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.length === 0 ? (
                    <div className="md:col-span-2 lg:col-span-3 bg-white p-10 rounded-3xl border border-slate-200 text-center text-slate-400">
                        <p className="text-sm font-bold">אין מוצרים להצגה</p>
                    </div>
                ) : (
                    filteredProducts.map(product => (
                        <div key={product.id} className={`bg-white p-6 rounded-3xl border transition-all group hover:-translate-y-1 relative overflow-hidden ${product.active ? 'border-slate-200 hover:border-indigo-200 hover:shadow-lg' : 'border-slate-100 opacity-75 bg-slate-50'}`}>
                            
                            {!product.active && (
                                <div className="absolute top-4 left-4 bg-slate-200 text-slate-500 text-[10px] font-bold px-2 py-1 rounded">לא פעיל</div>
                            )}

                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                    <Package size={24} />
                                </div>
                                {getCategoryBadge(product.category)}
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">{product.name}</h3>
                                <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 h-10">{product.description}</p>
                            </div>

                            <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                                <div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">מחיר</div>
                                    <div className="text-xl font-mono font-bold text-slate-800">₪{product.price.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-400 font-mono mb-1">{product.sku}</div>
                                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={handleEdit} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => handleToggleStatus(product.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"><Zap size={16} fill={product.active ? "currentColor" : "none"} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

export default CatalogView;
