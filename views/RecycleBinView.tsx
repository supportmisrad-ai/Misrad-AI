
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, Search, CheckSquare, Briefcase, DollarSign, File, X, Archive, Lightbulb, Users, Clock, ChevronLeft } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

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
        { id: 'tasks', label: 'משימות', icon: CheckSquare, count: trashTasks.length },
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

    const filteredItems = getItems().filter((item: any) => {
        if (!item) return false;
        const term = searchTerm.toLowerCase();
        const name = item.title || item.name || item.companyName || (item.date ? `דיווח שעות: ${item.date}` : 'ללא שם');
        const id = item.id || '';
        return (name && name.toLowerCase().includes(term)) || id.toLowerCase().includes(term);
    });

    const activeTabLabel = tabs.find(t => t.id === activeTab)?.label;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] w-full max-w-7xl mx-auto overflow-hidden">
            
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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-8 pt-6 pb-6 shrink-0 border-b border-gray-100/50 bg-[#f1f5f9] z-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-xl text-red-600">
                            <Trash2 size={24} />
                        </div>
                        סל המיחזור
                    </h1>
                    <p className="text-gray-500 mt-2 text-sm max-w-md">
                        שחזור פריטים שנמחקו. המערכת מנקה פריטים אוטומטית לאחר 30 יום.
                    </p>
                </div>
            </div>

            {/* Main Layout: Sidebar + Content */}
            <div className="flex flex-1 overflow-hidden px-4 md:px-8 pb-8 pt-6 gap-8">
                
                {/* Vertical Sidebar (Desktop) */}
                <div className="hidden lg:flex flex-col w-64 shrink-0 gap-2 overflow-y-auto no-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center justify-between px-4 py-3.5 rounded-xl text-sm font-bold transition-all relative overflow-hidden group border ${
                                activeTab === tab.id 
                                ? 'bg-black text-white border-black shadow-lg' 
                                : 'bg-white text-gray-600 border-transparent hover:bg-gray-100 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'} />
                                {tab.label}
                            </div>
                            <div className={`text-[10px] px-2 py-0.5 rounded-md font-mono relative z-10 ${
                                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                            }`}>
                                {tab.count}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Mobile Horizontal Tabs (Visible only on small screens) */}
                <div className="lg:hidden flex gap-2 overflow-x-auto no-scrollbar pb-2 shrink-0 h-fit mb-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap border ${
                                activeTab === tab.id 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-gray-600 border-gray-200'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                            <span className="opacity-60 text-xs">({tab.count})</span>
                        </button>
                    ))}
                </div>

                {/* Right Content Area */}
                <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-gray-200 shadow-sm overflow-hidden relative">
                    
                    {/* Content Header & Search */}
                    <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white z-10">
                        <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                            {tabs.find(t => t.id === activeTab)?.icon && React.createElement(tabs.find(t => t.id === activeTab)!.icon, { size: 20, className: "text-gray-400" })}
                            {activeTabLabel} שנמחקו
                        </h3>
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="חיפוש מהיר..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>
                    
                    {/* Items List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-5">
                        <AnimatePresence mode="popLayout">
                            {filteredItems.length > 0 ? filteredItems.map((item: any) => {
                                const itemName = item.title || item.name || item.companyName || (item.date ? `דיווח שעות: ${item.date}` : 'ללא שם');
                                return (
                                    <motion.div 
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 mb-3 bg-white border border-gray-100 rounded-2xl hover:border-gray-300 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-4 mb-3 sm:mb-0 overflow-hidden">
                                            <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 border border-gray-100 group-hover:bg-white transition-colors shrink-0">
                                                {activeTab === 'tasks' && <CheckSquare size={18} />}
                                                {activeTab === 'clients' && <Briefcase size={18} />}
                                                {activeTab === 'leads' && <DollarSign size={18} />}
                                                {activeTab === 'assets' && <File size={18} />}
                                                {activeTab === 'requests' && <Lightbulb size={18} />}
                                                {activeTab === 'team' && <Users size={18} />}
                                                {activeTab === 'time' && <Clock size={18} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 text-sm truncate" title={itemName}>
                                                    {itemName}
                                                </h3>
                                                <p className="text-[10px] text-gray-400 font-mono mt-0.5 flex items-center gap-1">
                                                    ID: <span className="bg-gray-50 px-1 rounded">{item.id}</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end sm:self-auto">
                                            <button 
                                                onClick={(e) => handleRestore(item.id, e)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors border border-green-100"
                                            >
                                                <RotateCcw size={14} /> שחזר
                                            </button>
                                            <button 
                                                onClick={(e) => handleDeleteClick(item.id, itemName, e)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors border border-red-100"
                                                title="מחיקה לצמיתות"
                                            >
                                                <X size={14} /> <span className="hidden sm:inline">השמד</span>
                                            </button>
                                        </div>
                                    </motion.div>
                                );
                            }) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-300 pb-10">
                                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-gray-200">
                                        <Archive size={32} className="opacity-30" />
                                    </div>
                                    <p className="text-sm font-medium">הסל ריק בקטגוריה זו.</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};
