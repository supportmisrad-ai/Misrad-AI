import { Invoice, Integration } from '../../types/finance';

// Mock data for Finance OS
export const INITIAL_INVOICES: Invoice[] = [];

export const INITIAL_INTEGRATIONS: Integration[] = [
  {
    id: '1',
    type: 'green_invoice',
    name: 'חשבונית ירוקה',
    isConnected: false,
    isActive: false
  },
  {
    id: '2',
    type: 'morning',
    name: 'מורנינג',
    isConnected: false,
    isActive: false
  }
];

// Navigation items for Finance OS
export const FINANCE_NAV_ITEMS = [
  {
    id: 'overview',
    label: 'סקירה כללית',
    icon: 'TrendingUp',
    description: 'דשבורד כספי'
  },
  {
    id: 'invoices',
    label: 'חשבוניות',
    icon: 'FileText',
    description: 'ניהול חשבוניות'
  },
  {
    id: 'reports',
    label: 'דוחות',
    icon: 'BarChart',
    description: 'דוחות כספיים'
  },
  {
    id: 'integrations',
    label: 'אינטגרציות',
    icon: 'Plug',
    description: 'חיבור למערכות חיצוניות'
  },
  {
    id: 'settings',
    label: 'הגדרות',
    icon: 'Settings',
    description: 'הגדרות כספיות'
  }
];

