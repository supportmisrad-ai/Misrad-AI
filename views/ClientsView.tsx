
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { Mail, Phone, ExternalLink, MoreHorizontal, Search, Crown, Users, Plus, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, X, Check, ChevronDown, ShoppingBag, PlayCircle, Layers, Globe } from 'lucide-react';
import { Client } from '../types';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { AnimatePresence, motion } from 'framer-motion';
import { CustomSelect } from '../components/CustomSelect';

const SortIcon = ({ columnKey, sortConfig }: { columnKey: keyof Client, sortConfig: { key: keyof Client; direction: 'asc' | 'desc' } }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="text-gray-300" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-black" /> : <ArrowDown size={14} className="text-black" />;
};

const getClientGradient = (pkg: string) => {
    // Enterprise / Premium - Dark & Serious
    if (pkg.includes('Premium') || pkg.includes('ארגונים') || pkg.includes('Enterprise')) return 'bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-800'; 
    
    // Pro / Mastermind - Rich Blue/Purple
    if (pkg.includes('Mastermind') || pkg.includes('פרו') || pkg.includes('Pro')) return 'bg-gradient-to-r from-indigo-600 to-purple-600'; 
    
    // Basic / Digital - Vibrant Blue/Cyan
    if (pkg.includes('Digital') || pkg.includes('בסיס') || pkg.includes('Basic')) return 'bg-gradient-to-r from-blue-500 to-cyan-500'; 
    
    // Growth / Starter - Green/Teal
    if (pkg.includes('Start') || pkg.includes('צמיחה')) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    
    // VIP / Gold - Gold/Orange
    if (pkg.includes('Gold') || pkg.includes('VIP') || pkg.includes('זהב')) return 'bg-gradient-to-r from-amber-500 to-orange-600';
    
    // Fallback based on string length for consistent randomness
    const len = pkg.length;
    if (len % 4 === 0) return 'bg-gradient-to-r from-rose-500 to-pink-600';
    if (len % 4 === 1) return 'bg-gradient-to-r from-violet-600 to-fuchsia-600';
    if (len % 4 === 2) return 'bg-gradient-to-r from-cyan-600 to-blue-600';
    
    return 'bg-gradient-to-r from-slate-600 to-gray-600'; 
};

export const ClientsView: React.FC = () => {
    const { clients, addClient, products, templates, applyTemplate, addToast } = useData();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    
    // Add Client Form State
    const [newClientName, setNewClientName] = useState('');
    const [newContactPerson, setNewContactPerson] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPackage, setNewPackage] = useState<string>(products[0]?.name || 'Unknown');
    const [newSource, setNewSource] = useState<string>('Other'); // NEW: Source
    const [selectedOnboardingFlow, setSelectedOnboardingFlow] = useState<string>(''); // For template

    const [isShaking, setIsShaking] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    // Filter only onboarding templates
    const onboardingTemplates = templates.filter(t => t.category === 'onboarding');

    // View Mode with Persistence (Safely)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                const saved = localStorage.getItem('nexus_clients_view_mode');
                return (saved === 'list' || saved === 'grid') ? saved : 'grid';
            }
        } catch (e) { }
        return 'grid';
    });

    useEffect(() => {
        try {
            if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('nexus_clients_view_mode', viewMode);
            }
        } catch (e) { }
    }, [viewMode]);

    const [sortConfig, setSortConfig] = useState<{ key: keyof Client; direction: 'asc' | 'desc' }>({ key: 'joinedAt', direction: 'desc' });

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortedClients = [...filteredClients].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: keyof Client) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleCreateClient = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const clientId = `C-${Date.now()}`;

        const newClient: Client = {
            id: clientId,
            name: newClientName,
            companyName: newClientName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newClientName)}&background=random&color=fff`,
            package: newPackage,
            status: 'Onboarding',
            contactPerson: newContactPerson || 'לא הוגדר',
            email: newEmail,
            phone: newPhone,
            joinedAt: new Date().toISOString(),
            assetsFolderUrl: '#',
            source: newSource // NEW
        };
        
        addClient(newClient);

        // Apply Onboarding Template if selected
        if (selectedOnboardingFlow) {
            // Updated Call: Pass the specific client ID so tasks are linked correctly
            applyTemplate(selectedOnboardingFlow, clientId, newClientName);
        }

        setIsAddClientOpen(false);
        setNewClientName('');
        setNewContactPerson('');
        setNewEmail('');
        setNewPhone('');
        setNewSource('Other');
        setSelectedOnboardingFlow('');
        setIsShaking(false);
    };

    const openAddClientModal = () => {
        setIsShaking(false);
        setIsAddClientOpen(true);
    };

    const sources = [
        { value: 'Google', label: 'גוגל / חיפוש' },
        { value: 'Facebook', label: 'פייסבוק' },
        { value: 'Instagram', label: 'אינסטגרם' },
        { value: 'LinkedIn', label: 'לינקדאין' },
        { value: 'Referral', label: 'המלצה (פה לאוזן)' },
        { value: 'Other', label: 'אחר' }
    ];

    return (
        <div className="w-full flex flex-col h-auto md:h-full">
            <AnimatePresence>
                {selectedClient && (
                    <ClientDetailModal 
                        client={selectedClient} 
                        onClose={() => setSelectedClient(null)} 
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isAddClientOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                            onClick={() => setIsAddClientOpen(false)}
                        />
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 flex flex-col"
                            style={{ overflow: 'visible' }}
                        >
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                                <h3 className="font-bold text-lg text-gray-900">הוספת לקוח חדש</h3>
                                <button onClick={() => setIsAddClientOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <form onSubmit={handleCreateClient} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">שם העסק / חברה</label>
                                    <input 
                                        ref={nameInputRef}
                                        autoFocus
                                        type="text" 
                                        value={newClientName}
                                        onChange={e => { setNewClientName(e.target.value); setIsShaking(false); }}
                                        className={`w-full p-3 border rounded-xl outline-none font-medium transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                                        placeholder="לדוגמה: כהן טכנולוגיות בע״מ"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">איש קשר</label>
                                        <input 
                                            type="text" 
                                            value={newContactPerson}
                                            onChange={e => setNewContactPerson(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none"
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">חבילה</label>
                                        <CustomSelect 
                                            value={newPackage}
                                            onChange={(val) => setNewPackage(val)}
                                            options={products.map(p => ({ value: p.name, label: p.name }))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">מקור הגעה (פלטפורמה)</label>
                                    <CustomSelect 
                                        value={newSource}
                                        onChange={(val) => setNewSource(val)}
                                        options={sources}
                                        icon={<Globe size={14} />}
                                    />
                                </div>
                                
                                {/* Onboarding Flow Selection */}
                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                    <label className="block text-xs font-bold text-blue-800 uppercase mb-2 flex items-center gap-1">
                                        <PlayCircle size={14} /> הפעלת תהליך קליטה (Playbook)
                                    </label>
                                    <div className="space-y-2">
                                        {onboardingTemplates.map(template => (
                                            <label 
                                                key={template.id} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    selectedOnboardingFlow === template.id 
                                                    ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="onboardingFlow" 
                                                    checked={selectedOnboardingFlow === template.id}
                                                    onChange={() => setSelectedOnboardingFlow(template.id)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-gray-900">{template.name}</div>
                                                    <div className="text-xs text-gray-500">{template.items.length} צעדים • {template.description}</div>
                                                </div>
                                            </label>
                                        ))}
                                        <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer bg-white border-gray-200 hover:bg-gray-50`}>
                                            <input 
                                                type="radio" 
                                                name="onboardingFlow" 
                                                checked={selectedOnboardingFlow === ''}
                                                onChange={() => setSelectedOnboardingFlow('')}
                                                className="w-4 h-4 text-gray-400 border-gray-300"
                                            />
                                            <span className="text-sm font-medium text-gray-600">ללא תהליך אוטומטי (ידני)</span>
                                        </label>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">טלפון</label>
                                        <input 
                                            type="tel" 
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none dir-ltr text-right"
                                            placeholder="050-0000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">מייל</label>
                                        <input 
                                            type="email" 
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-black outline-none dir-ltr text-right"
                                            placeholder="client@company.com"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsAddClientOpen(false)}
                                        className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                                    >
                                        ביטול
                                    </button>
                                    <button 
                                        type="submit"
                                        className="flex-[2] bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Check size={18} /> 
                                        {selectedOnboardingFlow ? 'צור לקוח והתחל תהליך' : 'שמור לקוח'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col gap-6 mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900">ספר לקוחות פעילים</h1>
                        <p className="text-gray-500 text-sm mt-1">רשימת הלקוחות המשלמים בלבד. אין כאן לידים.</p>
                    </div>
                    
                    <button 
                        onClick={openAddClientModal}
                        className="bg-black text-white px-5 py-3 rounded-2xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                    >
                        <Plus size={18} /> הוסף לקוח
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-2 rounded-2xl border border-gray-200/60 shadow-sm" style={{ overflow: 'visible', zIndex: 10 }}>
                    <div className="relative w-full md:w-auto">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="חפש לקוח..." 
                            className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-gray-500 hidden md:inline">מיון:</span>
                            <div className="w-40">
                                <CustomSelect 
                                    value={sortConfig.key}
                                    onChange={(val) => handleSort(val as keyof Client)}
                                    options={[
                                        { value: 'joinedAt', label: 'תאריך הצטרפות' },
                                        { value: 'companyName', label: 'שם חברה' },
                                        { value: 'status', label: 'סטטוס' },
                                        { value: 'package', label: 'חבילה' }
                                    ]}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                title="תצוגת כרטיסים"
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-400 hover:text-gray-600'}`}
                                title="תצוגת רשימה"
                            >
                                <List size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid View */}
            {(viewMode === 'grid') && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedClients.map(client => (
                        <div 
                            key={client.id} 
                            onClick={() => setSelectedClient(client)}
                            className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-200 transition-all overflow-hidden group cursor-pointer flex flex-col relative h-full"
                        >
                            <div className={`h-24 w-full ${getClientGradient(client.package)} relative`}>
                                <div className="absolute top-3 right-3 flex gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                        className="text-white/80 hover:text-white bg-black/10 hover:bg-black/30 backdrop-blur-md p-1.5 rounded-full transition-colors"
                                    >
                                        <MoreHorizontal size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                                <div className="-mt-10 mb-3 flex justify-between items-end relative z-10">
                                    <div className="w-20 h-20 rounded-2xl border-[4px] border-white shadow-lg bg-white overflow-hidden">
                                        <img 
                                            src={client.avatar} 
                                            alt={client.companyName} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border mb-1
                                        ${client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                        {client.status === 'Active' ? 'פעיל' : 'תהליך קליטה'}
                                    </span>
                                </div>

                                <h3 className="font-bold text-gray-900 text-xl leading-tight mb-1">{client.companyName}</h3>
                                <p className="text-sm text-gray-500 font-medium mb-4">{client.contactPerson}</p>

                                <div className="mt-auto">
                                    <div className="flex gap-2 mb-4">
                                        <div className={`text-xs px-3 py-2 rounded-xl font-bold uppercase tracking-wide border flex items-center gap-2 bg-gray-50 text-gray-800 border-gray-200 w-fit`}>
                                            <ShoppingBag size={12} />
                                            {client.package}
                                        </div>
                                        {client.source && (
                                            <div className="text-xs px-2 py-2 rounded-xl font-medium bg-blue-50 text-blue-700 border border-blue-100 w-fit" title={`מקור הגעה: ${client.source}`}>
                                                {client.source}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                                        <div className="flex gap-2">
                                            <a 
                                                href={`mailto:${client.email}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className={`p-2 rounded-xl transition-colors ${!client.email ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`} 
                                                title={client.email ? "שלח מייל" : "חסר אימייל"}
                                            >
                                                <Mail size={18} />
                                            </a>
                                            <a 
                                                href={`tel:${client.phone}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 bg-gray-50 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-xl transition-colors" 
                                                title="התקשר"
                                            >
                                                <Phone size={18} />
                                            </a>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                            className="text-xs font-bold text-gray-400 group-hover:text-blue-600 flex items-center gap-1 transition-colors"
                                        >
                                            פרטים מלאים <ExternalLink size={12} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <button 
                        onClick={openAddClientModal}
                        className="border-2 border-dashed border-gray-200 rounded-3xl flex flex-col items-center justify-center p-8 text-gray-400 min-h-[300px] text-center hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer group"
                    >
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                             <Plus size={32} />
                        </div>
                        <p className="text-sm font-bold text-gray-500">הוסף לקוח חדש</p>
                        <p className="text-xs text-gray-400 mt-1">לחץ להקמת תיק לקוח</p>
                    </button>
                </div>
            )}

            {/* List View */}
            <div className="hidden md:block">
                {viewMode === 'list' && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-gray-50/50 text-gray-500 font-bold border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('companyName')}>
                                            <div className="flex items-center gap-2">חברה / לקוח <SortIcon columnKey="companyName" sortConfig={sortConfig} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors hidden md:table-cell" onClick={() => handleSort('contactPerson')}>
                                            <div className="flex items-center gap-2">איש קשר <SortIcon columnKey="contactPerson" sortConfig={sortConfig} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('package')}>
                                            <div className="flex items-center gap-2">חבילה <SortIcon columnKey="package" sortConfig={sortConfig} /></div>
                                        </th>
                                        <th className="px-6 py-4">
                                            <div className="flex items-center gap-2">מקור הגעה</div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                                            <div className="flex items-center gap-2">סטטוס <SortIcon columnKey="status" sortConfig={sortConfig} /></div>
                                        </th>
                                        <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors hidden sm:table-cell" onClick={() => handleSort('joinedAt')}>
                                            <div className="flex items-center gap-2">הצטרף ב <SortIcon columnKey="joinedAt" sortConfig={sortConfig} /></div>
                                        </th>
                                        <th className="px-6 py-4">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sortedClients.map(client => (
                                        <tr 
                                            key={client.id} 
                                            onClick={() => setSelectedClient(client)}
                                            className="hover:bg-blue-50/30 cursor-pointer transition-colors group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <img src={client.avatar} className="w-10 h-10 rounded-xl border border-gray-100 object-cover" />
                                                    <span className="font-bold text-gray-900 group-hover:text-blue-700">{client.companyName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600 hidden md:table-cell">
                                                <div className="font-medium">{client.contactPerson}</div>
                                                <div className="text-xs text-gray-400 font-mono">{client.phone}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border inline-flex items-center gap-1 bg-gray-100 text-gray-800 border-gray-300`}>
                                                    <ShoppingBag size={10} />
                                                    {client.package}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500">
                                                {client.source || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                                    client.status === 'Active' ? 'text-green-700 bg-green-50 border border-green-100' : 'text-yellow-700 bg-yellow-50 border border-yellow-100'
                                                }`}>
                                                    {client.status === 'Active' ? 'פעיל' : 'תהליך קליטה'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs hidden sm:table-cell font-mono">
                                                {new Date(client.joinedAt).toLocaleDateString('he-IL')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <a 
                                                        href={`mailto:${client.email}`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className={`p-1.5 rounded-lg transition-colors ${!client.email ? 'text-gray-300 cursor-not-allowed' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                                                    >
                                                        <Mail size={16} />
                                                    </a>
                                                    <a 
                                                        href={`tel:${client.phone}`} 
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    >
                                                        <Phone size={16} />
                                                    </a>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
