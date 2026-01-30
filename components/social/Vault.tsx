'use client';

import React, { useState } from 'react';
import { Search, Plus, Zap, Trash2, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/contexts/AppContext';
import { Idea } from '@/types/social';
import { Avatar } from '@/components/Avatar';
import { getSocialBasePath, joinPath } from '@/lib/os/social-routing';

export default function Vault() {
  const router = useRouter();
  const pathname = usePathname();
  const { clients, setActiveDraft } = useApp();
  const [selectedClient, setSelectedClient] = useState(clients[0]);
  const [activeTab, setActiveTab] = useState<'assets' | 'dna' | 'ideas' | 'connections'>('assets');
  const [newIdeaText, setNewIdeaText] = useState('');
  const [ideas, setIdeas] = useState<Idea[]>([]);

  const handleAddIdea = () => {
    if (!newIdeaText || !selectedClient) return;
    const newIdea: Idea = {
      id: `idea-${Date.now()}`,
      clientId: selectedClient.id,
      text: newIdeaText,
      createdAt: new Date().toISOString()
    };
    setIdeas([...ideas, newIdea]);
    setNewIdeaText('');
  };

  const handleIdeaToPost = (idea: Idea) => {
    setActiveDraft({
      id: `draft-${Date.now()}`,
      clientId: idea.clientId,
      title: idea.title || idea.text || '',
      description: idea.description || idea.text || '',
      type: 'gap',
      draftContent: idea.text,
      createdAt: new Date().toISOString()
    } as any);
    const basePath = getSocialBasePath(pathname);
    router.push(joinPath(basePath, '/machine'));
  };

  if (!selectedClient) return null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 pb-20" dir="rtl">
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <h3 className="text-xl font-extrabold">לקוחות</h3>
        <div className="bg-white rounded-3xl border shadow-sm">
          {clients.map(client => (
            <button
              key={client.id}
              onClick={() => setSelectedClient(client)}
              className={`p-4 flex items-center gap-3 w-full text-right transition-all border-b last:border-0 ${selectedClient.id === client.id ? 'bg-blue-50 border-r-4 border-r-blue-600' : 'hover:bg-slate-50'}`}
            >
              <Avatar
                src={String(client.avatar || '')}
                name={String(client.companyName || client.name || '')}
                alt={String(client.companyName || '')}
                size="lg"
                rounded="xl"
              />
              <p className="text-sm font-extrabold">{client.companyName}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-8">
        <div className="flex bg-slate-100 p-1.5 rounded-2xl self-start">
          {['assets', 'dna', 'ideas', 'connections'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 rounded-xl text-sm font-extrabold transition-all ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              {tab === 'assets' ? 'מדיה' : tab === 'dna' ? 'DNA' : tab === 'ideas' ? 'רעיונות' : 'חיבורים'}
            </button>
          ))}
        </div>

        {activeTab === 'ideas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
            {ideas.filter(i => i.clientId === selectedClient.id).map(idea => (
              <div key={idea.id} className="bg-yellow-50 p-6 rounded-2xl border border-yellow-100 shadow-sm">
                <p className="text-slate-800 font-bold leading-relaxed">{idea.text}</p>
                <div className="mt-4 flex justify-between items-center border-t pt-3">
                  <span className="text-[10px] text-slate-400">{new Date(idea.createdAt).toLocaleDateString('he-IL')}</span>
                  <button onClick={() => handleIdeaToPost(idea)} className="text-xs font-black text-blue-600">הפוך לפוסט 🚀</button>
                </div>
              </div>
            ))}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-slate-200 flex gap-2">
              <input
                value={newIdeaText}
                onChange={e => setNewIdeaText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddIdea()}
                placeholder="רעיון חדש..."
                className="flex-1 bg-transparent outline-none font-bold text-sm"
              />
              <button onClick={handleAddIdea} className="p-2 bg-blue-600 text-white rounded-lg"><Plus size={18}/></button>
            </div>
          </div>
        )}

        {activeTab === 'dna' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="bg-white p-8 rounded-3xl border shadow-sm">
              <h4 className="text-lg font-extrabold mb-6 flex items-center gap-2"><Zap size={20}/> DNA</h4>
              {Object.entries(selectedClient.dna.voice).map(([key, val]) => (
                <div key={key} className="mb-6">
                  <p className="text-sm font-bold mb-2 uppercase">{key}</p>
                  <div className="h-2 bg-slate-100 rounded-full"><div className="h-full bg-blue-600 rounded-full" style={{ width: `${val}%` }}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in">
            {/* TODO: Replace with actual media library items from database when implemented */}
            <div className="col-span-2 md:col-span-4 bg-slate-50/50 p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center min-h-[200px]">
              <Search size={48} className="text-slate-300 mb-4" />
              <p className="text-sm font-black text-slate-400 mb-2">אין קבצים בספריית המדיה</p>
              <p className="text-xs font-bold text-slate-300">העלה קבצים כדי להתחיל</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

