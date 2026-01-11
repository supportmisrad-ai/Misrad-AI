
import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Check, Trash2, Edit2, X, PartyPopper } from 'lucide-react';
import { SystemUpdate } from '../../types';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';

interface UpdatesTabProps {
    readOnly?: boolean;
}

export const UpdatesTab: React.FC<UpdatesTabProps> = ({ readOnly = false }) => {
    const { systemUpdates, publishSystemUpdate, currentUser, deleteSystemUpdate, updateSystemUpdate } = useData();
    const [isPublishUpdateOpen, setIsPublishUpdateOpen] = useState(false);
    const [formUpdate, setFormUpdate] = useState({ version: '', title: '', features: '', type: 'minor' });
    const [editingUpdateId, setEditingUpdateId] = useState<string | null>(null);
    const [updateToDelete, setUpdateToDelete] = useState<{id: string, title: string} | null>(null);

    // Only Super Admin can edit, regardless of where this component is rendered, 
    // but readOnly prop forces view-only mode.
    const canEdit = !readOnly && currentUser.isSuperAdmin;

    const openModal = (update?: SystemUpdate) => {
        if (update) {
            setEditingUpdateId(update.id);
            setFormUpdate({
                version: update.version,
                title: update.title,
                features: update.features.join('\n'),
                type: update.type
            });
        } else {
            setEditingUpdateId(null);
            setFormUpdate({ version: '', title: '', features: '', type: 'minor' });
        }
        setIsPublishUpdateOpen(true);
    };

    const handlePublishUpdate = () => {
        if (!formUpdate.title || !formUpdate.version) return;
        
        const featuresArray = formUpdate.features.split('\n').filter(f => f.trim().length > 0);

        if (editingUpdateId) {
            updateSystemUpdate(editingUpdateId, {
                version: formUpdate.version,
                title: formUpdate.title,
                features: featuresArray,
                type: formUpdate.type as any
            });
        } else {
            const update: SystemUpdate = {
                id: `upd-${Date.now()}`,
                version: formUpdate.version,
                title: formUpdate.title,
                date: new Date().toISOString(),
                features: featuresArray,
                authorId: currentUser.id,
                type: formUpdate.type as any
            };
            publishSystemUpdate(update);
        }
        
        setIsPublishUpdateOpen(false);
    };

    const handleDeleteClick = (id: string, title: string) => {
        setUpdateToDelete({ id, title });
    };

    const confirmDelete = () => {
        if (updateToDelete) {
            deleteSystemUpdate(updateToDelete.id);
            setUpdateToDelete(null);
        }
    };

    return (
        <motion.div key="updates" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-16 md:pb-20">
            
            <DeleteConfirmationModal
                isOpen={!!updateToDelete}
                onClose={() => setUpdateToDelete(null)}
                onConfirm={confirmDelete}
                title="מחיקת עדכון מערכת"
                description="העדכון יימחק לצמיתות מההיסטוריה ולא יוצג למשתמשים."
                itemName={updateToDelete?.title}
                isHardDelete={true}
            />

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {readOnly ? 'מה חדש ב-Nexus?' : 'ניהול גרסאות'}
                    </h2>
                    <p className="text-sm text-gray-500">
                        {readOnly 
                            ? 'היסטוריית העדכונים והחידושים האחרונים במערכת.' 
                            : 'פרסום עדכונים לכלל משתמשי הפלטפורמה.'}
                    </p>
                </div>
                {canEdit && (
                    <button onClick={() => openModal()} className="bg-black text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-gray-800">
                        <Rocket size={16} /> פרסם עדכון
                    </button>
                )}
            </div>

            {systemUpdates.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200 border-dashed">
                    <PartyPopper size={32} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500 text-sm">אין עדכונים להצגה כרגע.</p>
                </div>
            )}

            <div className="space-y-6 relative border-l-2 border-gray-100 mr-4 pr-6">
                {systemUpdates.map((update: SystemUpdate, idx: number) => (
                    <div key={update.id} className="relative group">
                        <div className={`absolute -right-[33px] top-0 w-3 h-3 rounded-full border-2 border-white ring-2 ${idx === 0 ? 'bg-green-500 ring-green-100' : 'bg-gray-300 ring-gray-100'}`}></div>
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative transition-all hover:shadow-md">
                            {canEdit && (
                                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(update)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-50 hover:text-blue-600">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDeleteClick(update.id, update.title)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${
                                            update.type === 'major' ? 'bg-purple-100 text-purple-700' :
                                            update.type === 'minor' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                                        }`}>{update.type}</span>
                                        <span className="text-xs text-gray-400">{new Date(update.date).toLocaleDateString('he-IL')}</span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900">{update.title} <span className="text-gray-400 text-sm font-mono ml-2">{update.version}</span></h3>
                                </div>
                            </div>
                            <ul className="space-y-2">
                                {update.features.map((feature, i) => (
                                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                                        <Check size={14} className="text-green-500 mt-1 shrink-0" />
                                        {feature}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isPublishUpdateOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsPublishUpdateOpen(false)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative z-10 flex flex-col p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-lg">{editingUpdateId ? 'עריכת עדכון' : 'פרסום עדכון מערכת'}</h3>
                                <button onClick={() => setIsPublishUpdateOpen(false)} className="text-gray-400 hover:text-black"><X size={20} /></button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <input value={formUpdate.version} onChange={e => setFormUpdate({...formUpdate, version: e.target.value})} placeholder="גרסה (למשל v2.5.0)" className="w-full p-3 border rounded-xl" />
                                    <select value={formUpdate.type} onChange={e => setFormUpdate({...formUpdate, type: e.target.value})} className="w-full p-3 border rounded-xl bg-white">
                                        <option value="major">Major (פיצ׳ר גדול)</option>
                                        <option value="minor">Minor (שיפורים)</option>
                                        <option value="patch">Patch (תיקונים)</option>
                                    </select>
                                </div>
                                <input value={formUpdate.title} onChange={e => setFormUpdate({...formUpdate, title: e.target.value})} placeholder="כותרת העדכון" className="w-full p-3 border rounded-xl" />
                                <textarea value={formUpdate.features} onChange={e => setFormUpdate({...formUpdate, features: e.target.value})} placeholder="רשימת שינויים (כל שורה היא סעיף)" className="w-full p-3 border rounded-xl h-32" />
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button onClick={() => setIsPublishUpdateOpen(false)} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">ביטול</button>
                                <button onClick={handlePublishUpdate} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 flex items-center gap-2">
                                    {editingUpdateId ? <Check size={16} /> : <Rocket size={16} />}
                                    {editingUpdateId ? 'שמור שינויים' : 'פרסם'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
