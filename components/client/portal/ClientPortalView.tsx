'use client';

import React from 'react';
import { Globe } from 'lucide-react';

const ClientPortalView: React.FC = () => {
  return (
    <div className="p-8 text-center">
      <Globe className="mx-auto mb-4 text-amber-500" size={48} />
      <h2 className="text-2xl font-bold mb-2">פורטל לקוח</h2>
      <p className="text-slate-500">פיצ'ר זה יגיע בקרוב...</p>
      <p className="text-sm text-slate-400 mt-2">קבצים, משימות ושיעורי בית</p>
    </div>
  );
};

export default ClientPortalView;

