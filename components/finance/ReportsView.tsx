'use client';

import React from 'react';
import { BarChart } from 'lucide-react';

const ReportsView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <BarChart className="mx-auto mb-4 text-emerald-500" size={48} />
      <h2 className="text-2xl font-bold mb-2">דוחות כספיים</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
    </div>
  );
};

export default ReportsView;

