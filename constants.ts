
import { Priority, Task, User, Template, Asset, Client, Lead, LeadStatus, WorkflowStage, Product, RoleDefinition, PermissionId, Tenant, ScreenDefinition, PlatformDefinition, ContentStage, ContentItem } from './types';
import { Video, UserPlus, Layers, FileText } from 'lucide-react';

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

export const USERS: User[] = [
  { id: '1', name: 'איתמר', role: 'מנכ״ל', department: 'הנהלה', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 10, targets: { tasksMonth: 10 }, email: 'itamar@nexus-os.co', phone: '050-1111111', location: 'תל אביב', bio: 'מייסד ומנכ״ל החברה. מתמקד באסטרטגיה, פיתוח עסקי וחזון ארוך טווח.', isSuperAdmin: true, paymentType: 'monthly', monthlySalary: 30000, accumulatedBonus: 2500 },
  { id: '2', name: 'גיא כהן', role: 'סמנכ״ל מכירות', department: 'מכירות', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 8, targets: { tasksMonth: 15, leadsMonth: 10 }, email: 'guy@nexus-os.co', phone: '052-2222222', location: 'רמת גן', bio: 'אחראי על מחלקת המכירות וניהול קשרי לקוחות אסטרטגיים.', paymentType: 'monthly', monthlySalary: 20000, commissionPct: 10, streakDays: 5, pendingReward: { reason: 'עבר את יעד המכירות ב-120%', suggestedBonus: 500, type: 'sales' }, accumulatedBonus: 1200 },
  { id: '3', name: 'ירדן', role: 'מנהל אופרציה', department: 'תפעול', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 6, targets: { tasksMonth: 30 }, email: 'yarden@nexus-os.co', phone: '053-3333333', location: 'הרצליה', bio: 'מנהל את פס הייצור של התוכן ואת האופרציה השוטפת של המשרד.', paymentType: 'monthly', monthlySalary: 15000, bonusPerTask: 20, accumulatedBonus: 400 },
  { id: '4', name: 'מיכאל ג׳ונסון', role: 'מנהל קהילה', department: 'תפעול', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: false, capacity: 5, targets: { tasksMonth: 20 }, email: 'michael@nexus-os.co', phone: '054-4444444', paymentType: 'hourly', hourlyRate: 80, bonusPerTask: 15, accumulatedBonus: 150 },
  { id: '5', name: 'רוני קליין', role: 'אדמיניסטרציה', department: 'תפעול', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: false, capacity: 4, targets: { tasksMonth: 40 }, email: 'roni@nexus-os.co', phone: '055-5555555', paymentType: 'hourly', hourlyRate: 60, accumulatedBonus: 0 },
  // New Users for Demo
  { id: '6', name: 'דנה כספי', role: 'הנהלת חשבונות', department: 'כספים', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 5, targets: { tasksMonth: 15 }, email: 'dana@nexus-os.co', phone: '050-6666666', paymentType: 'hourly', hourlyRate: 120 },
  { id: '7', name: 'עומר לוי', role: 'איש מכירות', department: 'מכירות', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: false, capacity: 10, targets: { tasksMonth: 20, leadsMonth: 25 }, email: 'omer@nexus-os.co', paymentType: 'monthly', monthlySalary: 12000, commissionPct: 15, accumulatedBonus: 3000 },
  { id: '8', name: 'נועה שחר', role: 'עובד', department: 'תפעול', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 8, targets: { tasksMonth: 25 }, email: 'noa@nexus-os.co', paymentType: 'hourly', hourlyRate: 50, bonusPerTask: 10, streakDays: 12, pendingReward: { reason: 'רצף של 12 יום ללא איחור', suggestedBonus: 100, type: 'consistency' }, accumulatedBonus: 200 },
  { id: '9', name: 'אלכס פרי', role: 'פרילנסר', department: 'חיצוני', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: false, capacity: 3, targets: { tasksMonth: 5 }, email: 'alex@freelance.co', paymentType: 'hourly', hourlyRate: 250 },
  { id: '10', name: 'שירה לב', role: 'מנהלת שיווק', department: 'שיווק', avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: true, capacity: 8, targets: { tasksMonth: 15 }, email: 'shira@nexus-os.co', paymentType: 'monthly', monthlySalary: 18000, bio: 'מנהלת מחלקת השיווק. אחראית על צוות הקריאייטיב והקמפיינים.' },
  { id: '11', name: 'עידו פלג', role: 'עובד שיווק', department: 'שיווק', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80', online: false, capacity: 10, targets: { tasksMonth: 25 }, email: 'ido@nexus-os.co', paymentType: 'hourly', hourlyRate: 60 }
];

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

// Translated Product Names
export const DEFAULT_PRODUCTS: Product[] = [
    { id: 'prod_saas_starter', name: 'חבילת בסיס', price: 199, color: 'bg-gray-500 text-white' },
    { id: 'prod_saas_pro', name: 'חבילת פרו', price: 499, color: 'bg-blue-600 text-white' },
    { id: 'prod_saas_ent', name: 'חבילת ארגונים', price: 1500, color: 'bg-purple-600 text-white' },
];

export const TENANTS: Tenant[] = [
    {
        id: 'T-101',
        name: 'סטודיו עיצוב בע״מ',
        ownerEmail: 'sarah@design.co.il',
        subdomain: 'design-studio',
        plan: 'חבילת פרו',
        status: 'Active',
        joinedAt: '2023-08-15',
        mrr: 499,
        usersCount: 5,
        logo: 'https://ui-avatars.com/api/?name=DS&background=6366f1&color=fff',
        modules: ['crm', 'finance', 'ai'],
        region: 'il-central'
    },
    {
        id: 'T-102',
        name: 'משרד עו״ד כהן',
        ownerEmail: 'office@cohen.law',
        subdomain: 'cohen-law',
        plan: 'חבילת ארגונים',
        status: 'Active',
        joinedAt: '2023-09-01',
        mrr: 1500,
        usersCount: 15,
        logo: 'https://ui-avatars.com/api/?name=CA&background=10b981&color=fff',
        modules: ['crm', 'finance', 'ai', 'team'],
        region: 'il-central'
    },
    {
        id: 'T-103',
        name: 'סטארטאפ ניישן',
        ownerEmail: 'dan@startup.io',
        subdomain: 'startup-nation',
        plan: 'חבילת בסיס',
        status: 'Trial',
        joinedAt: '2023-11-01',
        mrr: 0,
        usersCount: 2,
        logo: 'https://ui-avatars.com/api/?name=SN&background=f59e0b&color=fff',
        modules: ['crm'],
        region: 'us-east'
    }
];

export const TASKS: Task[] = [
  // Strategic Setup Tasks (Phase 1)
  {
    id: 'TSK-STRAT-01',
    title: 'מיפוי והאצלת סמכויות אדמיניסטרטיביות',
    description: 'להעביר חשבוניות, תיאומים וגבייה לרוני. המטרה: לפנות 5 שעות שבועיות לאיתמר.',
    status: 'In Progress',
    priority: Priority.URGENT,
    assigneeIds: ['3', '5'], // Yarden & Roni
    creatorId: '1',
    tags: ['אסטרטגיה', 'ניהול', 'Delegation'],
    createdAt: new Date().toISOString(),
    dueDate: 'מחר',
    dueTime: '14:00',
    timeSpent: 4500,
    isTimerRunning: true,
    messages: []
  },
  {
    id: 'TSK-STRAT-02',
    title: 'הקמת אוטומציה ללידים',
    description: 'חיבור דפי נחיתה ליומן כדי למנוע תיאום ידני של פגישות. ליד נרשם -> מקבל מייל -> קובע לבד.',
    status: 'To Do',
    priority: Priority.HIGH,
    assigneeIds: ['3'], // Ops Manager
    creatorId: '1',
    tags: ['אוטומציה', 'תשתית'],
    createdAt: new Date().toISOString(),
    timeSpent: 0,
    isTimerRunning: false,
    messages: []
  },
  // Product & Scale
  {
    id: 'TSK-PROD-01',
    title: 'בניית סילבוס למאסטרמיינד הקבוצתי',
    description: 'הכנת המבנה למפגשים הקבוצתיים (במקום 1:1) כדי לקלוט את ה-10 החדשים.',
    status: 'In Progress',
    priority: Priority.HIGH,
    assigneeIds: ['1', '4'],
    creatorId: '1',
    tags: ['לקוחות', 'מוצר', 'Scale'], 
    createdAt: new Date().toISOString(),
    timeSpent: 3600,
    isTimerRunning: false,
    messages: []
  },
  // Tasks linked to Notifications
  {
    id: 'TSK-202',
    title: 'אישור תקציב קמפיין ממומן',
    description: 'נדרש אישור סופי להגדלת התקציב לקמפיין החורף.',
    status: 'Waiting for Review',
    priority: Priority.HIGH,
    assigneeIds: ['1'], // Assign to Boss (Itamar)
    creatorId: '3', // Created by Yarden
    tags: ['כספים', 'שיווק', 'נדרש אישור'],
    createdAt: new Date().toISOString(),
    dueDate: 'היום',
    dueTime: '17:00',
    timeSpent: 0,
    isTimerRunning: false,
    messages: [
        {
            id: 'msg-202-1',
            text: 'יש אישור לתקציב?',
            senderId: '4', // Michael
            createdAt: '12:30',
            type: 'user'
        }
    ]
  },
  {
    id: 'TSK-210',
    title: 'דוח חודשי - אוקטובר',
    description: 'סיכום ביצועים, לידים ומכירות לחודש החולף.',
    status: 'Done',
    priority: Priority.MEDIUM,
    assigneeIds: ['3'],
    creatorId: '1',
    tags: ['דוחות', 'ניהול'],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    timeSpent: 5400,
    isTimerRunning: false,
    messages: []
  }
];

export const CLIENTS: Client[] = [
    { 
        id: 'C-1', 
        name: 'דניאל כהן', 
        companyName: 'טכנולוגיות בע״מ', 
        avatar: 'https://ui-avatars.com/api/?name=TC&background=0D8ABC&color=fff',
        package: 'חבילת ארגונים',
        status: 'Active',
        contactPerson: 'דניאל',
        email: 'dan@tech.co.il',
        phone: '050-0000000',
        joinedAt: '2023-10-30',
        assetsFolderUrl: '#',
        source: 'Google'
    },
    { 
        id: 'C-2', 
        name: 'שרה לוי', 
        companyName: 'סטודיו לעיצוב שרה', 
        avatar: 'https://ui-avatars.com/api/?name=SD&background=FF5722&color=fff',
        package: 'חבילת פרו',
        status: 'Active',
        contactPerson: 'שרה',
        email: 'sara@design.com',
        phone: '052-1112222',
        joinedAt: '2023-09-15',
        assetsFolderUrl: '#',
        source: 'Facebook'
    },
    { 
        id: 'C-3', 
        name: 'יוסי מזרחי', 
        companyName: 'נדלן פלוס', 
        avatar: 'https://ui-avatars.com/api/?name=ND&background=4CAF50&color=fff',
        package: 'חבילת בסיס',
        status: 'Onboarding',
        contactPerson: 'יוסי',
        email: 'yossi@nadlan.com',
        phone: '052-1234567',
        joinedAt: '2023-11-01',
        assetsFolderUrl: '#',
        source: 'Referral'
    },
];

export const LEADS: Lead[] = [
    {
        id: 'L-101',
        name: 'רוני כהן',
        email: 'roni@start.co.il',
        phone: '052-1111111',
        company: 'סטארט אפ ניישן',
        status: LeadStatus.NEW,
        value: 15000,
        source: 'Instagram',
        createdAt: '2023-11-01',
        lastContact: '2023-11-01',
        interestedIn: 'חבילת פרו'
    },
    {
        id: 'L-102',
        name: 'מיכל לוי',
        email: 'michal@law.co.il',
        phone: '054-2222222',
        company: 'משרד עו״ד לוי',
        status: LeadStatus.QUALIFIED,
        value: 45000,
        source: 'Website',
        createdAt: '2023-10-28',
        lastContact: '2023-10-30',
        interestedIn: 'חבילת ארגונים'
    },
    {
        id: 'L-104',
        name: 'חברת הייטק בע״מ',
        email: 'hr@hitech.com',
        status: LeadStatus.NEGOTIATION,
        value: 200000,
        source: 'LinkedIn',
        createdAt: '2023-09-20',
        lastContact: '2023-11-01',
        interestedIn: 'חבילת ארגונים'
    }
];

export const ASSETS: Asset[] = [
  { id: '1', title: 'השיטה שלנו', type: 'file', value: 'https://drive.google.com/methodology', tags: ['אסטרטגיה', 'מוצר'] },
  { id: '2', title: 'טופס קליטת לקוח', type: 'link', value: 'https://forms.google.com/onboarding', tags: ['לקוחות', 'תפעול', 'טכנולוגיות בע״מ'] }, 
  { id: '3', title: 'גישה למערכת דיוור', type: 'credential', value: 'user: admin, pass: *******', tags: ['שיווק', 'סטודיו לעיצוב שרה'] }, 
];

export const TEMPLATES: Template[] = [
  {
    id: 'tmp_vip_onboarding',
    name: 'קליטת לקוח פרימיום (VIP)',
    icon: 'UserPlus',
    category: 'onboarding',
    description: 'תהליך מלא לקליטת לקוח פרימיום כולל חוזה, תשלום ופגישת אסטרטגיה',
    items: [
      { title: 'שליחת הסכם עבודה דיגיטלי', priority: Priority.URGENT, targetRole: 'אדמיניסטרציה', tags: ['כספים', 'חוזה'], daysDueOffset: 0, actionType: 'doc', description: 'להכין חוזה מותאם אישית ולשלוח לחתימה' },
      { title: 'הסדרת תשלום ומקדמה', priority: Priority.HIGH, targetRole: 'הנהלת חשבונות', tags: ['כספים'], daysDueOffset: 1, actionType: 'email', description: 'לוודא קבלת מקדמה והוצאת חשבונית מס' },
      { title: 'פתיחת תיקייה ב-Drive ואיסוף חומרים', priority: Priority.MEDIUM, targetRole: 'מנהל אופרציה', tags: ['תפעול'], daysDueOffset: 2, actionType: 'task', description: 'לוגו, שפה גרפית, חומרים קיימים' },
      { title: 'תיאום פגישת Kickoff (אסטרטגיה)', priority: Priority.URGENT, targetRole: 'מנכ״ל', tags: ['אסטרטגיה'], daysDueOffset: 3, actionType: 'meeting', description: 'פגישה ראשונה להגדרת יעדים' },
      { title: 'שליחת מתנת הצטרפות (Welcome Kit)', priority: Priority.LOW, targetRole: 'מנהל קהילה', tags: ['שירות'], daysDueOffset: 7, actionType: 'task', description: 'שוקולד ומכתב ברכה' },
    ]
  },
  {
    id: 'tmp_saas_onboarding',
    name: 'קליטת חברת תוכנה (ארגון גדול)',
    icon: 'Server',
    category: 'onboarding',
    description: 'הטמעת מערכת בארגון גדול כולל הדרכות והגדרות טכניות',
    items: [
      { title: 'הקמת סביבת טסט (Tenant)', priority: Priority.URGENT, targetRole: 'מנהל אופרציה', tags: ['טכני'], daysDueOffset: 0, actionType: 'task' },
      { title: 'שיחת אפיון טכני עם ה-CTO', priority: Priority.HIGH, targetRole: 'מנהל אופרציה', tags: ['טכני', 'פגישה'], daysDueOffset: 2, actionType: 'meeting' },
      { title: 'יבוא נתונים (Data Migration)', priority: Priority.HIGH, targetRole: 'מנהל אופרציה', tags: ['דאטה'], daysDueOffset: 5, actionType: 'task' },
      { title: 'הדרכת עובדים בזום (Webinar)', priority: Priority.MEDIUM, targetRole: 'מנהל קהילה', tags: ['הדרכה'], daysDueOffset: 7, actionType: 'meeting' },
    ]
  }
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

export const CONTENT_ITEMS: ContentItem[] = [
    {
        id: 'cont-1',
        title: 'סרטון השקה - Nexus AI',
        type: 'video',
        platforms: ['Youtube', 'Linkedin'],
        status: 'published',
        tags: ['השקה', 'AI', 'וידאו'],
        createdAt: new Date().toISOString(),
        creatorId: '1',
        performance: { views: 12500, likes: 450 }
    },
    {
        id: 'cont-2',
        title: 'פוסט סיכום שנה',
        type: 'text',
        platforms: ['Linkedin', 'Facebook'],
        status: 'draft',
        tags: ['סיכום', 'טקסט'],
        createdAt: new Date().toISOString(),
        creatorId: '1'
    }
];
