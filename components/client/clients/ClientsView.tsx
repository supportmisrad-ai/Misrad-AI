'use client';

import React from 'react';
import { Users } from 'lucide-react';

const ClientsView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <Users className="mx-auto mb-4 text-amber-500" size={48} />
      <h2 className="text-2xl font-bold mb-2">ניהול לקוחות</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
    </div>
  );
};

export default ClientsView;

