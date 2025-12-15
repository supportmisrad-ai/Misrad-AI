
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion } from 'framer-motion';
import { Kanban, Plus, GripVertical, Palette, ChevronDown, Trash2 } from 'lucide-react';
import { WorkflowStage } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

const COLOR_PRESETS = [
    { label: 'אפור', value: 'bg-gray-100 text-gray-800 border-gray-300' },
    { label: 'כחול', value: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'ירוק', value: 'bg-green-50 text-green-700 border-green-200' },
    { label: 'צהוב', value: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { label: 'כתום', value: 'bg-orange-50 text-orange-700 border-orange-200' },
    { label: 'אדום', value: 'bg-red-50 text-red-700 border-red-200' },
    { label: 'סגול', value: 'bg-purple-50 text-purple-700 border-purple-200' },
    { label: 'ורוד', value: 'bg-pink-50 text-pink-700 border-pink-200' },
    { label: 'טורקיז', value: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
];

export const WorkflowTab: React.FC = () => {
    const { workflowStages, updateSettings, deleteWorkflowStage, addToast } = useData();
    const [draggedStageIndex, setDraggedStageIndex] = useState<number | null>(null);
    const [openColorPicker, setOpenColorPicker] = useState<string | null>(null);
    
    // Delete Modal
    const [stageToDelete, setStageToDelete] = useState<{id: string, name: string} | null>(null);

    const updateStage = (index: number, field: string, value: string) => {
        const newStages = [...workflowStages];
        newStages[index] = { ...newStages[index], [field]: value };
        updateSettings('workflowStages', newStages);
    };

    const addNewStage = () => {
        const newStage: WorkflowStage = {
            id: `STG-${Date.now()}`,
            name: 'שלב חדש',
            color: 'bg-gray-100 text-gray-800 border-gray-300'
        };
        updateSettings('workflowStages', [...workflowStages, newStage]);
        addToast('שלב חדש נוסף ללוח המשימות', 'success');
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setStageToDelete({ id, name });
    };

    const confirmDelete = () => {
        if (!stageToDelete) return;
        deleteWorkflowStage(stageToDelete.id);
        setStageToDelete(null);
    };

    const handleStageDragStart = (e: React.DragEvent, index: number) => {
        setDraggedStageIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleStageDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedStageIndex === null || draggedStageIndex === index) return;
        
        const newStages = [...workflowStages];
        const draggedItem = newStages[draggedStageIndex];
        newStages.splice(draggedStageIndex, 1);
        newStages.splice(index, 0, draggedItem);
        updateSettings('workflowStages', newStages);
        setDraggedStageIndex(index);
    };

    const handleStageDragEnd = () => {
        setDraggedStageIndex(null);
    };

    return (
        <motion.div
            key="workflow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6 pb-20"
        >
            
            <DeleteConfirmationModal 
                isOpen={!!stageToDelete}
                onClose={() => setStageToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת שלב"
                description="השלב יימחק. משימות הנמצאות בשלב זה יאבדו את הסטטוס שלהם או יעברו לסטטוס ברירת מחדל."
                itemName={stageToDelete?.name}
                isHardDelete={true}
            />

            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">ניהול תהליך משימות</h2>
                    <p className="text-sm text-gray-500">הגדרת השלבים בלוח המשימות (Kanban).</p>
                </div>
                
                <button onClick={addNewStage} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-gray-800"><Plus size={18} /> שלב חדש</button>
            </div>

            <div className="space-y-3">
                {workflowStages.map((stage, idx) => (
                    <div 
                        key={stage.id} 
                        draggable
                        onDragStart={(e) => handleStageDragStart(e, idx)}
                        onDragOver={(e) => handleStageDragOver(e, idx)}
                        onDragEnd={handleStageDragEnd}
                        className={`flex flex-col md:flex-row md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm group ${draggedStageIndex === idx ? 'opacity-50 ring-2 ring-blue-500' : ''}`}
                    >
                        <div className="p-2 bg-gray-50 rounded-lg text-gray-400 cursor-grab active:cursor-grabbing hidden md:block"><GripVertical size={20} /></div>
                        
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                            <div className="flex-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">שם השלב</label>
                                <input 
                                    type="text" 
                                    value={stage.name} 
                                    onChange={(e) => updateStage(idx, 'name', e.target.value)} 
                                    className="w-full font-bold text-gray-900 bg-transparent outline-none focus:underline"
                                />
                            </div>

                            {/* Color Picker */}
                            <div className="flex-1 relative">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1 flex items-center gap-1"><Palette size={10} /> צבע</label>
                                <button 
                                    onClick={() => setOpenColorPicker(openColorPicker === stage.id ? null : stage.id)}
                                    className={`w-full flex items-center justify-between p-2 rounded border text-xs font-bold ${stage.color} hover:opacity-80 transition-opacity`}
                                >
                                    <span>בחר צבע</span>
                                    <ChevronDown size={14} />
                                </button>
                                
                                {openColorPicker === stage.id && (
                                    <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 grid grid-cols-4 gap-2 w-64">
                                        {COLOR_PRESETS.map(preset => (
                                            <button
                                                key={preset.label}
                                                onClick={() => { updateStage(idx, 'color', preset.value); setOpenColorPicker(null); }}
                                                className={`h-8 rounded-lg border flex items-center justify-center text-[10px] font-bold ${preset.value} hover:scale-105 transition-transform`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={(e) => handleDeleteClick(e, stage.id, stage.name)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-end md:self-center"><Trash2 size={18} /></button>
                    </div>
                ))}
            </div>
        </motion.div>
    );
};
