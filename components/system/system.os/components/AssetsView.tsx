
import React, { useState } from 'react';
import { 
    Folder, Link, Key, FileText, Lock, Copy, ExternalLink, 
    Eye, EyeOff, Search, Plus, ShieldCheck, Download
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

type AssetCategory = 'all' | 'links' | 'passwords' | 'files' | 'templates';

interface Asset {
    id: string;
    title: string;
    description: string;
    category: AssetCategory;
    type: 'link' | 'password' | 'file';
    value: string; // The url, password, or file link
    icon?: React.ReactNode;
    color?: string;
    isSecure?: boolean; // Requires toggle to see
}

const INITIAL_ASSETS: Asset[] = [
    
];

const AssetsView: React.FC = () => {
    const { addToast } = useToast();
    const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
    const [activeCategory, setActiveCategory] = useState<AssetCategory>('all');
    const [search, setSearch] = useState('');
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

    const togglePasswordVisibility = (id: string) => {
        const newSet = new Set(visiblePasswords);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setVisiblePasswords(newSet);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addToast(`${label} הועתק ללוח`, 'success');
    };

    const handleAddAsset = () => {
        addToast('הוספת נכס אינה זמינה כרגע', 'info');
    };

    const filteredAssets = assets.filter(asset => {
        const matchesCategory = activeCategory === 'all' || asset.category === activeCategory || (activeCategory === 'templates' && asset.category === 'templates');
        const matchesSearch = asset.title.toLowerCase().includes(search.toLowerCase()) || asset.description.toLowerCase().includes(search.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const getIcon = (type: string) => {
        switch(type) {
            case 'link': return <Link size={20} />;
            case 'password': return <Key size={20} />;
            case 'file': return <FileText size={20} />;
            default: return <Folder size={20} />;
        }
    };

    const getActionIcon = (type: string) => {
        switch(type) {
            case 'link': return <ExternalLink size={16} />;
            case 'file': return <Download size={16} />;
            default: return <Copy size={16} />;
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto animate-fade-in pb-20 h-full flex flex-col">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <Lock className="text-indigo-600" strokeWidth={2.5} />
                        נכסים
                    </h2>
                </div>
                <button 
                    onClick={handleAddAsset}
                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center gap-2 hover:-translate-y-0.5"
                >
                    <Plus size={18} />
                    הוסף נכס
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 mb-8">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="חפש סיסמה, לינק או קובץ..." 
                        className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
                    {[
                        { id: 'all', label: 'הכל', icon: Folder },
                        { id: 'links', label: 'קישורים', icon: Link },
                        { id: 'passwords', label: 'סיסמאות', icon: Key },
                        { id: 'files', label: 'קבצים', icon: FileText },
                        { id: 'templates', label: 'נהלים וטמפלטים', icon: ShieldCheck },
                    ].map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id as AssetCategory)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-bold transition-all whitespace-nowrap border ${
                                activeCategory === cat.id 
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <cat.icon size={16} />
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAssets.map(asset => (
                    <div key={asset.id} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md ${asset.color}`}>
                                {getIcon(asset.type)}
                            </div>
                            {asset.isSecure && (
                                <div className="bg-slate-100 p-1.5 rounded-lg text-slate-400" title="מוגן">
                                    <Lock size={14} />
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1">
                            <h3 className="font-bold text-slate-800 text-lg mb-1">{asset.title}</h3>
                            <p className="text-slate-500 text-sm mb-4">{asset.description}</p>
                            
                            {/* Value Display Area */}
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between group-hover:bg-indigo-50/50 group-hover:border-indigo-100 transition-colors">
                                <div className="font-mono text-xs text-slate-600 truncate flex-1 mr-2 font-bold">
                                    {asset.type === 'password' 
                                        ? (visiblePasswords.has(asset.id) ? asset.value : '••••••••••••') 
                                        : asset.value}
                                </div>
                                <div className="flex gap-1 shrink-0">
                                    {asset.type === 'password' && (
                                        <button 
                                            onClick={() => togglePasswordVisibility(asset.id)}
                                            className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            {visiblePasswords.has(asset.id) ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => {
                                            if (asset.type === 'link') window.open(asset.value, '_blank');
                                            else copyToClipboard(asset.value, asset.title);
                                        }}
                                        className="p-1.5 hover:bg-white rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"
                                        title={asset.type === 'link' ? 'פתח קישור' : 'העתק'}
                                    >
                                        {getActionIcon(asset.type)}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {/* Add New Placeholder */}
                <button 
                    onClick={handleAddAsset}
                    className="border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all min-h-[200px] group"
                >
                    <div className="w-12 h-12 rounded-full bg-slate-50 group-hover:bg-white border border-slate-100 flex items-center justify-center mb-3 transition-colors group-hover:shadow-md">
                        <Plus size={24} />
                    </div>
                    <span className="font-bold text-sm">הוסף נכס חדש</span>
                </button>
            </div>

        </div>
    );
};

export default AssetsView;
