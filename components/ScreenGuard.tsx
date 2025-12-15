
import React from 'react';
import { useData } from '../context/DataContext';
import { MaintenanceOverlay } from './MaintenanceOverlay';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

interface ScreenGuardProps {
    id: string; // Must match IDs in SYSTEM_SCREENS constant
    children: React.ReactNode;
}

export const ScreenGuard: React.FC<ScreenGuardProps> = ({ id, children }) => {
    const { organization, currentUser } = useData();
    const navigate = useNavigate();
    
    // Super Admins bypass all guards to allow configuration
    if (currentUser.isSuperAdmin) {
        return <>{children}</>;
    }

    const flag = organization.systemFlags?.[id] || 'active';

    if (flag === 'active') {
        return <>{children}</>;
    }

    if (flag === 'maintenance') {
        return <MaintenanceOverlay />;
    }

    if (flag === 'hidden') {
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
                <button onClick={() => navigate('/')} className="text-sm font-bold text-blue-600 hover:underline">
                    חזרה ללוח הבקרה
                </button>
            </div>
        );
    }

    return null;
};
