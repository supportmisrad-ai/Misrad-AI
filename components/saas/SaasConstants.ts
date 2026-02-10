import { LayoutGrid, DollarSign, Sparkles, Users, PenTool, FolderOpen, Settings } from 'lucide-react';

export const MODULES_CONFIG = [
    { id: 'crm', label: 'CRM & Sales', icon: LayoutGrid, color: 'text-emerald-500' },
    { id: 'finance', label: 'כספים ודוחות', icon: DollarSign, color: 'text-green-500' },
    { id: 'ai', label: 'Nexus AI', icon: Sparkles, color: 'text-indigo-500' },
    { id: 'team', label: 'ניהול עובדים', icon: Users, color: 'text-orange-500' },
    { id: 'content', label: 'תוכן וסושיאל', icon: PenTool, color: 'text-sky-600' },
    { id: 'assets', label: 'נכסים וכספת', icon: FolderOpen, color: 'text-slate-700' },
    { id: 'operations', label: 'תפעול ותהליכים', icon: Settings, color: 'text-purple-600' },
];
