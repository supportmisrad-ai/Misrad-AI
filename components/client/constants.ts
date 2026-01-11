import { Client, Session, Group, Program, ClientInsight } from '../../types/client';

// Mock data for Client OS
export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_SESSIONS: Session[] = [];

export const INITIAL_GROUPS: Group[] = [];

export const INITIAL_PROGRAMS: Program[] = [];

export const INITIAL_INSIGHTS: ClientInsight[] = [];

// Navigation items for Client OS
export const CLIENT_NAV_ITEMS = [
  {
    id: 'clients',
    label: 'לקוחות',
    icon: 'Users',
    description: 'ניהול לקוחות'
  },
  {
    id: 'sessions',
    label: 'פגישות',
    icon: 'Calendar',
    description: 'ניהול פגישות ותמלולים'
  },
  {
    id: 'groups',
    label: 'קבוצות',
    icon: 'Users',
    description: 'ניהול קבוצות'
  },
  {
    id: 'programs',
    label: 'תוכניות',
    icon: 'BookOpen',
    description: 'תוכניות אימון'
  },
  {
    id: 'insights',
    label: 'תובנות',
    icon: 'Lightbulb',
    description: 'תובנות ומשובים'
  },
  {
    id: 'portal',
    label: 'פורטל לקוח',
    icon: 'Globe',
    description: 'פורטל לקוחות'
  }
];

