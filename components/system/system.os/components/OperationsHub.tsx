
import React, { useState } from 'react';
import { Student, FieldAgent, Lead } from '../types';
import { GraduationCap, Map, List } from 'lucide-react';
import DeliveryView from './DeliveryView';
import FieldManagementView from './FieldManagementView';

interface OperationsHubProps {
    students: Student[];
    leads: Lead[]; // Needed for Field Map
    onUpdateStudent?: (student: Student) => void;
}

const OperationsHub: React.FC<OperationsHubProps> = ({ students, leads, onUpdateStudent }) => {
  const [activeTab, setActiveTab] = useState<'delivery' | 'field'>('delivery');

  return (
    <div className="h-full flex flex-col">
        {/* Sub-Navigation */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 sticky top-0 z-30 shadow-sm">
            <div className="max-w-[1920px] mx-auto flex gap-6 overflow-x-auto no-scrollbar">
                {[
                    { id: 'delivery', label: 'ניהול תלמידים ופרויקטים', icon: GraduationCap },
                    { id: 'field', label: 'צוותי שטח (מפה)', icon: Map },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as 'delivery' | 'field')}
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
            {activeTab === 'delivery' && (
                <DeliveryView students={students} onUpdateStudent={onUpdateStudent} />
            )}
            {activeTab === 'field' && (
                <FieldManagementView leads={leads} />
            )}
        </div>
    </div>
  );
};

export default OperationsHub;
