'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

const SessionsView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <Calendar className="mx-auto mb-4 text-[#C5A572]" size={48} />
      <h2 className="text-2xl font-bold mb-2">ניהול פגישות</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
      <p className="text-sm text-slate-400 mt-2">כולל תמלול פגישות ותובנות אוטומטיות</p>
    </div>
  );
};

export default SessionsView;

