'use client';

import React from 'react';
import { FileText } from 'lucide-react';

const InvoicesView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <FileText className="mx-auto mb-4 text-emerald-500" size={48} />
      <h2 className="text-2xl font-bold mb-2">ניהול חשבוניות</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
    </div>
  );
};

export default InvoicesView;

