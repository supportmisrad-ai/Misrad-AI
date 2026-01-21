'use client';

import React, { useState } from 'react';
import type { Task } from '../system/types';
import { Heart, Book, Activity, Lock, Building2, Users } from 'lucide-react';
import HRView from '../HRView';
import KnowledgeBaseView from '../KnowledgeBaseView';
import TrainingView from '../TrainingView';
import AssetsView from '../AssetsView';

type LeadLite = {
    id: string;
    name: string;
};

interface HeadquartersViewProps {
    onAddTask?: (task: Task) => void;
    leads?: LeadLite[];
}

const HeadquartersView: React.FC<HeadquartersViewProps> = ({ onAddTask, leads = [] }) => {
  const [activeTab, setActiveTab] = useState<'hr' | 'knowledge' | 'training' | 'assets'>('hr');

  return (
    <div className="h-full flex flex-col">
        {/* Sub-Navigation */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 sticky top-0 z-30 shadow-sm">
            <div className="max-w-[1920px] mx-auto flex gap-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'hr', label: 'צוות', icon: Users },
                    { id: 'knowledge', label: 'ידע', icon: Book },
                    { id: 'training', label: 'ניתוח שיחות', icon: Activity },
                    { id: 'assets', label: 'נכסים', icon: Lock },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 py-3 px-1 border-b-2 transition-all whitespace-nowrap text-base font-bold ${
                            activeTab === tab.id 
                            ? 'border-primary text-primary' 
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
            {activeTab === 'hr' && <HRView />}
            {activeTab === 'knowledge' && <KnowledgeBaseView onAddTask={onAddTask} />}
            {activeTab === 'training' && <TrainingView leads={leads} />}
            {activeTab === 'assets' && <AssetsView />}
        </div>
    </div>
  );
};

export default HeadquartersView;

