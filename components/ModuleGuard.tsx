'use client';

import React from 'react';
import { useData } from '../context/DataContext';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getNexusBasePath, toNexusPath } from '@/lib/os/nexus-routing';
import type { ModuleId } from '../types';

interface ModuleGuardProps {
  moduleId: ModuleId;
  children: React.ReactNode;
}

export const ModuleGuard: React.FC<ModuleGuardProps> = ({ moduleId, children }) => {
  const { organization, currentUser } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getNexusBasePath(pathname);

  if (currentUser?.isSuperAdmin) {
    return <>{children}</>;
  }

  if (!organization?.enabledModules?.includes(moduleId)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} className="text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">הגישה נחסמה</h2>
        <p className="text-gray-500 mb-6 max-w-xs">מודול זה אינו זמין כרגע עבור סביבת העבודה.</p>
        <button
          onClick={() => router.push(toNexusPath(basePath, '/'))}
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          חזרה ללוח הבקרה
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
