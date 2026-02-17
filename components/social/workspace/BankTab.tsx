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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-8 bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <h3 className="text-2xl font-black">ספריית מדיה</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* TODO: Replace with actual media library items from database when implemented */}
          <div className="bg-slate-50/50 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[200px]">
            <Image size={48} className="text-slate-300 mb-4" />
            <p className="text-sm font-black text-slate-400 mb-2">אין קבצים בספרייה</p>
            <p className="text-xs font-bold text-slate-300">העלה קבצים כדי להתחיל</p>
            </div>
          <button className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-500 transition-all gap-2">
            <Upload size={32} />
            <span className="text-[10px] font-black uppercase">העלאת קובץ</span>
          </button>
        </div>
      </div>

      <div className="lg:col-span-4 bg-white p-10 rounded-[48px] border border-slate-200 shadow-xl flex flex-col gap-8">
        <h3 className="text-2xl font-black">בנק רעיונות</h3>
        <div className="flex flex-col gap-4">
          <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100">
            <textarea 
              value={newIdeaText} 
              onChange={e => setNewIdeaText(e.target.value)} 
              placeholder="רעיון למחר..." 
              className="w-full bg-transparent outline-none font-bold text-sm resize-none h-24 text-blue-900 placeholder:text-blue-300"
            />
            <button onClick={handleAddIdea} className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black text-xs shadow-lg shadow-blue-200 mt-2">שמור בבנק 💡</button>
          </div>
          <div className="flex flex-col gap-3 mt-4">
            {ideas.map(idea => (
              <div key={idea.id} className="p-5 bg-yellow-50 rounded-[28px] border border-yellow-100 shadow-sm group">
                <p className="font-bold text-slate-800 text-sm leading-relaxed mb-4">"{idea.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-slate-300 uppercase">{idea.createdAt}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onDeleteIdea(idea.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                    <button onClick={() => onNewPost({ clientId: client.id, description: idea.text })} className="text-[10px] font-black text-blue-600 hover:underline">הפוך לפוסט 🚀</button>
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

