'use client';

import { Send, UserPlus } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

export default function ClientsHeaderActions() {
  const { setIsInviteModalOpen, setIsAddClientModalOpen } = useApp();

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <button
        onClick={() => setIsInviteModalOpen(true)}
        className="flex-1 p-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl shadow-md hover:shadow-lg transition-all text-right group relative overflow-hidden"
      >
        <div className="relative z-10 flex items-center gap-4">
          <Send className="text-white/90 group-hover:scale-110 transition-transform flex-shrink-0" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-black mb-1">שלח לינק הצטרפות</h3>
            <p className="text-sm text-white/80 font-bold">השיטה המהירה: שלח לינק בוואטסאפ והלקוח ימלא את כל הפרטים בעצמו.</p>
          </div>
        </div>
      </button>

      <button
        onClick={() => setIsAddClientModalOpen(true)}
        className="flex-1 p-6 bg-slate-800 text-white rounded-2xl shadow-md hover:shadow-lg transition-all text-right group relative overflow-hidden"
      >
        <div className="relative z-10 flex items-center gap-4">
          <UserPlus className="text-slate-300 group-hover:scale-110 transition-transform flex-shrink-0" size={24} />
          <div className="flex-1">
            <h3 className="text-lg font-black mb-1">הקמה ידנית</h3>
            <p className="text-sm text-slate-300 font-bold">אני רוצה להזין את כל הפרטים, ח.פ ותשלום עבור הלקוח כרגע.</p>
          </div>
        </div>
      </button>
    </div>
  );
}
