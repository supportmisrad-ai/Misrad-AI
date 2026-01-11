import { NavItem } from '../../types';
import { Home, CheckSquare, Calendar, Briefcase, Users, PieChart, FolderOpen, Trash2, Settings, Atom } from 'lucide-react';

// Updated with module links and screen IDs
export const NAV_ITEMS: NavItem[] = [
  { label: 'לוח בקרה', path: '/', icon: Home, screenId: 'dashboard' }, 
  { label: 'משימות', path: '/tasks', icon: CheckSquare, screenId: 'tasks' }, 
  { label: 'יומן', path: '/calendar', icon: Calendar, screenId: 'calendar' }, 
  { label: 'לקוחות', path: '/clients', icon: Briefcase, moduleId: 'crm', screenId: 'clients' }, 
  { label: 'ניהול צוות', path: '/team', icon: Users, moduleId: 'team', screenId: 'team' },
  { label: 'דוחות ומדדים', path: '/reports', icon: PieChart, moduleId: 'finance', screenId: 'reports' }, 
  { label: 'נכסים ותיקיות', path: '/assets', icon: FolderOpen, screenId: 'assets' },
  { label: 'סל מיחזור', path: '/trash', icon: Trash2, screenId: 'trash' },
  { label: 'הגדרות ופיצ׳רים', path: '/settings', icon: Settings }, 
  { label: 'Nexus AI', path: '/brain', icon: Atom, moduleId: 'ai', screenId: 'brain' },
];

// Define primary navigation paths to determine where to place the separator
export const PRIMARY_NAV_PATHS = ['/', '/tasks', '/calendar', '/clients'];

export const getMobileGridStyles = (path: string, isActive: boolean) => {
    if (isActive) return 'bg-slate-800 text-white shadow-xl scale-105 ring-2 ring-slate-700/30';
    switch (path) {
        case '/': return 'bg-slate-100 text-slate-600';
        case '/tasks': return 'bg-blue-50 text-blue-600';
        case '/clients': return 'bg-emerald-50 text-emerald-600';
        case '/calendar': return 'bg-red-50 text-red-600';
        case '/team': return 'bg-purple-50 text-purple-600';
        case '/reports': return 'bg-indigo-50 text-indigo-600';
        case '/assets': return 'bg-teal-50 text-teal-600';
        case '/trash': return 'bg-rose-50 text-rose-600';
        case '/settings': return 'bg-slate-200 text-slate-700';
        case '/brain': return 'bg-indigo-50 text-indigo-600'; 
        default: return 'bg-gray-50 text-gray-500';
    }
};

