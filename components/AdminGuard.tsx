'use client';

import { isSuperAdminEmail } from '@/lib/constants/roles';
import React from 'react';
import { useData } from '../context/DataContext';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getNexusBasePath, toNexusPath } from '@/lib/os/nexus-routing';

interface AdminGuardProps {
  children: React.ReactNode;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children }) => {
  const { currentUser } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const basePath = getNexusBasePath(pathname);

  const normalizedRole = String(currentUser?.role || '').trim().toLowerCase();
  const isAuditServiceRole =
    normalizedRole === 'audit_service' || normalizedRole === 'audit-service' || normalizedRole === 'audit service';
  const isLogsPage = String(pathname || '').startsWith('/app/admin/logs');

  const isSuperAdmin = currentUser?.isSuperAdmin || isSuperAdminEmail(currentUser?.email);

  // Check if user is Super Admin
  if (!isSuperAdmin) {
    if (isAuditServiceRole && isLogsPage) {
      return <>{children}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ShieldAlert size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">גישה נדחתה</h2>
        <p className="text-gray-500 mb-6 max-w-md">
          רק מנהלי מערכת (Super Admin) יכולים לגשת לדף זה.
        </p>
        {isAuditServiceRole ? (
          <button
            onClick={() => router.push('/app/admin/logs')}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            חזרה ללוגים
          </button>
        ) : (
          <button
            onClick={() => router.push(toNexusPath(basePath, '/'))}
            className="text-sm font-bold text-blue-600 hover:underline"
          >
            חזרה ללוח הבקרה
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
};

