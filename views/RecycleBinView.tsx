
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, Search, SquareCheck, Briefcase, DollarSign, File, X, Archive, Lightbulb, Users, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

function asObj(v: unknown): Record<string, unknown> | undefined {
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as Record<string, unknown>;
    return undefined;
}

type TabType = 'tasks' | 'clients' | 'leads' | 'assets' | 'requests' | 'team' | 'time';

export const RecycleBinView: React.FC = () => {
    const { 
        trashTasks, restoreTask, permanentlyDeleteTask,
        trashClients, restoreClient, permanentlyDeleteClient,
        trashLeads, restoreLead, permanentlyDeleteLead,
        trashAssets, restoreAsset, permanentlyDeleteAsset,
        trashRequests, restoreFeatureRequest, permanentlyDeleteFeatureRequest,
        trashUsers, restoreUser, permanentlyDeleteUser,
        trashTimeEntries, restoreTimeEntry, permanentlyDeleteTimeEntry
    } = useData();

    const [activeTab, setActiveTab] = useState<TabType>('tasks');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal State
    const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);

    const tabs = [
        { id: 'tasks', label: 'משימות', icon: SquareCheck, count: trashTasks.length },
        { id: 'clients', label: 'לקוחות', icon: Briefcase, count: trashClients.length },
        { id: 'leads', label: 'לידים', icon: DollarSign, count: trashLeads.length },
        { id: 'team', label: 'צוות', icon: Users, count: trashUsers.length },
        { id: 'time', label: 'שעות', icon: Clock, count: trashTimeEntries.length },
        { id: 'assets', label: 'קבצים', icon: File, count: trashAssets.length },
        { id: 'requests', label: 'בקשות', icon: Lightbulb, count: trashRequests.length },
    ];

    const confirmDelete = () => {
        if (!itemToDelete) return;
        const { id } = itemToDelete;

        switch(activeTab) {
            case 'tasks': permanentlyDeleteTask(id); break;
            case 'clients': permanentlyDeleteClient(id); break;
            case 'leads': permanentlyDeleteLead(id); break;
            case 'team': permanentlyDeleteUser(id); break;
            case 'time': permanentlyDeleteTimeEntry(id); break;
            case 'assets': permanentlyDeleteAsset(id); break;
            case 'requests': permanentlyDeleteFeatureRequest(id); break;
        }
        setItemToDelete(null);
    };

    const handleDeleteClick = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setItemToDelete({ id, name });
    };

    const handleRestore = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        switch(activeTab) {
            case 'tasks': restoreTask(id); break;
            case 'clients': restoreClient(id); break;
            case 'leads': restoreLead(id); break;
            case 'team': restoreUser(id); break;
            case 'time': restoreTimeEntry(id); break;
            case 'assets': restoreAsset(id); break;
            case 'requests': restoreFeatureRequest(id); break;
        }
    };

    const getItems = () => {
        switch(activeTab) {
            case 'tasks': return trashTasks;
            case 'clients': return trashClients;
            case 'leads': return trashLeads;
            case 'team': return trashUsers;
            case 'time': return trashTimeEntries;
            case 'assets': return trashAssets;
            case 'requests': return trashRequests;
            default: return [];
        }
    };

    const filteredItems = getItems().filter((item: unknown) => {
        if (!item) return false;
        const o = asObj(item);
        if (!o) return false;
        const term = searchTerm.toLowerCase();
        const name = String(o.title || o.name || o.companyName || (o.date ? `דיווח שעות: ${o.date}` : 'ללא שם'));
        const id = String(o.id || '');
        return (name && name.toLowerCase().includes(term)) || id.toLowerCase().includes(term);
    });

    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] w-full max-w-7xl mx-auto overflow-hidden pb-16 md:pb-0">
            
            <DeleteConfirmationModal 
                isOpen={!!itemToDelete}
                onClose={() => setItemToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקה לצמיתות"
                description="הפריט יימחק לחלוטין ממסד הנתונים ולא ניתן יהיה לשחזרו בעתיד. האם להמשיך?"
                itemName={itemToDelete?.name}
                isHardDelete={true}
            />

            {/* Header */}
            <div className="pt-4 md:pt-6 pb-3 md:pb-4 border-b border-gray-100 shrink-0">
                <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 md:gap-6 mb-3 md:mb-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 md:gap-3">
                            <div className="p-1.5 md:p-2 bg-red-100 rounded-xl text-red-600 shrink-0">
                                <Trash2 size={18} className="md:w-6 md:h-6" />
                            </div>
                            <span>סל המיחזור</span>
                        </h1>
                        <p className="text-gray-500 text-xs md:text-sm mt-1">
                            שחזור פריטים שנמחקו. המערכת מנקה פריטים אוטומטית לאחר 30 יום.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden pb-4 sm:pb-8 pt-4 sm:pt-6 gap-4 sm:gap-8">
                
                {/* Vertical Sidebar (Desktop) */}
                <div className="hidden lg:flex flex-col w-72 h-full border-l border-gray-200 bg-white/50 backdrop-blur-xl shrink-0">
                    <div className="pt-6 pb-4 px-6 border-b border-gray-100 shrink-0">
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">סל המיחזור</h1>
                        <p className="text-gray-500 text-sm mt-1 hidden md:block">שחזור ומחיקה לצמיתות</p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 p-2 pt-0">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as TabType)}
                                className={`
                                    w-full flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl transition-all relative overflow-hidden group text-right border
                                    ${activeTab === tab.id 
                                    ? 'bg-black text-white shadow-lg border-gray-200 scale-[1.02]' 
                                    : 'bg-white border-gray-100 text-gray-500 hover:bg-white hover:border-gray-300 hover:text-gray-900 shadow-sm'}
                                `}
                            >
                                <div className={`p-2 rounded-lg ${activeTab === tab.id ? 'bg-white/20' : 'bg-gray-50 group-hover:bg-gray-100'} transition-colors shrink-0`}>
                                    <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-gray-400'} />
                                </div>
                                <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
                                    <div className="font-bold text-sm">{tab.label}</div>
                                    <div className={`text-[10px] px-2 py-0.5 rounded-md font-mono shrink-0 ${
                                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {tab.count}
                                    </div>
                                </div>
                                {activeTab === tab.id && <ChevronRight size={16} className="text-white shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Horizontal Tabs (Visible only on small screens) */}
                <div className="lg:hidden w-full max-w-full overflow-x-auto no-scrollbar pb-2 shrink-0 mb-4 -mx-4 sm:mx-0 px-4 sm:px-0 overscroll-x-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="flex gap-1.5 sm:gap-2 min-w-max">
                        {tabs.map(tab => {
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as TabType)}
                                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap border shrink-0 ${
                                        activeTab === tab.id 
                                        ? 'bg-black text-white border-gray-200 shadow-sm' 
                                        : 'bg-white text-gray-600 border-gray-200'
                                    }`}
                                >
                                    <tab.icon size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" />
                                    <span className="max-w-[60px] sm:max-w-none truncate">{tab.label}</span>
                                    <span className={`${activeTab === tab.id ? 'text-gray-300' : 'text-gray-500'} text-[9px] sm:text-[10px] ${tab.count > 99 ? 'hidden sm:inline' : ''}`}>({tab.count})</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden relative min-w-0">
                    
                    {/* Content Header & Search */}
                    <div className="p-3 md:p-5 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 bg-white z-10">
                        <h2 className="font-bold text-sm md:text-lg text-gray-900 flex items-center gap-2 min-w-0">
                            {tabs.find(t => t.id === activeTab)?.icon && React.createElement(tabs.find(t => t.id === activeTab)!.icon, { size: 16, className: "md:w-5 md:h-5 text-gray-400 shrink-0" })}
                            <span className="truncate">{activeTabLabel} שנמחקו</span>
                        </h2>
                        <div className="relative w-full md:w-64 shrink-0">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5 md:w-4 md:h-4" />
                            <input 
                                type="text" 
                                placeholder="חיפוש מהיר..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-3 md:pl-4 pr-8 md:pr-10 py-1.5 md:py-2 bg-gray-50 border border-gray-200 rounded-lg md:rounded-xl text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                    
                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5 pb-4 md:pb-5">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.length > 0 ? filteredItems.map((itemRaw: unknown) => {
                                const item = asObj(itemRaw);
                                if (!item) return null;
                                const itemId = String(item.id || '');
                                const itemName = String(item.title || item.name || item.companyName || (item.date ? `דיווח שעות: ${item.date}` : 'ללא שם'));
                                return (
                                    <motion.div 
                                        key={itemId}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 mb-3 bg-white border border-gray-100 rounded-xl md:rounded-2xl hover:border-gray-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-0 overflow-hidden">
                                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 group-hover:bg-white transition-colors shrink-0">
                                                {activeTab === 'tasks' && <SquareCheck size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'clients' && <Briefcase size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'leads' && <DollarSign size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'assets' && <File size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'requests' && <Lightbulb size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'team' && <Users size={16} className="md:w-[18px] md:h-[18px]" />}
                                                {activeTab === 'time' && <Clock size={16} className="md:w-[18px] md:h-[18px]" />}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-bold text-gray-900 text-xs md:text-sm truncate" title={itemName}>
                                                    {itemName}
                                                </h3>
                                                <p className="text-[9px] md:text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                                                    ID: <span className="bg-gray-50 px-1 rounded">{itemId}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <button 
                                                onClick={(e) => handleRestore(itemId, e)}
                                                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 bg-green-50 text-green-700 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-green-100 transition-colors border border-green-100"
                                            >
                                                <RotateCcw size={12} className="md:w-3.5 md:h-3.5" /> שחזר
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteClick(itemId, itemName, e)}
                                                className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 md:py-2 bg-red-50 text-red-700 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                                                title="מחיקה לצמיתות"
                                            >
                                                <X size={12} className="md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">השמד</span><span className="sm:hidden">השמד</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-400 pb-10">
                                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-gray-200">
                                        <Archive size={24} className="md:w-8 md:h-8 opacity-30" />
                                    </div>
                                    <p className="text-xs md:text-sm font-medium text-gray-600">הסל ריק בקטגוריה זו.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
