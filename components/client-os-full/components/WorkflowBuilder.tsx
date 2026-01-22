
import React, { useState } from 'react';
import { WorkflowBlueprint, WorkflowStage, WorkflowItem, WorkflowItemType } from '../types';
import { generateWorkflowBlueprint } from '../services/geminiService';
import { GlowButton } from './ui/GlowButton';
import { Sparkles, GitMerge, Plus, Calendar, Clock, Video, MapPin, CheckSquare, Briefcase, FileText, ArrowRight, Play, Box, Edit2, Trash2, Save, X, Layers, LayoutList, Search, UserCheck, ArrowLeft } from 'lucide-react';
import { useNexus } from '../context/ClientContext';

const MOCK_BLUEPRINTS: WorkflowBlueprint[] = [];

const WorkflowBuilder: React.FC = () => {
    const { clients } = useNexus();
    const [blueprints, setBlueprints] = useState<WorkflowBlueprint[]>(MOCK_BLUEPRINTS);
    const [selectedBlueprint, setSelectedBlueprint] = useState<WorkflowBlueprint | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    
    // AI Builder State
    const [prompt, setPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Manual Editor State
    const [isEditing, setIsEditing] = useState(false);
    const [editedBlueprint, setEditedBlueprint] = useState<WorkflowBlueprint | null>(null);

    // Client Selector State
    const [showClientSelector, setShowClientSelector] = useState(false);
    const [clientSearchTerm, setClientSearchTerm] = useState('');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setIsGenerating(true);
        try {
            const newBlueprint = await generateWorkflowBlueprint(prompt);
            const ensuredBlueprint: WorkflowBlueprint = {
                ...newBlueprint,
                name: newBlueprint.name || '',
                totalDuration: newBlueprint.totalDuration || '',
                tags: Array.isArray(newBlueprint.tags) ? newBlueprint.tags : [],
                stages: Array.isArray(newBlueprint.stages) && newBlueprint.stages.length > 0
                    ? newBlueprint.stages
                    : [{ id: `s-${Date.now()}`, title: 'שלב 1', duration: '', items: [] }],
            };
            setBlueprints(prev => [ensuredBlueprint, ...prev]);
            setSelectedBlueprint(ensuredBlueprint);
            setEditedBlueprint(ensuredBlueprint); // Allow immediate editing
            setIsCreating(false);
            setPrompt('');
        } catch (e) {
            console.error(e);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleCreateManual = () => {
        const newBlueprint: WorkflowBlueprint = {
            id: `bp-man-${Date.now()}`,
            name: 'תהליך חדש (טיוטה)',
            description: '',
            totalDuration: '',
            tags: ['אישי'],
            stages: [
                {
                    id: 's1',
                    title: 'שלב 1: התחלה',
                    duration: '',
                    items: []
                }
            ]
        };
        setBlueprints(prev => [newBlueprint, ...prev]);
        setSelectedBlueprint(newBlueprint);
        setEditedBlueprint(newBlueprint);
        setIsEditing(true);
        setIsCreating(false);
    };

    const handleSaveEdit = () => {
        if (!editedBlueprint) return;
        setBlueprints(prev => prev.map(bp => bp.id === editedBlueprint.id ? editedBlueprint : bp));
        setSelectedBlueprint(editedBlueprint);
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setEditedBlueprint(selectedBlueprint);
        setIsEditing(false);
    };

    const handleAssignToClient = (client: any) => {
        // In a real app, this would make an API call to assign workflow
        window.dispatchEvent(new CustomEvent('nexus-toast', { 
            detail: { 
                message: `התהליך "${activeBP?.name}" הופעל בהצלחה עבור ${client.name}!`, 
                type: 'success' 
            } 
        }));
        setShowClientSelector(false);
        setClientSearchTerm('');
    };

    // --- Editor Helper Functions ---
    const addStage = () => {
        if (!editedBlueprint) return;
        const newStage: WorkflowStage = {
            id: `s-${Date.now()}`,
            title: `שלב ${editedBlueprint.stages.length + 1}`,
            duration: 'משך לא מוגדר',
            items: []
        };
        setEditedBlueprint({ ...editedBlueprint, stages: [...editedBlueprint.stages, newStage] });
    };

    const addItem = (stageId: string) => {
        if (!editedBlueprint) return;
        const newItem: WorkflowItem = {
            id: `i-${Date.now()}`,
            type: 'TASK_AGENCY',
            title: 'פריט חדש',
            description: 'תיאור המשימה',
            isAutomated: false
        };
        const updatedStages = editedBlueprint.stages.map(s => 
            s.id === stageId ? { ...s, items: [...s.items, newItem] } : s
        );
        setEditedBlueprint({ ...editedBlueprint, stages: updatedStages });
    };

    const updateStage = (stageId: string, updates: Partial<WorkflowStage>) => {
        if (!editedBlueprint) return;
        const updatedStages = editedBlueprint.stages.map(s => 
            s.id === stageId ? { ...s, ...updates } : s
        );
        setEditedBlueprint({ ...editedBlueprint, stages: updatedStages });
    };

    const updateItem = (stageId: string, itemId: string, updates: Partial<WorkflowItem>) => {
        if (!editedBlueprint) return;
        const updatedStages = editedBlueprint.stages.map(s => {
            if (s.id === stageId) {
                const updatedItems = s.items.map(i => i.id === itemId ? { ...i, ...updates } : i);
                return { ...s, items: updatedItems };
            }
            return s;
        });
        setEditedBlueprint({ ...editedBlueprint, stages: updatedStages });
    };

    const deleteItem = (stageId: string, itemId: string) => {
        if (!editedBlueprint) return;
        const updatedStages = editedBlueprint.stages.map(s => {
            if (s.id === stageId) {
                return { ...s, items: s.items.filter(i => i.id !== itemId) };
            }
            return s;
        });
        setEditedBlueprint({ ...editedBlueprint, stages: updatedStages });
    };
    // ----------------------------

    const getItemIcon = (type: string) => {
        switch (type) {
            case 'MEETING_ZOOM': return <Video size={16} className="text-blue-500" />;
            case 'MEETING_FRONTAL': return <MapPin size={16} className="text-nexus-accent" />;
            case 'TASK_CLIENT': return <CheckSquare size={16} className="text-[color:var(--os-accent)]" />;
            case 'TASK_AGENCY': return <Briefcase size={16} className="text-gray-500" />;
            case 'FORM_SEND': return <FileText size={16} className="text-purple-500" />;
            case 'CONTENT_DELIVERY': return <Box size={16} className="text-green-500" />;
            default: return <Clock size={16} />;
        }
    };

    const getItemLabel = (type: string) => {
        switch (type) {
            case 'MEETING_ZOOM': return 'פגישת וידאו';
            case 'MEETING_FRONTAL': return 'פגישה פרונטלית';
            case 'TASK_CLIENT': return 'משימת לקוח';
            case 'TASK_AGENCY': return 'משימה פנימית';
            case 'FORM_SEND': return 'שליחת טופס';
            case 'CONTENT_DELIVERY': return 'הגשת תוצרים';
            default: return 'כללי';
        }
    };

    const activeBP = isEditing ? editedBlueprint : selectedBlueprint;

    // Filter Clients
    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) || 
        c.logoInitials.toLowerCase().includes(clientSearchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col animate-fade-in duration-500 relative">
            
            {/* CLIENT SELECTOR MODAL */}
            {showClientSelector && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-nexus-primary/20 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-white/50 flex flex-col max-h-[80vh] animate-slide-up">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <UserCheck className="text-nexus-accent" size={20} /> הפעלת תהליך
                                </h3>
                                <p className="text-sm text-gray-500">בחר לקוח להחיל עליו את "{activeBP?.name}"</p>
                            </div>
                            <button onClick={() => setShowClientSelector(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="חפש לקוח..." 
                                    value={clientSearchTerm}
                                    onChange={(e) => setClientSearchTerm(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-sm focus:border-nexus-primary focus:ring-4 focus:ring-nexus-primary/5 outline-none transition-all"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar bg-gray-50/30">
                            {filteredClients.map(client => (
                                <button 
                                    key={client.id}
                                    onClick={() => handleAssignToClient(client)}
                                    className="w-full flex items-center gap-4 p-3 hover:bg-white hover:shadow-sm rounded-xl transition-all group text-right border border-transparent hover:border-gray-100"
                                >
                                    <div className="w-10 h-10 rounded-full bg-nexus-primary text-white flex items-center justify-center font-bold text-sm shadow-sm group-hover:scale-110 transition-transform">
                                        {client.logoInitials}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900">{client.name}</h4>
                                        <span className="text-xs text-gray-500">{client.industry}</span>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-nexus-accent font-bold text-xs flex items-center gap-1 bg-nexus-accent/10 px-3 py-1.5 rounded-lg border border-nexus-accent/20">
                                        הפעל <Play size={12} fill="currentColor" />
                                    </div>
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <div className="text-center py-10 text-gray-400">
                                    <p>לא נמצאו לקוחות</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile-Friendly Header */}
            {!selectedBlueprint && !isCreating && (
                <header className="mb-4 flex justify-between items-end border-b border-slate-200/70 pb-4">
                    <button 
                        onClick={() => { setIsCreating(true); setSelectedBlueprint(null); setIsEditing(false); }}
                        className="flex items-center justify-center w-12 h-12 bg-nexus-primary text-white rounded-xl shadow-lg hover:bg-nexus-accent transition-all font-bold lg:w-auto lg:px-6 lg:h-auto lg:py-3 lg:gap-2"
                        type="button"
                    >
                        <Plus size={18} /> <span className="hidden lg:inline">בנה חדש</span>
                    </button>
                </header>
            )}

            <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
                
                {/* Sidebar: Blueprint List (Responsive) */}
                <div className={`
                    flex-col gap-3 overflow-y-auto pr-2 custom-scrollbar pb-24 lg:pb-10 w-full lg:w-80 flex-shrink-0 transition-all duration-300
                    ${selectedBlueprint || isCreating ? 'hidden lg:flex' : 'flex'} 
                `}>
                    {blueprints.map(bp => (
                        <div 
                            key={bp.id}
                            onClick={() => { 
                                if (isEditing && !window.confirm("יש שינויים שלא נשמרו. לעבור בכל זאת?")) return;
                                setSelectedBlueprint(bp); 
                                setEditedBlueprint(bp);
                                setIsCreating(false); 
                                setIsEditing(false);
                            }}
                            className={`p-5 rounded-xl border transition-all cursor-pointer group hover:shadow-md
                                ${selectedBlueprint?.id === bp.id 
                                    ? 'bg-white border-l-4 border-l-nexus-accent border-y-gray-100 border-r-gray-100 shadow-luxury' 
                                    : 'bg-white/50 border-transparent hover:bg-white'}
                            `}
                        >
                            <h3 className={`font-bold text-sm mb-1 ${selectedBlueprint?.id === bp.id ? 'text-nexus-primary' : 'text-gray-700'}`}>{bp.name}</h3>
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{bp.description}</p>
                            
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-500 font-medium flex items-center gap-1">
                                    <Clock size={10} /> {bp.totalDuration}
                                </span>
                                {bp.tags.map(t => (
                                    <span key={t} className="text-[10px] bg-nexus-accent/10 text-nexus-accent px-2 py-0.5 rounded font-medium">
                                        #{t}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area (Detail View) */}
                <div className={`
                    flex-1 bg-white/40 backdrop-blur-sm rounded-2xl border border-white/60 shadow-inner overflow-hidden flex-col relative transition-all duration-300
                    ${!selectedBlueprint && !isCreating ? 'hidden lg:flex' : 'flex'}
                `}>
                    
                    {/* Mobile Back Button (Inside Detail View) */}
                    {(selectedBlueprint || isCreating) && (
                        <div className="lg:hidden p-4 border-b border-gray-200/50 flex items-center">
                            <button 
                                onClick={() => { setSelectedBlueprint(null); setIsCreating(false); }}
                                className="flex items-center gap-2 text-gray-500 font-bold text-sm"
                            >
                                <ArrowRight size={18} /> חזרה לרשימה
                            </button>
                        </div>
                    )}

                    {/* Mode 1: Creator Selection (AI vs Manual) */}
                    {isCreating && (
                        <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-6 lg:p-10 animate-fade-in overflow-y-auto">
                            <div className="w-full max-w-4xl text-center">
                                <h2 className="text-2xl lg:text-3xl font-display font-bold text-nexus-primary mb-8">איך בא לך לבנות את השיטה?</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
                                    {/* AI Option */}
                                    <button 
                                        onClick={() => setPrompt(" ")} // Just trigger the prompt view
                                        className="glass-card p-6 lg:p-10 hover:border-nexus-accent hover:shadow-xl transition-all group text-right flex flex-col items-center gap-4 lg:gap-6"
                                    >
                                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-nexus-primary rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                            <Sparkles size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">תמציא לי שיטה</h3>
                                            <p className="text-sm lg:text-base text-gray-500">תגיד לי מה אתה צריך, אני אבנה לבד.</p>
                                        </div>
                                    </button>

                                    {/* Manual Option */}
                                    <button 
                                        onClick={handleCreateManual}
                                        className="glass-card p-6 lg:p-10 hover:border-gray-400 hover:shadow-xl transition-all group text-right flex flex-col items-center gap-4 lg:gap-6"
                                    >
                                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center text-gray-600 shadow-lg group-hover:scale-110 transition-transform">
                                            <LayoutList size={28} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-2">אני אבנה לבד</h3>
                                            <p className="text-sm lg:text-base text-gray-500">כי אף אחד לא מבין כמוני.</p>
                                        </div>
                                    </button>
                                </div>
                                
                                {prompt.trim() !== '' && (
                                    <div className="mt-8 animate-slide-up max-w-2xl mx-auto pb-20">
                                        <div className="relative group">
                                            <textarea 
                                                value={prompt === " " ? "" : prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                disabled={isGenerating}
                                                className="w-full h-32 p-6 bg-white border border-gray-200 rounded-2xl shadow-lg text-lg focus:border-nexus-accent focus:ring-4 focus:ring-nexus-accent/10 outline-none resize-none transition-all"
                                                placeholder="תאר את התהליך שתרצה לבנות..."
                                            />
                                            <div className="flex justify-center gap-4 mt-4">
                                                <button onClick={() => setIsCreating(false)} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-800">ביטול</button>
                                                <GlowButton onClick={handleGenerate} isLoading={isGenerating}>
                                                    <Sparkles size={18} className="mr-2" /> שהרובוט יבנה
                                                </GlowButton>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Mode 2: Blueprint Viewer / Editor */}
                    {activeBP ? (
                        <div className="h-full flex flex-col overflow-hidden animate-slide-up">
                            {/* Header */}
                            <div className="p-4 lg:p-8 border-b border-gray-200 bg-white/80 backdrop-blur-md">
                                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                                    <div className="flex-1 w-full">
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <input 
                                                    value={activeBP.name}
                                                    onChange={(e) => setEditedBlueprint({...activeBP, name: e.target.value})}
                                                    className="text-2xl lg:text-3xl font-display font-bold text-gray-900 bg-transparent border-b border-gray-300 focus:border-nexus-primary outline-none w-full pb-1"
                                                />
                                                <input 
                                                    value={activeBP.description}
                                                    onChange={(e) => setEditedBlueprint({...activeBP, description: e.target.value})}
                                                    className="text-gray-500 w-full bg-transparent border-b border-gray-200 focus:border-nexus-primary outline-none pb-1"
                                                />
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 lg:gap-3 mb-2">
                                                    <h2 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">{activeBP.name}</h2>
                                                    {activeBP.tags.map(t => (
                                                        <span key={t} className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded border border-gray-200 uppercase">
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                                <p className="text-sm lg:text-base text-gray-500 max-w-2xl">{activeBP.description}</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2 w-full lg:w-auto overflow-x-auto pb-1 no-scrollbar">
                                        {isEditing ? (
                                            <>
                                                <button onClick={handleCancelEdit} className="flex-1 lg:flex-none px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-bold transition-colors whitespace-nowrap">
                                                    ביטול
                                                </button>
                                                <button onClick={handleSaveEdit} className="flex-1 lg:flex-none px-4 py-2 bg-nexus-primary text-white rounded-lg hover:bg-nexus-accent transition-colors font-bold flex items-center justify-center gap-2 whitespace-nowrap">
                                                    <Save size={16} /> שמור
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setEditedBlueprint(activeBP); setIsEditing(true); }} className="flex-1 lg:flex-none px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-bold flex items-center justify-center gap-2 whitespace-nowrap">
                                                    <Edit2 size={16} /> ערוך
                                                </button>
                                                <button 
                                                    onClick={() => setShowClientSelector(true)}
                                                    className="flex-1 lg:flex-none px-6 py-2.5 bg-nexus-primary text-white rounded-xl shadow-lg hover:bg-nexus-accent transition-all font-bold flex items-center justify-center gap-2 whitespace-nowrap"
                                                >
                                                    <Play size={16} /> הפעל
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Timeline Visualizer */}
                            <div className="flex-1 overflow-y-auto p-4 lg:p-8 custom-scrollbar bg-gray-50/30 pb-32">
                                <div className="max-w-4xl mx-auto relative pb-20">
                                    {/* Vertical Line */}
                                    <div className="absolute top-4 bottom-0 right-4 lg:right-8 w-0.5 bg-gray-200"></div>

                                    <div className="space-y-12">
                                        {activeBP.stages.map((stage, idx) => (
                                            <div key={stage.id} className="relative pr-10 lg:pr-20 group">
                                                {/* Stage Marker */}
                                                <div className="absolute top-0 right-2 lg:right-[-5px] w-4 h-4 rounded-full border-4 border-white bg-nexus-primary shadow-sm z-10"></div>
                                                
                                                {/* Stage Header */}
                                                <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                                                    {isEditing ? (
                                                        <div className="flex gap-4 items-center w-full">
                                                            <input 
                                                                value={stage.title}
                                                                onChange={(e) => updateStage(stage.id, { title: e.target.value })}
                                                                className="text-lg lg:text-xl font-bold text-gray-900 bg-white border border-gray-200 rounded px-2 py-1 w-full lg:w-1/3"
                                                            />
                                                            <input 
                                                                value={stage.duration}
                                                                onChange={(e) => updateStage(stage.id, { duration: e.target.value })}
                                                                className="text-sm text-nexus-accent font-medium bg-white border border-gray-200 rounded px-2 py-1 w-1/3 lg:w-1/4"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <h3 className="text-lg lg:text-xl font-bold text-gray-900">{stage.title}</h3>
                                                            <span className="text-sm text-nexus-accent font-medium">{stage.duration}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Items Card */}
                                                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                                    {stage.items.map((item, i) => (
                                                        <div key={item.id} className="flex items-start gap-4 p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors group/item">
                                                            {/* Item Icon */}
                                                            <div className="mt-1 p-2 bg-gray-100 rounded-lg text-gray-500">
                                                                {getItemIcon(item.type)}
                                                            </div>
                                                            
                                                            {/* Item Details */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex justify-between items-start">
                                                                    {isEditing ? (
                                                                        <div className="space-y-1 w-full">
                                                                            <input 
                                                                                value={item.title}
                                                                                onChange={(e) => updateItem(stage.id, item.id, { title: e.target.value })}
                                                                                className="font-bold text-sm text-gray-900 bg-white border border-gray-200 rounded px-2 py-0.5 w-full"
                                                                            />
                                                                            <input 
                                                                                value={item.description}
                                                                                onChange={(e) => updateItem(stage.id, item.id, { description: e.target.value })}
                                                                                className="text-xs text-gray-500 bg-white border border-gray-200 rounded px-2 py-0.5 w-full"
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div className="truncate">
                                                                            <h4 className="font-bold text-sm text-gray-900 truncate">{item.title}</h4>
                                                                            <p className="text-xs text-gray-500 mt-0.5 truncate">{item.description}</p>
                                                                        </div>
                                                                    )}

                                                                    {isEditing && (
                                                                        <button 
                                                                            onClick={() => deleteItem(stage.id, item.id)}
                                                                            className="opacity-100 lg:opacity-0 group-hover/item:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                
                                                                {/* Chips */}
                                                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                    <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200 font-medium whitespace-nowrap">
                                                                        {getItemLabel(item.type)}
                                                                    </span>
                                                                    {item.isAutomated && (
                                                                        <span className="text-[10px] bg-nexus-accent/10 text-nexus-accent px-1.5 py-0.5 rounded font-bold border border-nexus-accent/20 flex items-center gap-1 whitespace-nowrap">
                                                                            <Sparkles size={10} /> אוטומטי
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {stage.items.length === 0 && (
                                                        <div className="p-8 text-center text-gray-400 text-sm italic">
                                                            אין משימות בשלב זה
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Add Item Button (Editing Mode) */}
                                                {isEditing && (
                                                    <button 
                                                        onClick={() => addItem(stage.id)}
                                                        className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:text-nexus-primary hover:border-nexus-primary hover:bg-nexus-primary/5 transition-all flex items-center justify-center gap-2 font-bold text-xs"
                                                    >
                                                        <Plus size={14} /> הוסף משימה לשלב זה
                                                    </button>
                                                )}
                                            </div>
                                        ))}

                                        {/* Add Stage Button (Editing Mode) */}
                                        {isEditing && (
                                            <button 
                                                onClick={addStage}
                                                className="w-full py-4 bg-gray-100 rounded-xl text-gray-500 font-bold hover:bg-gray-200 transition-colors border border-gray-200 flex items-center justify-center gap-2"
                                            >
                                                <Layers size={16} /> הוסף שלב חדש
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <GitMerge size={64} className="mb-4 opacity-20" />
                            <h3 className="text-xl font-bold text-gray-500">בחר שיטה מהרשימה</h3>
                            <p className="text-sm">או צור אחת חדשה כדי להתחיל</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkflowBuilder;
