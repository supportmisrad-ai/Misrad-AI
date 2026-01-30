
import { Lead, PipelineStage, FieldAgent, Campaign, Student, Task, ContentItem, Invoice } from './types';
import { LayoutDashboard, Kanban, Settings, Users, ChartBar, Briefcase, Target, UserPlus, ClipboardList, Webhook, CalendarDays, Map, Bot, Megaphone, PhoneCall, Coffee, Clapperboard, GraduationCap, GraduationCap as School, CheckSquare, Lock, Headphones, Book, Network, Dumbbell, Wallet, Bell, FileText, Cpu, Database, ShoppingBag, Heart, FileInput, Building2, Layout, Zap, BarChart3, MessageSquare } from 'lucide-react';

export const STAGES: { id: PipelineStage; label: string; color: string; accent: string }[] = [
  { id: 'incoming', label: 'נכנס', color: 'border-slate-200', accent: 'bg-slate-400' }, 
  { id: 'contacted', label: 'דיברנו', color: 'border-slate-200', accent: 'bg-slate-500' }, 
  { id: 'meeting', label: 'יש פגישה', color: 'border-indigo-100', accent: 'bg-indigo-600' }, 
  { id: 'proposal', label: 'קיבל הצעה', color: 'border-indigo-200', accent: 'bg-indigo-800' }, 
  { id: 'negotiation', label: 'במו"מ', color: 'border-amber-100', accent: 'bg-amber-600' }, 
  { id: 'won', label: 'סגור!', color: 'border-emerald-100', accent: 'bg-emerald-600' }, 
  { id: 'lost', label: 'לא רלוונטי', color: 'border-gray-100', accent: 'bg-gray-400' }, 
  { id: 'churned', label: 'בוטל / נטישה', color: 'border-red-100', accent: 'bg-red-500' }, 
];

export const NAV_GROUPS = [
  {
    title: '',
    items: [
      { id: 'workspace', label: 'השולחן שלי', icon: Layout }, 
    ]
  },
  {
    title: 'מכירות',
    items: [
      { id: 'sales_pipeline', label: 'לוח עבודה', icon: Kanban }, 
      { id: 'sales_leads', label: 'לידים', icon: Users }, 
      { id: 'calendar', label: 'אירועים ופגישות', icon: CalendarDays }, 
      { id: 'comms', label: 'דואר נכנס', icon: MessageSquare }, 
      { id: 'tasks', label: 'משימות שוטפות', icon: CheckSquare }, 
    ]
  },
  {
    title: 'שיווק',
    items: [
      { id: 'mkt_campaigns', label: 'קמפיינים', icon: Megaphone }, 
      { id: 'mkt_content', label: 'תוכן', icon: Clapperboard }, 
      { id: 'mkt_forms', label: 'טפסים', icon: FileInput }, 
      { id: 'mkt_partners', label: 'שתפ"ים', icon: Network }, 
    ]
  },
  {
    title: 'אופרציה',
    items: [
      { id: 'finance', label: 'כספים', icon: Wallet }, 
      { id: 'operations', label: 'תפעול', icon: Map }, 
    ]
  },
  {
    title: 'מטה',
    items: [
      { id: 'reports', label: 'דוחות', icon: BarChart3 },
      { id: 'headquarters', label: 'ניהול', icon: Building2 }, 
      { id: 'system', label: 'הגדרות', icon: Cpu }, 
    ]
  }
];

export const NAV_ITEMS = NAV_GROUPS.flatMap(group => group.items);

export const QUICK_ASSETS: Array<{ id: string; label: string; value: string; type: 'link' | 'text' }> = [];

const subMinutes = (minutes: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d;
};

const subDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d;
  };

const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
  };

export const INITIAL_LEADS: Lead[] = [
  
];

export const INITIAL_AGENTS: FieldAgent[] = [
  
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  
];

export const INITIAL_STUDENTS: Student[] = [
    
];

export const INITIAL_TASKS: Task[] = [
    
];

export const INITIAL_CONTENT: ContentItem[] = [
    
];

export const INITIAL_INVOICES: Invoice[] = [
    
];
