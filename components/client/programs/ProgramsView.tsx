'use client';

import React from 'react';
import { BookOpen } from 'lucide-react';

const ProgramsView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <BookOpen className="mx-auto mb-4 text-[#C5A572]" size={48} />
      <h2 className="text-2xl font-bold mb-2">תוכניות אימון</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
    </div>
  );
};

export default ProgramsView;

