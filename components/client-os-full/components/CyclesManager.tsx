
import React, { useState } from 'react';
import { Cycle, CycleStatus, Client } from '../types';
import { 
    Layers, Plus, Search, MessageCircle, Slack, Video, 
    Calendar, Users, CheckCircle2, ChevronRight, ArrowLeft, 
    Zap, Sparkles, FileText, Download, Upload, MoreVertical, Ban
} from 'lucide-react';
import { GlowButton } from './ui/GlowButton';
import { useNexus } from '../context/ClientContext';

const CyclesManager: React.FC = () => {
    const { clients } = useNexus();
    const [cycles, setCycles] = useState<Cycle[]>([]);
    const [viewMode, setViewMode] = useState<'LIST' | 'DETAIL'>('LIST');
    const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const selectedCycle = cycles.find(c => c.id === selectedCycleId);
    const cycleClients = selectedCycle ? clients.filter(c => selectedCycle.clientIds.includes(c.id)) : [];

    const handleCreateCycle = () => {
        const newCycle: Cycle = {
            id: `cyc-${Date.now()}`,
            name: 'מחזור חדש',
            description: '',
            startDate: '',
            endDate: '',
            status: CycleStatus.RECRUITING,
            clientIds: [],
            sharedTasks: [],
            sharedAssets: [],
            groupLinks: {}
        };
        setCycles([newCycle, ...cycles]);
        setSelectedCycleId(newCycle.id);
        setViewMode('DETAIL');
    };

    const getStatusStyle = (status: CycleStatus) => {
        switch(status) {
            case CycleStatus.ACTIVE: return 'bg-green-50 text-green-600 border-green-100';
            case CycleStatus.RECRUITING: return 'bg-blue-50 text-blue-600 border-blue-100';
            case CycleStatus.COMPLETED: return 'bg-gray-50 text-gray-500 border-gray-100';
            default: return 'bg-gray-50 text-gray-400';
        }
    };

    const getStatusLabel = (status: CycleStatus) => {
        switch(status) {
            case CycleStatus.ACTIVE: return 'בביצוע';
            case CycleStatus.RECRUITING: return 'גיוס לקוחות';
            case CycleStatus.COMPLETED: return 'הסתיים';
            default: return 'בוטל';
        }
    };

    if (viewMode === 'LIST') {
        return (
            <div className="space-y-8 animate-fade-in pb-12 pt-safe">
                <header className="flex justify-between items-end">
                    <div>
                        <h1 className="text-4xl font-display font-bold text-nexus-primary tracking-tight mb-2">ניהול מחזורים</h1>
                        <p className="text-nexus-muted font-medium">קבוצות לקוחות ומרחבים משותפים.</p>
                    </div>
                    <button 
                        onClick={handleCreateCycle}
                        className="px-6 py-3 bg-nexus-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-nexus-accent transition-all shadow-lg shadow-nexus-primary/20"
                    >
                        <Plus size={18} /> צור מחזור חדש
                    </button>
                </header>

                <div className="relative max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="חפש מחזור..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-2xl py-3 pr-12 pl-4 text-sm focus:border-nexus-primary outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {cycles.filter(c => c.name.includes(searchTerm)).map(cycle => (
                        <div 
                            key={cycle.id}
                            onClick={() => { setSelectedCycleId(cycle.id); setViewMode('DETAIL'); }}
                            className="glass-card p-6 rounded-[32px] cursor-pointer hover:scale-[1.02] transition-all group flex flex-col border border-transparent hover:border-nexus-accent/30"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(cycle.status)}`}>
                                    {getStatusLabel(cycle.status)}
                                </div>
                                <div className="p-2 bg-gray-50 rounded-xl text-gray-400 group-hover:text-nexus-accent transition-colors">
                                    <Layers size={20} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2">{cycle.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1">{cycle.description}</p>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex -space-x-3 rtl:space-x-reverse">
                                    {clients.filter(c => cycle.clientIds.includes(c.id)).slice(0, 4).map(client => (
                                        <div key={client.id} className="w-10 h-10 rounded-full border-4 border-white bg-nexus-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">
                                            {client.logoInitials}
                                        </div>
                                    ))}
                                    {cycle.clientIds.length > 4 && (
                                        <div className="w-10 h-10 rounded-full border-4 border-white bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-xs shadow-sm">
                                            +{cycle.clientIds.length - 4}
                                        </div>
                                    )}
                                </div>
                                <span className="text-xs font-bold text-gray-400">{cycle.clientIds.length} לקוחות</span>
                            </div>

                            <div className="pt-6 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-400">
                                <span className="flex items-center gap-1.5"><Calendar size={14}/> {cycle.startDate}</span>
                                <div className="flex items-center gap-2 text-nexus-accent group-hover:underline">
                                    ניהול קבוצה <ChevronRight size={14} className="rotate-180" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!selectedCycle) return null;

    return (
        <div className="h-full flex flex-col gap-8 animate-slide-up pb-20 pt-safe">
            <header className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setViewMode('LIST')}
                        className="w-12 h-12 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-3xl font-display font-bold text-gray-900">{selectedCycle.name}</h2>
                        <p className="text-gray-500 font-medium">מרחב עבודה קבוצתי מנוהל.</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="px-5 py-2.5 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-all flex items-center gap-2 shadow-lg shadow-green-500/20">
                        <MessageCircle size={18} /> פתח קבוצת WhatsApp
                    </button>
                    <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg">
                        <Slack size={18} /> פתח ערוץ Slack
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Side: Members List */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-[32px] p-6 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Users size={20} className="text-nexus-accent" /> חברי המחזור</h3>
                            <button className="p-2 text-nexus-primary hover:bg-gray-50 rounded-lg"><Plus size={18}/></button>
                        </div>
                        <div className="space-y-3">
                            {cycleClients.map(client => (
                                <div key={client.id} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between group hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-nexus-primary text-white flex items-center justify-center font-bold text-sm">{client.logoInitials}</div>
                                        <div>
                                            <span className="font-bold text-sm text-gray-900 block">{client.name}</span>
                                            <span className="text-[10px] text-gray-500">{client.mainContact}</span>
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500"><Ban size={14}/></button>
                                </div>
                            ))}
                            {cycleClients.length === 0 && <p className="text-center py-10 text-gray-400 italic text-sm">אין לקוחות במחזור זה עדיין.</p>}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-nexus-primary to-slate-900 rounded-[32px] p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-nexus-accent/20 rounded-xl flex items-center justify-center text-nexus-accent mb-4">
                                <Sparkles size={24} />
                            </div>
                            <h4 className="font-bold mb-2">Cycle AI Architect</h4>
                            <p className="text-xs text-white/60 mb-6 leading-relaxed">תנו ל-AI שלנו לנסח הודעת פתיחה מרגשת לכל חברי המחזור או לסכם עבורכם מי עומד ביעדים.</p>
                            <GlowButton className="w-full py-2 text-xs">נסח הודעת ברוכים הבאים</GlowButton>
                        </div>
                    </div>
                </div>

                {/* Main: Group Space Content */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Common Tasks / Shared Success */}
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Zap size={22} className="text-nexus-accent" fill="currentColor" /> משימות קבוצתיות (Shared Journey)
                        </h3>
                        <div className="space-y-4">
                            {selectedCycle.sharedTasks.map(task => (
                                <div key={task.id} className="p-5 bg-gray-50 rounded-[24px] border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-nexus-primary shadow-sm"><CheckCircle2 size={20}/></div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{task.title}</h4>
                                            <p className="text-xs text-gray-500">דדליין: {task.dueDate}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {cycleClients.slice(0, 3).map(c => (
                                                <div key={c.id} className="w-6 h-6 rounded-full border-2 border-white bg-green-500 flex items-center justify-center"><CheckCircle2 size={10} className="text-white"/></div>
                                            ))}
                                        </div>
                                        <span className="text-[10px] font-black text-green-600 uppercase">3/3 בוצעו</span>
                                    </div>
                                </div>
                            ))}
                            <button className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 font-bold text-xs hover:border-nexus-primary hover:text-nexus-primary transition-all">
                                + הוסף משימה לכל המחזור
                            </button>
                        </div>
                    </div>

                    {/* Common Vault */}
                    <div className="bg-white border border-gray-200 rounded-[32px] p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <FileText size={22} className="text-nexus-accent" /> ספרית חומרים משותפת
                            </h3>
                            <button className="px-4 py-2 bg-nexus-primary text-white rounded-xl text-xs font-bold hover:bg-nexus-accent transition-all flex items-center gap-2">
                                <Upload size={14} /> העלה קובץ
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedCycle.sharedAssets.map(asset => (
                                <div key={asset.id} className="p-4 border border-gray-100 rounded-2xl flex items-center justify-between group hover:border-nexus-accent/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-slate-50 rounded-xl text-slate-400 group-hover:text-nexus-primary transition-colors">
                                            <FileText size={20}/>
                                        </div>
                                        <div>
                                            <span className="font-bold text-sm text-gray-800 block">{asset.name}</span>
                                            <span className="text-[10px] text-gray-400 uppercase font-black">{asset.category}</span>
                                        </div>
                                    </div>
                                    <button className="p-2 text-gray-300 hover:text-nexus-primary"><Download size={18}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CyclesManager;
