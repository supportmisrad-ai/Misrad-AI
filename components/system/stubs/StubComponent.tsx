'use client';

import React from 'react';

// Generic stub component for components that haven't been converted yet
export const StubComponent: React.FC<{ name: string; [key: string]: any }> = ({ name, ...props }) => {
  return (
    <div className="p-8 text-center">
      <div className="bg-slate-100 rounded-xl p-6 max-w-md mx-auto">
        <h3 className="text-lg font-bold text-slate-700 mb-2">{name}</h3>
        <p className="text-sm text-slate-500">רכיב זה עדיין לא הומר. יומר בקרוב.</p>
      </div>
    </div>
  );
};

