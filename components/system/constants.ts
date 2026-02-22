'use client';

import React from 'react';
import { Lead, SystemStage, FieldAgent, Campaign, Student, Task, ContentItem, Invoice } from './types';
import { LayoutDashboard, Kanban, Settings, Users, ChartBar, Briefcase, Target, UserPlus, ClipboardList, Webhook, CalendarDays, Map, Bot, Megaphone, PhoneCall, Coffee, Clapperboard, GraduationCap, GraduationCap as School, SquareCheck, Lock, Headphones, Book, Network, Dumbbell, Wallet, Bell, FileText, Cpu, Database, ShoppingBag, Heart, FileInput, Building2, Layout, Zap, BarChart3, MessageSquare } from 'lucide-react';

type NavItem = { id: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

export const STAGES: { id: SystemStage; label: string; color: string; accent: string }[] = [
  { id: 'incoming', label: 'נכנס', color: 'border-slate-200', accent: 'bg-slate-400' }, 
  { id: 'contacted', label: 'דיברנו', color: 'border-slate-200', accent: 'bg-slate-500' }, 
  { id: 'meeting', label: 'יש פגישה', color: 'border-indigo-100', accent: 'bg-indigo-600' }, 
  { id: 'proposal', label: 'קיבל הצעה', color: 'border-indigo-200', accent: 'bg-indigo-800' }, 
  { id: 'negotiation', label: 'במו"מ', color: 'border-amber-100', accent: 'bg-amber-600' }, 
  { id: 'won', label: 'סגור!', color: 'border-emerald-100', accent: 'bg-emerald-600' }, 
  { id: 'lost', label: 'לא רלוונטי', color: 'border-gray-100', accent: 'bg-gray-400' }, 
  { id: 'churned', label: 'בוטל / נטישה', color: 'border-red-100', accent: 'bg-red-500' }, 
];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'ליבה',
    items: [
      { id: 'workspace', label: 'לוח בקרה', icon: LayoutDashboard },
      { id: 'sales_pipeline', label: 'לידים', icon: Users },
      { id: 'tasks', label: 'משימות', icon: SquareCheck },
      { id: 'calendar', label: 'אירועים', icon: CalendarDays },
    ]
  },
  {
    title: 'תקשורת',
    items: [
      { id: 'dialer', label: 'חייגן', icon: PhoneCall },
    ]
  },
  {
    title: 'כלים',
    items: [
      { id: 'forms', label: 'טפסים', icon: FileInput },
      { id: 'automations', label: 'אוטומציות', icon: Zap },
      { id: 'call_analyzer', label: 'ניתוח שיחות', icon: PhoneCall },
      { id: 'partners', label: 'שותפים', icon: Users },
      { id: 'teams', label: 'צוותי מכירות', icon: Network },
      { id: 'field_map', label: 'צוותי שטח', icon: Map },
    ]
  },
  {
    title: 'ניהול מערכת',
    items: [
      { id: 'analytics', label: 'דוחות ונתונים', icon: BarChart3 },
      { id: 'settings', label: 'הגדרות', icon: Settings },
    ]
  }
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export const QUICK_ASSETS: Array<{ id: string; label: string; value: string; type: 'link' | 'text' }> = [];

export const INITIAL_LEADS: Lead[] = [];

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
