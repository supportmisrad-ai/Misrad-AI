
import React, { useState } from 'react';
import { Client } from '../../types';
import { Briefcase, Image, FolderOpen, FileText, Download, Plus, X, Loader2 } from 'lucide-react';
import { useNexus } from '../../context/ClientContext';

interface ClientWorkTabProps {
  client: Client;
}

export const ClientWorkTab: React.FC<ClientWorkTabProps> = ({ client }) => {
  const { createDeliverableForClient } = useNexus();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    type: 'CAMPAIGN' as 'CAMPAIGN' | 'REPORT' | 'DESIGN' | 'STRATEGY' | 'DEV',
    thumbnailUrl: '',
    tags: '',
  });

  const getAssetIcon = (type: string) => {
    switch (type) {
        case 'PDF': return <FileText size={20} className="text-red-500"/>;
        case 'IMAGE': return <Image size={20} className="text-blue-500"/>;
        case 'FIGMA': return <Briefcase size={20} className="text-purple-500"/>;
        default: return <FileText size={20} className="text-gray-500"/>;
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
        {isCreateOpen && (
            <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="p-5 flex items-center justify-between border-b border-gray-100">
                        <div className="font-bold text-gray-900 flex items-center gap-2">
                            <Briefcase size={18} className="text-nexus-primary" /> פרויקט חדש
                        </div>
                        <button
                            onClick={() => setIsCreateOpen(false)}
                            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"
                            type="button"
                            aria-label="Close"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">כותרת</label>
                            <input
                                value={newProject.title}
                                onChange={(e) => setNewProject((p) => ({ ...p, title: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 font-bold outline-none focus:border-nexus-primary"
                                placeholder="שם הפרויקט..."
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">תיאור</label>
                            <textarea
                                value={newProject.description}
                                onChange={(e) => setNewProject((p) => ({ ...p, description: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-nexus-primary min-h-[110px]"
                                placeholder="מה הפרויקט כולל?"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">סוג</label>
                                <select
                                    value={newProject.type}
                                    onChange={(e) => setNewProject((p) => ({ ...p, type: e.target.value as any }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm font-bold outline-none focus:border-nexus-primary"
                                >
                                    <option value="CAMPAIGN">CAMPAIGN</option>
                                    <option value="REPORT">REPORT</option>
                                    <option value="DESIGN">DESIGN</option>
                                    <option value="STRATEGY">STRATEGY</option>
                                    <option value="DEV">DEV</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">תמונה (URL)</label>
                                <input
                                    value={newProject.thumbnailUrl}
                                    onChange={(e) => setNewProject((p) => ({ ...p, thumbnailUrl: e.target.value }))}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-nexus-primary"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">תגיות (מופרד בפסיקים)</label>
                            <input
                                value={newProject.tags}
                                onChange={(e) => setNewProject((p) => ({ ...p, tags: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-nexus-primary"
                                placeholder="branding, q3, launch"
                            />
                        </div>
                    </div>

                    <div className="p-5 border-t border-gray-100 flex gap-3">
                        <button
                            onClick={() => setIsCreateOpen(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 border border-gray-200"
                            type="button"
                            disabled={isCreating}
                        >
                            ביטול
                        </button>
                        <button
                            onClick={async () => {
                                if (!newProject.title.trim()) return;
                                setIsCreating(true);
                                try {
                                    await createDeliverableForClient({
                                        clientId: client.id,
                                        title: newProject.title.trim(),
                                        description: newProject.description.trim(),
                                        type: newProject.type,
                                        thumbnailUrl: newProject.thumbnailUrl.trim() ? newProject.thumbnailUrl.trim() : null,
                                        tags: newProject.tags
                                            .split(',')
                                            .map((t) => t.trim())
                                            .filter(Boolean),
                                    });
                                    setIsCreateOpen(false);
                                    setNewProject({ title: '', description: '', type: 'CAMPAIGN', thumbnailUrl: '', tags: '' });
                                    window.dispatchEvent(
                                        new CustomEvent('nexus-toast', { detail: { message: 'הפרויקט נוצר ונשמר בהצלחה.', type: 'success' } })
                                    );
                                } catch {
                                    window.dispatchEvent(
                                        new CustomEvent('nexus-toast', { detail: { message: 'שגיאה ביצירת פרויקט.', type: 'error' } })
                                    );
                                } finally {
                                    setIsCreating(false);
                                }
                            }}
                            className="flex-1 py-3 rounded-xl text-sm font-bold bg-nexus-primary text-white hover:bg-nexus-accent transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            type="button"
                            disabled={isCreating || !newProject.title.trim()}
                        >
                            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                            צור פרויקט
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Deliverables Grid */}
        <div>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Briefcase size={18} className="text-nexus-primary"/> פרויקטים
                </h3>
                <button
                    onClick={() => setIsCreateOpen(true)}
                    className="px-4 py-2 bg-nexus-primary text-white text-xs font-bold rounded-xl hover:bg-nexus-accent transition-all flex items-center gap-2"
                    type="button"
                >
                    <Plus size={14} /> פרויקט חדש
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {client.deliverables?.map(del => (
                    <div key={del.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg transition-all">
                        <div className="h-32 bg-gray-100 relative overflow-hidden">
                            {del.thumbnailUrl ? (
                                <img src={del.thumbnailUrl} alt={del.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300"><Image size={32}/></div>
                            )}
                            <div className="absolute top-2 right-2">
                                <span className="text-[10px] font-bold bg-white/90 backdrop-blur px-2 py-1 rounded shadow-sm text-gray-700">
                                    {del.type}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h4 className="font-bold text-gray-900 mb-1">{del.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{del.description}</p>
                            <div className="flex justify-between items-center text-xs text-gray-400 border-t border-gray-100 pt-3">
                                <span>{del.date}</span>
                                <span className={`font-bold ${
                                    del.status === 'PUBLISHED' ? 'text-green-600' : 
                                    del.status === 'APPROVED' ? 'text-blue-600' : 'text-yellow-600'
                                }`}>
                                    {del.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Assets List */}
        <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FolderOpen size={18} className="text-nexus-accent"/> קבצים
            </h3>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                {client.assets?.map((asset, idx) => (
                    <div key={asset.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                {getAssetIcon(asset.type)}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 text-sm">{asset.name}</h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{asset.category}</span>
                                    <span>•</span>
                                    <span>{asset.date}</span>
                                </div>
                            </div>
                        </div>
                        <button className="text-gray-400 hover:text-nexus-primary p-2">
                            <Download size={18} />
                        </button>
                    </div>
                ))}
                {client.assets.length === 0 && (
                    <div className="p-8 text-center text-gray-400 text-sm">אין קבצים</div>
                )}
            </div>
        </div>
    </div>
  );
};
