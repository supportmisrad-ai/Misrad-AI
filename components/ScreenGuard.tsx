'use client';

import React from 'react';
import { useData } from '../context/DataContext';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import { usePathname, useRouter } from 'next/navigation';
import { ShieldAlert } from 'lucide-react';
import { getNexusBasePath, toNexusPath } from '@/lib/os/nexus-routing';

interface ScreenGuardProps {
    id: string; // Must match IDs in SYSTEM_SCREENS constant
    children: React.ReactNode;
}

export const ScreenGuard: React.FC<ScreenGuardProps> = ({ id, children }) => {
    const { organization, currentUser } = useData();
    const router = useRouter();
    const pathname = usePathname();
    const basePath = getNexusBasePath(pathname);
    
    const flag = organization.systemFlags?.[id] || 'active';
    
    // Super Admins can see maintenance mode but can still access (for configuration)
    // Regular users see maintenance overlay
    if (flag === 'maintenance' && !currentUser.isSuperAdmin) {
        return <MaintenanceOverlay />;
    }
    
    // Super Admins bypass hidden screens to allow configuration
    if (flag === 'hidden' && !currentUser.isSuperAdmin) {
        // Render Access Denied or redirect
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <ShieldAlert size={32} className="text-gray-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">הגישה נחסמה</h2>
                <p className="text-gray-500 mb-6 max-w-xs">
                    מסך זה אינו זמין כרגע בהגדרות המערכת.
                </p>
                <button onClick={() => router.push(toNexusPath(basePath, '/'))} className="text-sm font-bold text-blue-600 hover:underline">
                    חזרה ללוח הבקרה
                </button>
            </div>
        );
    }
    
    // Active or Super Admin - show content
    if (flag === 'active' || currentUser.isSuperAdmin) {
        return <>{children}</>;
    }

    return null;
};
