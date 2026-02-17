
import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Layers, Trash2, Calendar, User, ArrowRight, Save, Clock, FileText, Video, Mail, CircleCheckBig, GripVertical, ChevronRight } from 'lucide-react';
import { Template, Priority, TemplateActionType, TemplateCategory } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { CustomSelect } from '../CustomSelect';

export const TemplatesTab: React.FC = () => {
    const { templates, addTemplate, removeTemplate, roleDefinitions } = useData();
    const [isCreatingTemplate, setIsCreatingTemplate] = useState(false);
    
    // Editor State
    const [templateName, setTemplateName] = useState('');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateCategory, setTemplateCategory] = useState<TemplateCategory>('general');
    const [templateItems, setTemplateItems] = useState<{title: string, role: string, priority: Priority, offset: number, actionType: TemplateActionType, description: string}[]>([]);
    
    // Delete Modal State
    const [templateToDelete, setTemplateToDelete] = useState<{id: string, name: string} | null>(null);
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
    
    const [isShaking, setIsShaking] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const handleAddItem = () => {
        setTemplateItems([...templateItems, { 
            title: '', 
            role: roleDefinitions[0]?.name || 'עובד', 
            priority: Priority.MEDIUM, 
            offset: templateItems.length > 0 ? templateItems[templateItems.length - 1].offset + 1 : 0,
            actionType: 'task',
            description: ''
        }]);
    };

    const handleUpdateItem = (index: number, field: string, value: unknown) => {
        const updated = [...templateItems];
        updated[index] = { ...updated[index], [field]: value };
        setTemplateItems(updated);
    };

    const handleRemoveItem = (index: number) => {
        setTemplateItems(templateItems.filter((_, i) => i !== index));
    };

    const handleDragStart = (index: number) => setDraggedItemIndex(index);
    const handleDragOver = (index: number) => {
        if (draggedItemIndex === null || draggedItemIndex === index) return;
        const newItems = [...templateItems];
        const draggedItem = newItems[draggedItemIndex];
        newItems.splice(draggedItemIndex, 1);
        newItems.splice(index, 0, draggedItem);
        setTemplateItems(newItems);
        setDraggedItemIndex(index);
    };

    const handleSaveTemplate = () => {
        if (!templateName.trim()) {
            setIsShaking(true);
            nameInputRef.current?.focus();
            setTimeout(() => setIsShaking(false), 400);
            return;
        }

        const newTemplate: Template = {
            id: `tmp_${Date.now()}`,
            name: templateName,
            description: templateDesc,
            category: templateCategory,
            icon: templateCategory === 'onboarding' ? 'UserPlus' : templateCategory === 'content' ? 'Video' : 'Layers',
            items: templateItems.map(item => ({
                title: item.title,
                priority: item.priority,
                targetRole: item.role,
                daysDueOffset: item.offset,
                actionType: item.actionType,
                description: item.description,
                tags: ['Template', templateCategory === 'onboarding' ? 'Onboarding' : 'General']
            }))
        };
        addTemplate(newTemplate);
        
        // Reset
        setTemplateName('');
        setTemplateDesc('');
        setTemplateCategory('general');
        setTemplateItems([]);
        setIsCreatingTemplate(false);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setTemplateToDelete({ id, name });
    };

    const confirmDelete = () => {
        if (templateToDelete) {
            removeTemplate(templateToDelete.id);
            setTemplateToDelete(null);
        }
    };

    const getActionIcon = (type: TemplateActionType) => {
        switch(type) {
            case 'email': return <Mail size={14} className="text-blue-500" />;
            case 'meeting': return <Calendar size={14} className="text-purple-500" />;
            case 'doc': return <FileText size={14} className="text-orange-500" />;
            default: return <CircleCheckBig size={14} className="text-green-500" />;
        }
    };

    return (
        <motion.div key="templates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-16 md:pb-20">
            
            <DeleteConfirmationModal 
                isOpen={!!templateToDelete}
                onClose={() => setTemplateToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת תהליך (Playbook)"
                description="התבנית תימחק לצמיתות ולא תהיה זמינה יותר ליצירת תהליכים חדשים."
                itemName={templateToDelete?.name}
                isHardDelete={true}
            />

            {!isCreatingTemplate ? (
                <>
                    <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                        <div>
                            <h2 className="text-xl font-black text-gray-900">תהליכים</h2>
                            <p className="text-sm text-gray-500 mt-1">הגדרת "השיטה" של העסק: קליטת לקוח, הפקת תוכן וניהול פרויקטים.</p>
                        </div>
                        <button 
                            onClick={() => { setIsCreatingTemplate(true); setIsShaking(false); }}
                            className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-gray-800 transition-colors w-full md:w-auto"
                        >
                            <Plus size={18} /> בנה תהליך חדש
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        {templates.map((template: Template) => (
                            <div key={template.id} className="bg-white p-4 md:p-6 rounded-[1.5rem] border border-gray-200 shadow-sm hover:border-blue-300 hover:shadow-lg transition-all flex flex-col h-full relative group cursor-default">
                                <button 
                                    onClick={(e) => handleDeleteClick(e, template.id, template.name)}
                                    className="absolute top-4 left-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 rounded-full hover:bg-red-50"
                                    aria-label={`מחק תבנית ${template.name}`}
                                >
                                    <Trash2 size={18} />
                                </button>
                                
                                <div className="flex items-start gap-3 md:gap-4 mb-4 md:mb-6">
                                    <div className={`p-2.5 md:p-3.5 rounded-2xl shrink-0 ${
                                        template.category === 'onboarding' ? 'bg-blue-50 text-blue-600' : 
                                        template.category === 'content' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        <Layers size={20} className="md:w-6 md:h-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                            {template.category === 'onboarding' ? 'קליטת לקוח' : template.category === 'content' ? 'הפקת תוכן' : 'כללי'}
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-base md:text-lg leading-tight break-words">{template.name}</h3>
                                    </div>
                                </div>

                                <p className="text-xs md:text-sm text-gray-500 mb-4 md:mb-6 line-clamp-2 min-h-[32px] md:min-h-[40px]">
                                    {template.description || 'ללא תיאור תהליך.'}
                                </p>

                                <div className="flex-1 space-y-3 relative">
                                    {/* Timeline Line */}
                                    <div className="absolute top-2 bottom-2 right-[11px] w-0.5 bg-gray-100"></div>
                                    
                                    {template.items.slice(0, 4).map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 text-xs text-gray-700 relative z-10">
                                            <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
                                                {getActionIcon(item.actionType || 'task')}
                                            </div>
                                            <span className="truncate flex-1 font-medium">{item.title}</span>
                                            <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded">{item.daysDueOffset > 0 ? `+${item.daysDueOffset} ימים` : 'מיידי'}</span>
                                        </div>
                                    ))}
                                    {template.items.length > 4 && (
                                        <div className="flex items-center gap-3 text-xs text-gray-400 relative z-10 pl-2">
                                            <div className="w-1.5 h-1.5 bg-gray-300 rounded-full ml-2 mr-0.5"></div>
                                            <span>ועוד {template.items.length - 4} שלבים...</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                // EDITOR MODE
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="bg-white border border-gray-200 rounded-[2rem] shadow-xl overflow-hidden flex flex-col h-auto md:h-[80vh]"
                >
                    {/* Editor Header */}
                    <div className="p-4 md:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <button onClick={() => setIsCreatingTemplate(false)} className="p-2 bg-white rounded-full border border-gray-200 text-gray-500 hover:text-black hover:border-gray-400 transition-colors" aria-label="סגור יצירת תבנית">
                                <X size={20} />
                            </button>
                            <h3 className="font-black text-lg md:text-xl text-gray-900">בניית תהליך חדש</h3>
                        </div>
                        <div className="flex gap-2 md:gap-3">
                            <button onClick={() => setIsCreatingTemplate(false)} className="px-4 md:px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 hover:bg-white rounded-xl transition-colors">ביטול</button>
                            <button onClick={handleSaveTemplate} className="px-4 md:px-6 py-2.5 bg-black text-white rounded-xl text-sm font-bold shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
                                <Save size={16} /> <span className="hidden sm:inline">שמור תהליך</span><span className="sm:hidden">שמור</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Left Settings Panel */}
                        <div className="w-full md:w-80 border-b md:border-b-0 md:border-l border-gray-100 p-4 md:p-6 bg-white overflow-visible md:overflow-y-auto custom-scrollbar shrink-0 max-h-none md:max-h-none">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">שם התהליך</label>
                                    <input 
                                        ref={nameInputRef}
                                        value={templateName}
                                        onChange={(e) => { setTemplateName(e.target.value); setIsShaking(false); }}
                                        placeholder="למשל: קליטת לקוח פרימיום"
                                        className={`w-full p-3.5 bg-gray-50 border rounded-xl outline-none font-bold text-gray-900 transition-all ${isShaking ? 'border-red-500 ring-2 ring-red-200 animate-shake' : 'border-gray-200 focus:border-black'}`}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">תיאור קצר</label>
                                    <textarea 
                                        value={templateDesc}
                                        onChange={(e) => setTemplateDesc(e.target.value)}
                                        placeholder="מה מטרת התהליך ולמי הוא מיועד?"
                                        className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl outline-none text-sm text-gray-700 focus:border-black h-24 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">קטגוריה</label>
                                    <div className="space-y-2">
                                        {[
                                            { id: 'onboarding', label: 'קליטת לקוח', icon: User },
                                            { id: 'content', label: 'הפקת תוכן', icon: Video },
                                            { id: 'general', label: 'כללי / תפעול', icon: Layers },
                                        ].map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setTemplateCategory(cat.id as TemplateCategory)}
                                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-bold ${
                                                    templateCategory === cat.id 
                                                    ? 'bg-black text-white border-black shadow-md' 
                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                }`}
                                            >
                                                <cat.icon size={18} /> {cat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Editor Area (Flow Builder) */}
                        <div className="flex-1 bg-gray-50/30 p-4 md:p-8 overflow-visible md:overflow-y-auto custom-scrollbar">
                            <div className="max-w-3xl mx-auto">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 md:mb-6">
                                    <h4 className="font-bold text-gray-900 text-base md:text-lg flex items-center gap-2">
                                        <Clock size={18} className="md:w-5 md:h-5 text-blue-500" /> ציר הזמן של התהליך
                                    </h4>
                                    <button 
                                        onClick={handleAddItem}
                                        className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 md:px-4 py-2 rounded-xl transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                                    >
                                        <Plus size={16} /> הוסף צעד
                                    </button>
                                </div>

                                <div className="space-y-4 relative pb-16 md:pb-20">
                                    {/* Vertical Line */}
                                    <div className="absolute top-4 bottom-4 right-[28px] w-0.5 bg-gray-200 -z-10"></div>

                                    {templateItems.length === 0 && (
                                        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-3xl bg-white/50">
                                            <Layers size={40} className="mx-auto text-gray-300 mb-4" />
                                            <p className="text-gray-500 font-medium">התהליך ריק. התחל להוסיף צעדים.</p>
                                        </div>
                                    )}

                                    {templateItems.map((item, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`relative flex flex-col sm:flex-row items-start gap-3 sm:gap-4 group ${draggedItemIndex === idx ? 'opacity-50' : ''}`}
                                            draggable
                                            onDragStart={() => handleDragStart(idx)}
                                            onDragOver={(e) => { e.preventDefault(); handleDragOver(idx); }}
                                            onDragEnd={() => setDraggedItemIndex(null)}
                                        >
                                            {/* Number Bubble */}
                                            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-2xl border-2 border-gray-200 flex flex-col items-center justify-center shrink-0 z-10 shadow-sm cursor-grab active:cursor-grabbing group-hover:border-blue-400 transition-colors self-center sm:self-start">
                                                <span className="text-base sm:text-lg font-black text-gray-900">{idx + 1}</span>
                                                <GripVertical size={10} className="sm:w-3 sm:h-3 text-gray-300" />
                                            </div>

                                            {/* Card */}
                                            <div className="flex-1 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all w-full">
                                                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <input 
                                                            value={item.title} 
                                                            onChange={(e) => handleUpdateItem(idx, 'title', e.target.value)}
                                                            placeholder="שם המשימה / פעולה"
                                                            className="w-full text-sm sm:text-base font-bold text-gray-900 placeholder:text-gray-300 outline-none border-b border-transparent focus:border-blue-500 transition-colors bg-transparent"
                                                        />
                                                        <input 
                                                            value={item.description || ''} 
                                                            onChange={(e) => handleUpdateItem(idx, 'description', e.target.value)}
                                                            placeholder="תיאור והנחיות לביצוע..."
                                                            className="w-full text-xs text-gray-500 placeholder:text-gray-300 outline-none mt-1 bg-transparent"
                                                        />
                                                    </div>
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-gray-300 hover:text-red-500 p-1 transition-colors shrink-0"><X size={16} /></button>
                                                </div>

                                                <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
                                                    
                                                    {/* Action Type Select - USING CustomSelect */}
                                                    <div className="w-full sm:w-40">
                                                        <CustomSelect 
                                                            value={item.actionType}
                                                            onChange={(val) => handleUpdateItem(idx, 'actionType', val)}
                                                            options={[
                                                                { value: 'task', label: 'משימה רגילה', icon: <CircleCheckBig size={14} className="text-green-500" /> },
                                                                { value: 'email', label: 'מייל אוטומטי', icon: <Mail size={14} className="text-blue-500" /> },
                                                                { value: 'meeting', label: 'תיאום פגישה', icon: <Calendar size={14} className="text-purple-500" /> },
                                                                { value: 'doc', label: 'יצירת מסמך', icon: <FileText size={14} className="text-orange-500" /> },
                                                            ]}
                                                            className="text-xs"
                                                        />
                                                    </div>

                                                    {/* Role Select - USING CustomSelect */}
                                                    <div className="w-full sm:w-40">
                                                        <CustomSelect 
                                                            value={item.role}
                                                            onChange={(val) => handleUpdateItem(idx, 'role', val)}
                                                            options={roleDefinitions.map((r: { name: string; id?: string }) => ({ value: r.name, label: r.name }))}
                                                            className="text-xs"
                                                            icon={<User size={14} />}
                                                        />
                                                    </div>

                                                    {/* Timing Select */}
                                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-2.5 rounded-xl text-xs font-bold text-blue-700 w-full sm:w-auto justify-center sm:justify-start">
                                                        <Clock size={14} className="text-blue-500" />
                                                        <span>יום</span>
                                                        <input 
                                                            type="number"
                                                            min="0"
                                                            value={item.offset}
                                                            onChange={(e) => handleUpdateItem(idx, 'offset', Number(e.target.value))}
                                                            className="w-12 bg-transparent text-center outline-none border-b border-blue-300 focus:border-blue-600"
                                                        />
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    <button 
                                        onClick={handleAddItem}
                                        className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 text-sm font-bold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-2 group"
                                        aria-label="הוסף פריט חדש לתבנית"
                                    >
                                        <div className="bg-gray-100 p-2 rounded-full group-hover:bg-blue-200 transition-colors">
                                            <Plus size={20} />
                                        </div>
                                        הוסף את הצעד הבא בתהליך
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
};
