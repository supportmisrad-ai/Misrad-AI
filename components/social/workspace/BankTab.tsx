'use client';

import React, { useState } from 'react';
import { Database, Image, Upload, Plus, Trash2 } from 'lucide-react';
import { Client, Idea, AIOpportunity } from '@/types/social';

interface BankTabProps {
  client: Client;
  ideas: Idea[];
  onDeleteIdea: (ideaId: string) => void;
  onAddIdea: (text: string, clientId: string) => void;
  onNewPost: (context?: Partial<AIOpportunity>) => void;
}

const BankTab: React.FC<BankTabProps> = ({ client, ideas, onDeleteIdea, onAddIdea, onNewPost }) => {
  const [newIdeaText, setNewIdeaText] = useState('');

  const handleAddIdea = () => {
    if (!newIdeaText.trim()) return;
    onAddIdea(newIdeaText, client.id);
    setNewIdeaText('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
        <h3 className="text-lg font-bold text-slate-900">ספריית מדיה</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* TODO: Replace with actual media library items from database when implemented */}
          <div className="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[160px] col-span-2 md:col-span-3">
            <Image size={32} className="text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-500 mb-1">אין קבצים בספרייה</p>
            <p className="text-xs font-medium text-slate-400">העלה קבצים כדי להתחיל</p>
            </div>
          <button
            onClick={() => onAddIdea('', client.id)}
            className="aspect-square rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition-all gap-2"
          >
            <Upload size={24} />
            <span className="text-[10px] font-bold uppercase tracking-wider">בקרוב</span>
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6">
        <h3 className="text-lg font-bold text-slate-900">בנק רעיונות</h3>
        <div className="flex flex-col gap-4">
          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100/50">
            <textarea 
              value={newIdeaText} 
              onChange={e => setNewIdeaText(e.target.value)} 
              placeholder="רעיון למחר..." 
              className="w-full bg-transparent outline-none font-medium text-sm resize-none h-20 text-indigo-900 placeholder:text-indigo-400"
            />
            <button onClick={handleAddIdea} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm mt-2 transition-colors">שמור בבנק 💡</button>
          </div>
          <div className="flex flex-col gap-3 mt-2">
            {ideas.map(idea => (
              <div key={idea.id} className="p-4 bg-amber-50/80 rounded-2xl border border-amber-100 shadow-sm group">
                <p className="font-medium text-slate-800 text-sm leading-relaxed mb-3">{idea.text}</p>
                <div className="flex items-center justify-between pt-3 border-t border-amber-200/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{idea.createdAt}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onDeleteIdea(idea.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-white rounded-lg transition-colors"><Trash2 size={14}/></button>
                    <button onClick={() => onNewPost({ clientId: client.id, description: idea.text })} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 bg-white px-2 py-1.5 rounded-lg shadow-sm">הפוך לפוסט 🚀</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankTab;

