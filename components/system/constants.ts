'use client';

import React from 'react';
import { Lead, SystemStage, FieldAgent, Campaign, Student, Task, ContentItem, Invoice } from './types';
import { LayoutDashboard, Kanban, Settings, Users, ChartBar, Briefcase, Target, UserPlus, ClipboardList, Webhook, CalendarDays, Map, Bot, Megaphone, PhoneCall, Coffee, Clapperboard, GraduationCap, GraduationCap as School, CheckSquare, Lock, Headphones, Book, Network, Dumbbell, Wallet, Bell, FileText, Cpu, Database, ShoppingBag, Heart, FileInput, Building2, Layout, Zap, BarChart3, MessageSquare } from 'lucide-react';

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
      { id: 'tasks', label: 'משימות', icon: CheckSquare },
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
    title: 'מכירות',
    items: [
      { id: 'quotes', label: 'הצעות מחיר', icon: FileText },
      { id: 'finance', label: 'חשבוניות', icon: Wallet },
      { id: 'products', label: 'מוצרים', icon: ShoppingBag },
    ]
  },
  {
    title: 'ניהול מערכת',
    items: [
      { id: 'reports', label: 'דוחות', icon: BarChart3 },
      { id: 'analytics', label: 'אנליטיקס', icon: Cpu },
      { id: 'notifications', label: 'התראות', icon: Bell },
      { id: 'settings', label: 'הגדרות', icon: Settings },
    ]
  }
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

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
