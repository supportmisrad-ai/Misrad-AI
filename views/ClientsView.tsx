
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { Mail, Phone, ExternalLink, MoreHorizontal, Search, Crown, Users, Plus, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, X, Check, ChevronDown, ShoppingBag, CirclePlay, Layers, Globe } from 'lucide-react';
import { Client } from '../types';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { AnimatePresence, motion } from 'framer-motion';
import { CustomSelect } from '../components/CustomSelect';

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

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
    const { products, templates, applyTemplate, addToast, clients: contextClients } = useData();
    const { fetchClients, createClient: createClientAPI, isLoading: isLoadingClients } = useSecureAPI();
    const [clients, setClients] = useState<Client[]>(contextClients || []);
    const [cachedClients, setCachedClients] = useState<Client[]>(contextClients || []);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
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
    const onboardingTemplates = templates.filter((t: { category?: string }) => t.category === 'onboarding');

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

    // Load clients from database on mount with cache
    useEffect(() => {
        // Show context clients immediately if available
        if (contextClients && contextClients.length > 0) {
            setClients(contextClients);
            setCachedClients(contextClients);
        }
        
        setAppliedSearch('');
    }, [fetchClients]);

    useEffect(() => {
        const t = setTimeout(() => {
            setAppliedSearch(String(searchTerm || '').trim());
        }, 300);

        return () => {
            clearTimeout(t);
        };
    }, [searchTerm]);

    useEffect(() => {
        let cancelled = false;
        const loadFirstPage = async () => {
            setIsRefreshing(true);
            try {
                const res = asObject(await fetchClients({ take: 100, search: appliedSearch || undefined }));
                if (cancelled) return;
                const list = Array.isArray(res?.clients) ? (res.clients as Client[]) : [];
                setClients(list);
                setCachedClients(list);
                setNextCursor(typeof res?.nextCursor === 'string' ? res.nextCursor : null);
                setHasMore(Boolean(res?.hasMore));
            } catch (error) {
                console.error('Failed to load clients:', error);
                if (cancelled) return;
                if (clients.length === 0 && contextClients && contextClients.length > 0) {
                    setClients(contextClients);
                    setCachedClients(contextClients);
                }
                if (cachedClients.length === 0) {
                    setClients([]);
                    setCachedClients([]);
                }
                setNextCursor(null);
                setHasMore(false);
            } finally {
                if (!cancelled) setIsRefreshing(false);
            }
        };

        void loadFirstPage();

        return () => {
            cancelled = true;
        };
    }, [appliedSearch, fetchClients]);

    const [sortConfig, setSortConfig] = useState<{ key: keyof Client; direction: 'asc' | 'desc' }>({ key: 'joinedAt', direction: 'desc' });

    const filteredClients = clients;

    const sortedClients = [...filteredClients].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const loadMore = async () => {
        if (!hasMore) return;
        if (!nextCursor) return;
        if (isLoadingMore) return;

        setIsLoadingMore(true);
        try {
            const res = asObject(await fetchClients({ take: 100, cursor: nextCursor, search: appliedSearch || undefined }));
            const list = Array.isArray(res?.clients) ? (res.clients as Client[]) : [];
            setClients((prev) => [...prev, ...list]);
            setCachedClients((prev) => [...prev, ...list]);
            setNextCursor(typeof res?.nextCursor === 'string' ? res.nextCursor : null);
            setHasMore(Boolean(res?.hasMore));
        } catch (e) {
            addToast('שגיאה בטעינת לקוחות נוספים', 'error');
        } finally {
            setIsLoadingMore(false);
        }
    };

    const handleSort = (key: keyof Client) => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClientName.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const newClient: Omit<Client, 'id'> = {
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
            source: newSource
        };
        
        try {
            const result = (await createClientAPI(newClient)) ?? {};
            const resultObj = asObject(result) ?? {};
            const clientIdRaw = resultObj.id;
            const clientId =
                typeof clientIdRaw === 'string'
                    ? clientIdRaw
                    : clientIdRaw == null
                        ? `C-${Date.now()}`
                        : String(clientIdRaw);
            
            // Update local state
            setClients(prev => [...prev, { ...newClient, id: clientId } as Client]);

            // Apply Onboarding Template if selected
            if (selectedOnboardingFlow) {
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
        } catch (error) {
            // Error already handled by createClientAPI
            setIsShaking(false);
        }
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
        <div className="w-full flex flex-col h-auto md:h-full pb-16 md:pb-0">
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
                                        className={`w-full p-3 border rounded-xl outline-none font-medium transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-gray-400'}`}
                                        placeholder="לדוגמה: כהן טכנולוגיות בע״מ"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">איש קשר</label>
                                        <input 
                                            type="text" 
                                            value={newContactPerson}
                                            onChange={e => setNewContactPerson(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-gray-400 outline-none"
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">חבילה</label>
                                        <CustomSelect 
                                            value={newPackage}
                                            onChange={(val) => setNewPackage(val)}
                                            options={products.map((p: { name?: string }) => ({ value: String(p?.name ?? ''), label: String(p?.name ?? '') }))}
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
                                        <CirclePlay size={14} /> הפעלת תהליך קליטה (Playbook)
                                    </label>
                                    <div className="space-y-2">
                                        {(onboardingTemplates as unknown as Record<string, unknown>[]).map((tplRaw) => {
                                            const template = asObject(tplRaw);
                                            const tId = String(template?.id ?? '');
                                            const tName = String(template?.name ?? '');
                                            const tItems = Array.isArray(template?.items) ? template.items : [];
                                            const tDesc = String(template?.description ?? '');
                                            return (
                                            <label 
                                                key={tId} 
                                                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                    selectedOnboardingFlow === tId 
                                                    ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-sm' 
                                                    : 'bg-white border-gray-200 hover:border-blue-300'
                                                }`}
                                            >
                                                <input 
                                                    type="radio" 
                                                    name="onboardingFlow" 
                                                    checked={selectedOnboardingFlow === tId}
                                                    onChange={() => setSelectedOnboardingFlow(tId)}
                                                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                                <div className="flex-1">
                                                    <div className="font-bold text-sm text-gray-900">{tName}</div>
                                                    <div className="text-xs text-gray-500">{tItems.length} צעדים • {tDesc}</div>
                                                </div>
                                            </label>
                                            );
                                        })}
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">טלפון</label>
                                        <input 
                                            type="tel" 
                                            value={newPhone}
                                            onChange={e => setNewPhone(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-gray-400 outline-none dir-ltr text-right"
                                            placeholder="050-0000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">מייל</label>
                                        <input 
                                            type="email" 
                                            value={newEmail}
                                            onChange={e => setNewEmail(e.target.value)}
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:border-gray-400 outline-none dir-ltr text-right"
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

            {/* Header - Mobile Optimized */}
            <div className="pt-4 md:pt-6 pb-4 border-b border-gray-100 shrink-0">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-4">
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">ספר לקוחות פעילים</h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">רשימת הלקוחות המשלמים בלבד. אין כאן לידים.</p>
                    </div>
                    
                    <button 
                        onClick={openAddClientModal}
                        className="bg-black text-white px-4 py-2.5 md:py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all w-full md:w-auto"
                    >
                        <Plus size={18} /> 
                        <span>הוסף לקוח</span>
                    </button>
                </div>
            </div>

            {/* Toolbar - Mobile Optimized */}
            <div className="pt-4 pb-4">
                <div className="flex flex-col gap-3 bg-white p-3 md:p-2 rounded-2xl border border-gray-200/60 shadow-sm" style={{ overflow: 'visible', zIndex: 10 }}>
                    {/* Search Bar - Mobile Optimized */}
                    <div className="relative w-full">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="חפש לקוח..." 
                            className="pl-4 pr-10 py-3 md:py-2.5 bg-gray-50 border border-gray-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:bg-white transition-colors text-sm md:text-base"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    {/* Filters & View Toggle - Mobile Optimized */}
                    <div className="flex items-center gap-3 w-full justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-xs font-bold text-gray-500 hidden sm:inline shrink-0">מיון:</span>
                            <div className="flex-1 min-w-0">
                                <CustomSelect 
                                    value={sortConfig.key}
                                    onChange={(val) => handleSort(val as keyof Client)}
                                    options={[
                                        { value: 'joinedAt', label: 'תאריך הצטרפות' },
                                        { value: 'companyName', label: 'שם חברה' },
                                        { value: 'status', label: 'סטטוס' },
                                        { value: 'package', label: 'חבילה' }
                                    ]}
                                    className="text-xs md:text-sm"
                                />
                            </div>
                        </div>

                        {/* View Mode Toggle - Mobile Optimized */}
                        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-lg transition-all active:scale-95 ${viewMode === 'grid' ? 'bg-white shadow text-black' : 'text-gray-400 active:text-gray-600'}`}
                                title="תצוגת כרטיסים"
                                aria-label="תצוגת כרטיסים"
                            >
                                <LayoutGrid size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-lg transition-all active:scale-95 ${viewMode === 'list' ? 'bg-white shadow text-black' : 'text-gray-400 active:text-gray-600'}`}
                                title="תצוגת רשימה"
                                aria-label="תצוגת רשימה"
                            >
                                <List size={16} className="md:w-[18px] md:h-[18px]" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grid View - Mobile Optimized */}
            {(viewMode === 'grid') && (
                <>
                    {sortedClients.length === 0 ? (
                        <div className="bg-white rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm p-8 md:p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Users size={32} className="md:w-10 md:h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2">אין לקוחות פעילים</h3>
                            <p className="text-sm md:text-base text-gray-500 mb-6 max-w-sm">התחל על ידי הוספת לקוח חדש לספר הלקוחות</p>
                            <button 
                                onClick={openAddClientModal}
                                className="bg-black text-white px-6 py-3 rounded-xl text-sm md:text-base font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                            >
                                <Plus size={18} /> הוסף לקוח ראשון
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            {sortedClients.map((client, index) => (
                        <motion.div 
                            key={client.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            onClick={() => setSelectedClient(client)}
                            className="bg-white rounded-2xl md:rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-200 active:scale-[0.98] transition-all overflow-hidden group cursor-pointer flex flex-col relative"
                        >
                            {/* Header Gradient - Mobile Optimized */}
                            <div className={`h-20 md:h-24 w-full ${getClientGradient(client.package)} relative`}>
                                <div className="absolute top-2 md:top-3 right-2 md:right-3 flex gap-1.5">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                        className="text-white/90 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md p-1.5 md:p-2 rounded-full transition-all active:scale-95"
                                        aria-label="פתח פרטים"
                                    >
                                        <MoreHorizontal size={14} className="md:w-4 md:h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 md:px-6 pb-4 md:pb-6 pt-0 flex-1 flex flex-col">
                                {/* Avatar & Status - Mobile Optimized */}
                                <div className="-mt-8 md:-mt-10 mb-3 flex justify-between items-end relative z-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl border-[3px] md:border-[4px] border-white shadow-lg bg-white overflow-hidden">
                                        <img 
                                            src={client.avatar} 
                                            alt={client.companyName} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[9px] md:text-[10px] font-bold uppercase tracking-wide border
                                        ${client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                        {client.status === 'Active' ? 'פעיל' : 'קליטה'}
                                    </span>
                                </div>

                                {/* Company Name & Contact - Mobile Optimized */}
                                <h3 className="font-black text-gray-900 text-lg md:text-xl leading-tight mb-1 line-clamp-1">{client.companyName}</h3>
                                <p className="text-xs md:text-sm text-gray-500 font-medium mb-3 md:mb-4 line-clamp-1">{client.contactPerson}</p>

                                {/* Package & Source Tags - Mobile Optimized */}
                                <div className="mt-auto space-y-2 md:space-y-0">
                                    <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
                                        <div className={`text-[10px] md:text-xs px-2 md:px-3 py-1 md:py-2 rounded-lg md:rounded-xl font-bold uppercase tracking-wide border flex items-center gap-1 md:gap-2 bg-gray-50 text-gray-800 border-gray-200`}>
                                            <ShoppingBag size={10} className="md:w-3 md:h-3" />
                                            <span className="line-clamp-1">{client.package}</span>
                                        </div>
                                        {client.source && (
                                            <div className="text-[10px] md:text-xs px-2 py-1 md:py-2 rounded-lg md:rounded-xl font-medium bg-blue-50 text-blue-700 border border-blue-100" title={`מקור הגעה: ${client.source}`}>
                                                {client.source}
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions Bar - Mobile Optimized */}
                                    <div className="flex items-center justify-between border-t border-gray-50 pt-3 md:pt-4">
                                        <div className="flex gap-1.5 md:gap-2">
                                            <a 
                                                href={`mailto:${client.email}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all active:scale-95 ${!client.email ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-500 active:text-blue-600 active:bg-blue-50'}`} 
                                                title={client.email ? "שלח מייל" : "חסר אימייל"}
                                                aria-label="שלח מייל"
                                            >
                                                <Mail size={16} className="md:w-[18px] md:h-[18px]" />
                                            </a>
                                            <a 
                                                href={`tel:${client.phone}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 md:p-2.5 bg-gray-50 text-gray-500 active:text-green-600 active:bg-green-50 rounded-lg md:rounded-xl transition-all active:scale-95" 
                                                title="התקשר"
                                                aria-label="התקשר"
                                            >
                                                <Phone size={16} className="md:w-[18px] md:h-[18px]" />
                                            </a>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                            className="text-[10px] md:text-xs font-bold text-gray-400 group-active:text-blue-600 flex items-center gap-1 transition-colors active:scale-95"
                                        >
                                            <span className="hidden sm:inline">פרטים מלאים</span>
                                            <span className="sm:hidden">פרטים</span>
                                            <ExternalLink size={10} className="md:w-3 md:h-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    
                            {/* Add Client Card - Mobile Optimized */}
                            <motion.button 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: sortedClients.length * 0.05 }}
                                onClick={openAddClientModal}
                                className="border-2 border-dashed border-gray-200 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center p-6 md:p-8 text-gray-400 min-h-[240px] md:min-h-[300px] text-center hover:border-gray-400 hover:bg-gray-50 active:scale-[0.98] transition-all cursor-pointer group"
                            >
                                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3 md:mb-4 group-active:scale-110 transition-transform">
                                     <Plus size={24} className="md:w-8 md:h-8" />
                                </div>
                                <p className="text-sm md:text-base font-bold text-gray-700">הוסף לקוח חדש</p>
                                <p className="text-xs md:text-sm text-gray-600 mt-1">לחץ להקמת תיק לקוח</p>
                            </motion.button>
                        </div>
                    )}

                    {hasMore && (
                        <div className="pt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => void loadMore()}
                                disabled={isLoadingMore}
                                className="bg-white border border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoadingMore ? 'טוען...' : 'טען עוד'}
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* List View - Desktop Table & Mobile Cards */}
            {viewMode === 'list' && (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-50/50 text-gray-500 font-bold border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('companyName')}>
                                                <div className="flex items-center gap-2">חברה / לקוח <SortIcon columnKey="companyName" sortConfig={sortConfig} /></div>
                                            </th>
                                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('contactPerson')}>
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
                                            <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('joinedAt')}>
                                                <div className="flex items-center gap-2">הצטרף ב <SortIcon columnKey="joinedAt" sortConfig={sortConfig} /></div>
                                            </th>
                                            <th className="px-6 py-4">פעולות</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {sortedClients.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                                            <Users size={32} className="text-gray-400" />
                                                        </div>
                                                        <h3 className="text-lg font-black text-gray-900 mb-2">אין לקוחות פעילים</h3>
                                                        <p className="text-sm text-gray-500 mb-6">התחל על ידי הוספת לקוח חדש</p>
                                                        <button 
                                                            onClick={openAddClientModal}
                                                            className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                                                        >
                                                            <Plus size={18} /> הוסף לקוח ראשון
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedClients.map(client => (
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
                                                    <td className="px-6 py-4 text-gray-600">
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
                                                    <td className="px-6 py-4 text-gray-500 text-xs font-mono">
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
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Card View for List Mode */}
                    <div className="md:hidden space-y-3">
                        {sortedClients.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                    <Users size={32} className="text-gray-400" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 mb-2">אין לקוחות פעילים</h3>
                                <p className="text-sm text-gray-500 mb-6">התחל על ידי הוספת לקוח חדש</p>
                                <button 
                                    onClick={openAddClientModal}
                                    className="bg-black text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-800 active:scale-95 transition-all"
                                >
                                    <Plus size={18} /> הוסף לקוח ראשון
                                </button>
                            </div>
                        ) : (
                            sortedClients.map((client, index) => (
                            <motion.div
                                key={client.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.03 }}
                                onClick={() => setSelectedClient(client)}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md active:scale-[0.98] transition-all overflow-hidden group cursor-pointer"
                            >
                                <div className="p-4">
                                    {/* Header Row */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <img 
                                            src={client.avatar} 
                                            className="w-12 h-12 rounded-xl border border-gray-100 object-cover shrink-0" 
                                            alt={client.companyName}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-black text-gray-900 text-base leading-tight mb-1 line-clamp-1">{client.companyName}</h3>
                                            <p className="text-xs text-gray-500 font-medium line-clamp-1">{client.contactPerson}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border shrink-0
                                            ${client.status === 'Active' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                                            {client.status === 'Active' ? 'פעיל' : 'קליטה'}
                                        </span>
                                    </div>

                                    {/* Info Row */}
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        <div className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase tracking-wide border flex items-center gap-1 bg-gray-50 text-gray-800 border-gray-200`}>
                                            <ShoppingBag size={9} />
                                            {client.package}
                                        </div>
                                        {client.source && (
                                            <div className="text-[10px] px-2 py-1 rounded-lg font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                {client.source}
                                            </div>
                                        )}
                                        <div className="text-[10px] text-gray-500 font-mono">
                                            {new Date(client.joinedAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })}
                                        </div>
                                    </div>

                                    {/* Actions Row */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex gap-2">
                                            <a 
                                                href={`mailto:${client.email}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className={`p-2 rounded-lg transition-all active:scale-95 ${!client.email ? 'bg-gray-50 text-gray-300 cursor-not-allowed' : 'bg-gray-50 text-gray-500 active:text-blue-600 active:bg-blue-50'}`}
                                                aria-label="שלח מייל"
                                            >
                                                <Mail size={16} />
                                            </a>
                                            <a 
                                                href={`tel:${client.phone}`} 
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-2 bg-gray-50 text-gray-500 active:text-green-600 active:bg-green-50 rounded-lg transition-all active:scale-95"
                                                aria-label="התקשר"
                                            >
                                                <Phone size={16} />
                                            </a>
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setSelectedClient(client); }}
                                            className="text-[10px] font-bold text-gray-400 group-active:text-blue-600 flex items-center gap-1 transition-colors active:scale-95"
                                        >
                                            פרטים מלאים
                                            <ExternalLink size={10} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                            ))
                        )}
                    </div>

                    {hasMore && (
                        <div className="pt-6 flex justify-center">
                            <button
                                type="button"
                                onClick={() => void loadMore()}
                                disabled={isLoadingMore}
                                className="bg-white border border-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl shadow-sm hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {isLoadingMore ? 'טוען...' : 'טען עוד'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
