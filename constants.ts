import { Priority, WorkflowStage, Product, RoleDefinition, PermissionId, ScreenDefinition, PlatformDefinition, ContentStage } from './types';
import { UserPlus, Layers, Briefcase, File, Link as LinkIcon, Folder, BarChart2, Star, LifeBuoy, Settings } from 'lucide-react';

export const NAV_ITEMS = [
    { id: 'dashboard', label: 'דאשבורד', icon: BarChart2 },
    { id: 'leads', label: 'לידים', icon: UserPlus },
    { id: 'clients', label: 'לקוחות', icon: Briefcase },
    { id: 'tasks', label: 'משימות', icon: Layers },
    { id: 'assets', label: 'נכסים', icon: Folder },
    { id: 'favorites', label: 'מועדפים', icon: Star },
    { id: 'support', label: 'תמיכה', icon: LifeBuoy },
    { id: 'settings', label: 'הגדרות', icon: Settings },
];

export const QUICK_ASSETS = [
    { id: 'new_lead', label: 'ליד חדש', icon: UserPlus },
    { id: 'new_client', label: 'לקוח חדש', icon: Briefcase },
    { id: 'new_task', label: 'משימה חדשה', icon: Layers },
    { id: 'upload_file', label: 'העלאת קובץ', icon: File },
    { id: 'shareable_link', label: 'יצירת לינק', icon: LinkIcon },
];

export const SYSTEM_SCREENS: ScreenDefinition[] = [
    { id: 'dashboard', label: 'לוח בקרה ראשי', category: 'main' },
    { id: 'tasks', label: 'משימות', category: 'main' },
    { id: 'calendar', label: 'יומן', category: 'main' },
    { id: 'clients', label: 'לקוחות', category: 'main' },
    { id: 'team', label: 'ניהול צוות', category: 'main' },
    { id: 'reports', label: 'דוחות ומדדים', category: 'main' },
    { id: 'assets', label: 'נכסים וכספת', category: 'main' },
    { id: 'brain', label: 'Nexus AI', category: 'main' },
    { id: 'trash', label: 'סל מיחזור', category: 'main' },
    
    // Settings Tabs
    { id: 'settings_organization', label: 'הגדרות ארגון', category: 'settings' },
    { id: 'settings_audit', label: 'יומן אירועים', category: 'settings' },
    { id: 'settings_updates', label: 'עדכוני מערכת', category: 'settings' },
    { id: 'settings_requests', label: 'בקשות פיצ׳רים', category: 'settings' },
    { id: 'settings_integrations', label: 'אינטגרציות', category: 'settings' },
    { id: 'settings_team', label: 'ניהול משתמשים', category: 'settings' },
    { id: 'settings_goals', label: 'יעדים', category: 'settings' },
    { id: 'settings_products', label: 'מוצרים ומחירים', category: 'settings' },
    { id: 'settings_templates', label: 'תבניות ותהליכים', category: 'settings' },
    { id: 'settings_workflow', label: 'תהליכי עבודה', category: 'settings' },
    { id: 'settings_departments', label: 'מחלקות', category: 'settings' },
    { id: 'settings_roles', label: 'תפקידים והרשאות', category: 'settings' },
    { id: 'settings_data', label: 'גיבוי ושחזור', category: 'settings' },
];

// USERS, TASKS, CLIENTS, TENANTS, LEADS, ASSETS, TEMPLATES, CONTENT_ITEMS removed
// All data now comes from Supabase database. No mock data for production.

export const PERMISSIONS_LIST: { id: PermissionId; label: string; desc: string }[] = [
    { id: 'view_financials', label: 'צפייה בפיננסים', desc: 'גישה לכל החשבוניות, חיובים, הכנסות ויעדים' },
    { id: 'manage_team', label: 'ניהול צוות', desc: 'הוספה והסרה של משתמשים, דוחות נוכחות' },
    { id: 'manage_system', label: 'הגדרות מערכת', desc: 'עריכת תהליכים, תפקידים ואינטגרציות (Admin)' },
    { id: 'delete_data', label: 'מחיקת מידע', desc: 'מחיקה לצמיתות של משימות, לקוחות וקבצים' },
    { id: 'view_intelligence', label: 'גישה ל-AI', desc: 'שימוש בניתוחי Nexus Brain מתקדמים' },
    { id: 'view_crm', label: 'גישה ל-CRM', desc: 'צפייה וניהול לקוחות ולידים' },
    { id: 'view_assets', label: 'גישה לנכסים', desc: 'צפייה בקבצים, סיסמאות וארכיון מסמכים' },
];

export const DEFAULT_ROLE_DEFINITIONS: RoleDefinition[] = [
    {
        name: 'מנכ״ל',
        permissions: ['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets'],
        isSystem: true
    },
    {
        name: 'אדמין',
        permissions: ['view_financials', 'manage_team', 'manage_system', 'delete_data', 'view_intelligence', 'view_crm', 'view_assets'],
        isSystem: true
    },
    {
        name: 'סמנכ״ל מכירות',
        permissions: ['view_financials', 'view_intelligence', 'view_crm', 'view_assets', 'manage_team'],
    },
    {
        name: 'מנהלת שיווק',
        permissions: ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    },
    {
        name: 'איש מכירות',
        permissions: ['view_crm', 'view_intelligence'],
    },
    {
        name: 'מנהל אופרציה',
        permissions: ['manage_team', 'view_intelligence', 'view_assets', 'view_crm'],
    },
    {
        name: 'עובד שיווק',
        permissions: ['view_intelligence', 'view_assets'],
    },
    {
        name: 'אדמיניסטרציה',
        permissions: ['view_assets', 'view_crm', 'manage_team', 'view_financials'], 
    },
    {
        name: 'הנהלת חשבונות',
        permissions: ['view_financials', 'view_assets', 'view_crm'], 
    },
    {
        name: 'מנהל קהילה',
        permissions: ['view_crm', 'view_intelligence'],
    },
    {
        name: 'עובד',
        permissions: ['view_intelligence'], 
    },
    {
        name: 'פרילנסר',
        permissions: [], 
    }
];

export const DEFAULT_WORKFLOW: WorkflowStage[] = [
    { id: 'Backlog', name: 'רעיונות', color: 'bg-gray-100 text-gray-600 border-gray-300' },
    { id: 'To Do', name: 'לביצוע', color: 'bg-white text-gray-800 border-gray-300 ring-1 ring-gray-200' },
    { id: 'In Progress', name: 'בעבודה', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { id: 'Waiting for Review', name: 'ממתין לאישור', color: 'bg-orange-50 text-orange-700 border-orange-200' },
    { id: 'Done', name: 'בוצע', color: 'bg-green-100 text-green-800 border-green-300' },
];

// Translated Product Names with Features
export const DEFAULT_PRODUCTS: Product[] = [
    { 
        id: 'prod_saas_starter', 
        name: 'חבילת בסיס', 
        price: 199, 
        color: 'bg-gray-500 text-white',
        modules: ['crm', 'team'],
        maxUsers: 5,
        maxStorageGB: 10,
        maxClients: 50,
        maxTasks: 500,
        maxLeads: 100,
        maxApiCalls: 1000,
        maxIntegrations: 2,
        allowCustomBranding: false,
        allowApiAccess: false,
        allowWebhooks: false,
        allowExport: false,
        allowAdvancedReports: false,
        allowAiFeatures: false,
        allowPrioritySupport: false,
        features: ['CRM בסיסי', 'ניהול צוות עד 5 משתמשים', '10GB אחסון', 'עד 50 לקוחות']
    },
    { 
        id: 'prod_saas_pro', 
        name: 'חבילת פרו', 
        price: 499, 
        color: 'bg-blue-600 text-white',
        modules: ['crm', 'finance', 'team', 'ai'],
        maxUsers: 20,
        maxStorageGB: 100,
        maxClients: 500,
        maxTasks: 5000,
        maxLeads: 1000,
        maxApiCalls: 10000,
        maxIntegrations: 5,
        allowCustomBranding: true,
        allowApiAccess: true,
        allowWebhooks: true,
        allowExport: true,
        allowAdvancedReports: true,
        allowAiFeatures: true,
        allowPrioritySupport: false,
        features: ['כל התכונות של בסיס', 'כספים ודוחות', 'Nexus AI', 'עד 20 משתמשים', '100GB אחסון', 'מותאם אישית', 'API access']
    },
    { 
        id: 'prod_saas_ent', 
        name: 'חבילת ארגונים', 
        price: 1500, 
        color: 'bg-purple-600 text-white',
        modules: ['crm', 'finance', 'team', 'ai', 'content'],
        maxUsers: 999,
        maxStorageGB: 1000,
        maxClients: undefined, // Unlimited
        maxTasks: undefined,
        maxLeads: undefined,
        maxApiCalls: undefined,
        maxIntegrations: undefined,
        allowCustomBranding: true,
        allowApiAccess: true,
        allowWebhooks: true,
        allowExport: true,
        allowAdvancedReports: true,
        allowAiFeatures: true,
        allowPrioritySupport: true,
        features: ['כל התכונות', 'משתמשים ללא הגבלה', '1TB אחסון', 'תמיכה 24/7', 'API מותאם אישית', 'Webhooks', 'דוחות מתקדמים']
    },
];







// Fallback status colors if not found in workflow settings
export const STATUS_COLORS: Record<string, string> = {
  'Backlog': 'bg-gray-100 text-gray-600 border-gray-300',
  'To Do': 'bg-white text-gray-800 border-gray-300 ring-1 ring-gray-200',
  'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  'Waiting for Review': 'bg-orange-50 text-orange-700 border-orange-200', 
  'Done': 'bg-green-100 text-green-800 border-green-300 font-medium', 
  'Canceled': 'bg-red-50 text-red-700 border-red-200',
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.LOW]: 'text-gray-500 bg-gray-100 border-gray-200',
  [Priority.MEDIUM]: 'text-orange-700 bg-orange-50 border-orange-200',
  [Priority.HIGH]: 'text-red-600 bg-red-50 border-red-200 font-medium',
  [Priority.URGENT]: 'text-white bg-red-600 border-red-700 font-bold shadow-sm', 
};

export const PRIORITY_LABELS: Record<Priority, string> = {
    [Priority.LOW]: 'נמוכה',
    [Priority.MEDIUM]: 'רגילה',
    [Priority.HIGH]: 'גבוהה',
    [Priority.URGENT]: 'דחופה',
};

export const DEFAULT_PLATFORMS: PlatformDefinition[] = [
    { id: 'Youtube', label: 'יוטיוב', icon: 'Youtube', color: 'text-red-600' },
    { id: 'Instagram', label: 'אינסטגרם', icon: 'Instagram', color: 'text-pink-600' },
    { id: 'Facebook', label: 'פייסבוק', icon: 'Facebook', color: 'text-blue-600' },
    { id: 'Linkedin', label: 'לינקדאין', icon: 'Linkedin', color: 'text-blue-700' },
    { id: 'TikTok', label: 'טיקטוק', icon: 'Music2', color: 'text-black' },
    { id: 'Website', label: 'אתר', icon: 'Globe', color: 'text-slate-600' },
    { id: 'Newsletter', label: 'ניוזלטר', icon: 'Mail', color: 'text-orange-500' },
];

export const DEFAULT_CONTENT_STAGES: ContentStage[] = [
    { id: 'idea', name: 'מאגר רעיונות', color: 'bg-yellow-100', tagTrigger: 'רעיון' },
    { id: 'script', name: 'כתיבת תסריט', color: 'bg-blue-100', tagTrigger: 'תסריט' },
    { id: 'filming', name: 'צילום', color: 'bg-red-100', tagTrigger: 'צילום' },
    { id: 'editing', name: 'עריכה', color: 'bg-purple-100', tagTrigger: 'עריכה' },
    { id: 'review', name: 'ביקורת ואישור', color: 'bg-orange-100', tagTrigger: 'ביקורת' },
    { id: 'scheduled', name: 'מוכן לפרסום', color: 'bg-green-100', tagTrigger: 'מוכן' },
];

