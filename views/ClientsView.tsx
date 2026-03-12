
import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useSecureAPI } from '../hooks/useSecureAPI';
import { Mail, Phone, ExternalLink, MoreHorizontal, Search, Crown, Users, Plus, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, X, Check, ChevronDown, ShoppingBag, CirclePlay, Layers, Globe, Sparkles } from 'lucide-react';
import { Client } from '../types';
import { ClientDetailModal } from '../components/ClientDetailModal';
import { AnimatePresence, motion } from 'framer-motion';
import { CustomSelect } from '../components/CustomSelect';

// Dynamic import for MobileDrawer to avoid build issues
const MobileDrawer = React.lazy(() => import('./MobileDrawer').then(m => ({ default: m.MobileDrawer })));

function asObject(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    if (Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

const getClientGradient = (pkg: string) => {
    if (pkg.includes('Premium') || pkg.includes('ארגונים') || pkg.includes('Enterprise')) return 'bg-gradient-to-r from-slate-900 via-[#0f172a] to-slate-800'; 
    if (pkg.includes('Mastermind') || pkg.includes('פרו') || pkg.includes('Pro')) return 'bg-gradient-to-r from-indigo-600 to-purple-600'; 
    if (pkg.includes('Digital') || pkg.includes('בסיס') || pkg.includes('Basic')) return 'bg-gradient-to-r from-blue-500 to-cyan-500'; 
    if (pkg.includes('Start') || pkg.includes('צמיחה')) return 'bg-gradient-to-r from-emerald-500 to-teal-500';
    if (pkg.includes('Gold') || pkg.includes('VIP') || pkg.includes('זהב')) return 'bg-gradient-to-r from-amber-500 to-orange-600';
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
    const [searchTerm, setSearchTerm] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    
    const [newClientName, setNewClientName] = useState('');
    const [newContactPerson, setNewContactPerson] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newPackage, setNewPackage] = useState<string>(products[0]?.name || 'Unknown');
    const [newSource, setNewSource] = useState<string>('Other');
    const [customSource, setCustomSource] = useState<string>('');
    const [selectedOnboardingFlow, setSelectedOnboardingFlow] = useState<string>('');

    const [isShaking, setIsShaking] = useState(false);
    const [addClientStep, setAddClientStep] = useState(1);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const onboardingTemplates = templates.filter((t: { category?: string }) => t.category === 'onboarding');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        if (contextClients && contextClients.length > 0) {
            setClients(contextClients);
        }
    }, [contextClients]);

    useEffect(() => {
        const t = setTimeout(() => {
            setAppliedSearch(String(searchTerm || '').trim());
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        let cancelled = false;
        const loadFirstPage = async () => {
            try {
                const res = asObject(await fetchClients({ take: 100, search: appliedSearch || undefined }));
                if (cancelled) return;
                const list = Array.isArray(res?.clients) ? (res.clients as Client[]) : [];
                setClients(list);
                setNextCursor(typeof res?.nextCursor === 'string' ? res.nextCursor : null);
                setHasMore(Boolean(res?.hasMore));
            } catch (error) {
                console.error('Failed to load clients:', error);
            }
        };
        void loadFirstPage();
        return () => { cancelled = true; };
    }, [appliedSearch, fetchClients]);

    const [sortConfig, setSortConfig] = useState<{ key: keyof Client; direction: 'asc' | 'desc' }>({ key: 'joinedAt', direction: 'desc' });

    const sortedClients = [...clients].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || bValue === undefined) return 0;
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const loadMore = async () => {
        if (!hasMore || !nextCursor || isLoadingMore) return;
        setIsLoadingMore(true);
        try {
            const res = asObject(await fetchClients({ take: 100, cursor: nextCursor, search: appliedSearch || undefined }));
            const list = Array.isArray(res?.clients) ? (res.clients as Client[]) : [];
            setClients((prev) => [...prev, ...list]);
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
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const newClient: Omit<Client, 'id'> = {
            name: newClientName,
            companyName: newClientName,
            avatar: '',
            package: newPackage,
            status: 'Onboarding',
            contactPerson: newContactPerson || 'לא הוגדר',
            email: newEmail,
            phone: newPhone,
            joinedAt: new Date().toISOString(),
            assetsFolderUrl: '#',
            source: newSource === 'Other' && customSource.trim() ? customSource.trim() : newSource
        };
        
        try {
            const result = asObject(await createClientAPI(newClient)) ?? {};
            const clientId = typeof result.id === 'string' ? result.id : `C-${Date.now()}`;
            setClients(prev => [...prev, { ...newClient, id: clientId } as Client]);
            if (selectedOnboardingFlow) {
                applyTemplate(selectedOnboardingFlow, clientId, newClientName);
            }
            setIsAddClientOpen(false);
            setNewClientName('');
            setNewContactPerson('');
            setNewEmail('');
            setNewPhone('');
            setSelectedOnboardingFlow('');
        } catch (error) {
            console.error(error);
        }
    };

    const openAddClientModal = () => {
        setIsShaking(false);
        setAddClientStep(1);
        setIsAddClientOpen(true);
    };

    return (
        <div className="w-full flex flex-col h-auto md:h-full pb-16 md:pb-0">
            <AnimatePresence mode="sync">
                {selectedClient && (
                    <div className="fixed inset-0 z-[100]">
                         <ClientDetailModal 
                            client={selectedClient} 
                            onClose={() => setSelectedClient(null)} 
                        />
                    </div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="sync">
                {isAddClientOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddClientOpen(false)} />
                        
                        {/* Desktop Add Client Modal */}
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="hidden md:block bg-white rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-lg text-gray-900">הוספת לקוח חדש</h3>
                                <button onClick={() => setIsAddClientOpen(false)}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleCreateClient} className="p-6 space-y-4">
                                <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="שם העסק" className="w-full p-3 bg-gray-50 rounded-xl outline-none" />
                                <input value={newContactPerson} onChange={e => setNewContactPerson(e.target.value)} placeholder="איש קשר" className="w-full p-3 bg-gray-50 rounded-xl outline-none" />
                                <CustomSelect value={newPackage} onChange={setNewPackage} options={products.map((p:any) => ({ value: p.name, label: p.name }))} />
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setIsAddClientOpen(false)} className="flex-1 py-3 font-bold">ביטול</button>
                                    <button type="submit" className="flex-[2] bg-black text-white py-3 rounded-xl font-bold">שמור לקוח</button>
                                </div>
                            </form>
                        </motion.div>

                        {/* Mobile Optimized Add Client Drawer */}
                        <div className="md:hidden w-full h-full flex flex-col justify-end">
                            <MobileDrawer isOpen={isAddClientOpen} onClose={() => setIsAddClientOpen(false)} title="הוספת לקוח" footer={
                                <div className="flex gap-3 w-full">
                                    {addClientStep > 1 && <button onClick={() => setAddClientStep(s => s - 1)} className="flex-1 py-4 bg-gray-100 font-bold rounded-2xl">חזרה</button>}
                                    <button onClick={(e) => addClientStep < 3 ? setAddClientStep(s => s + 1) : handleCreateClient(e as any)} className="flex-[2] py-4 bg-black text-white font-bold rounded-2xl">
                                        {addClientStep < 3 ? 'המשך' : 'סיום ושמור'}
                                    </button>
                                </div>
                            }>
                                <div className="space-y-6">
                                    {addClientStep === 1 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black">פרטי העסק</h3>
                                            <input value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="שם העסק" className="w-full p-4 bg-gray-100 rounded-2xl outline-none font-bold" />
                                            <CustomSelect value={newPackage} onChange={setNewPackage} options={products.map((p:any) => ({ value: p.name, label: p.name }))} />
                                        </div>
                                    )}
                                    {addClientStep === 2 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black">איש קשר</h3>
                                            <input value={newContactPerson} onChange={e => setNewContactPerson(e.target.value)} placeholder="שם מלא" className="w-full p-4 bg-gray-100 rounded-2xl outline-none font-bold" />
                                            <input value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="טלפון" className="w-full p-4 bg-gray-100 rounded-2xl outline-none font-bold text-right dir-ltr" />
                                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="אימייל" className="w-full p-4 bg-gray-100 rounded-2xl outline-none font-bold text-right dir-ltr" />
                                        </div>
                                    )}
                                    {addClientStep === 3 && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-black">תהליך קליטה</h3>
                                            {onboardingTemplates.map((t: any) => (
                                                <button key={t.id} onClick={() => setSelectedOnboardingFlow(t.id)} className={`w-full p-4 rounded-2xl border-2 text-right ${selectedOnboardingFlow === t.id ? 'bg-black text-white border-black' : 'bg-white border-gray-100'}`}>
                                                    <div className="font-bold">{t.name}</div>
                                                    <div className="text-xs opacity-60">{t.description}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </MobileDrawer>
                        </div>
                    </div>
                )}
            </AnimatePresence>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 md:px-0">
                <div className="flex flex-col">
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-3"><Users className="text-indigo-600" size={28} />לקוחות</h1>
                </div>
                <button onClick={openAddClientModal} className="bg-black text-white px-6 py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={20} />הוספת לקוח</button>
            </div>

            <div className="bg-white p-4 md:rounded-3xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row gap-4 sticky top-0 z-40">
                <div className="relative flex-1">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input type="text" placeholder="חיפוש..." className="w-full pr-12 pl-4 py-3.5 bg-gray-50 rounded-2xl outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
            </div>

            <div className="flex-1 px-4 md:px-0 pb-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {sortedClients.map((client) => (
                        <motion.div layout key={client.id} onClick={() => setSelectedClient(client)} className="group bg-white rounded-2xl md:rounded-3xl p-4 md:p-6 shadow-sm border border-gray-50 cursor-pointer flex flex-col relative overflow-hidden active:scale-95">
                            <div className="flex items-center gap-4">
                                <div className={`w-14 h-14 rounded-2xl ${getClientGradient(client.package)} flex items-center justify-center text-white font-black text-xl shadow-lg`}>
                                    {client.avatar ? <img src={client.avatar} alt="" className="w-full h-full rounded-2xl object-cover" /> : client.companyName?.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-slate-900 truncate leading-tight">{client.companyName}</h3>
                                    <p className="text-xs font-bold text-slate-400 truncate mt-0.5">{client.contactPerson}</p>
                                    <div className="mt-2 flex gap-2">
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${client.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{client.status === 'Active' ? 'פעיל' : 'מוקפא'}</span>
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 uppercase">{client.package}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};
