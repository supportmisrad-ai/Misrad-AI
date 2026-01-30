import type { OSModuleKey } from '@/lib/os/modules/types';

export type DocCalloutVariant = 'tip' | 'warning';

export type DocStep = {
  title: string;
  body: string;
};

export type DocBlock =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'steps'; items: DocStep[] }
  | { type: 'callout'; variant: DocCalloutVariant; title?: string; body: string };

export type DocArticle = {
  id: string;
  moduleKey: OSModuleKey;
  categoryId: string;
  title: string;
  description: string;
  tags?: string[];
  content: DocBlock[];
};

export type DocCategory = {
  id: string;
  moduleKey: OSModuleKey;
  title: string;
  description?: string;
};

export type DocsModule = {
  moduleKey: OSModuleKey;
  title: string;
  description?: string;
};

export const DOCS_MODULES: DocsModule[] = [
  { moduleKey: 'finance', title: 'Finance', description: 'כספים, חשבוניות, סליקה ודוחות.' },
  { moduleKey: 'operations', title: 'Operations', description: 'שטח, טכנאים, קריאות שירות ומלאי.' },
  { moduleKey: 'system', title: 'System', description: 'לידים, מכירות, יומן וניהול תהליך.' },
  { moduleKey: 'nexus', title: 'Nexus', description: 'צוות, הרשאות, נוכחות ומשימות.' },
  { moduleKey: 'client', title: 'Client', description: 'לקוחות, מסמכים וחוויית לקוח.' },
  { moduleKey: 'social', title: 'Social', description: 'שיווק, תוכן, קמפיינים והתראות.' },
];

export const DOCS_CATEGORIES: DocCategory[] = [
  { id: 'invoices', moduleKey: 'finance', title: 'חשבוניות', description: 'הפקה, שליחה, תיקונים ושגרות.' },
  { id: 'payments', moduleKey: 'finance', title: 'סליקה', description: 'תשלומים, קישורי תשלום וחיובים.' },
  { id: 'finance-reports', moduleKey: 'finance', title: 'דוחות', description: 'סקירה פיננסית וניהול בקרה.' },

  { id: 'work-orders', moduleKey: 'operations', title: 'קריאות שירות', description: 'פתיחה, שיגור, ביצוע וסגירה.' },
  { id: 'field', moduleKey: 'operations', title: 'שטח', description: 'תפעול טכנאים, צילום וחתימות.' },
  { id: 'inventory', moduleKey: 'operations', title: 'מלאי', description: 'חלקים, קטלוג ומעקב.' },
];

export const DOCS_ARTICLES: DocArticle[] = [
  {
    id: 'issue-first-invoice',
    moduleKey: 'finance',
    categoryId: 'invoices',
    title: 'איך להפיק חשבונית מס/קבלה ראשונה',
    description: '60 שניות. פעולה אחת. בלי חפירות.',
    tags: ['חשבוניות', 'הפקה', 'מסמך', 'קבלה'],
    content: [
      { type: 'p', text: 'במאמר הזה תפיקו חשבונית ראשונה בצורה הכי קצרה שאפשר — עם סדר פעולות ברור.' },
      { type: 'callout', variant: 'tip', title: 'טיפ', body: 'אם אין עדיין לקוח, תצרו אותו קודם — ואז תחזרו למסמך.' },
      {
        type: 'steps',
        items: [
          {
            title: "לכו ל'חשבוניות' ולחצו על הפלוס (+)",
            body: "בתפריט של Finance כנסו ל'חשבוניות'. שם תראו כפתור פלוס להפקת מסמך חדש.",
          },
          {
            title: 'בחרו את הלקוח',
            body: 'בחרו לקוח קיים מהרשימה. אם צריך—צרו חדש ואז חזרו למסמך.',
          },
          {
            title: 'הוסיפו שורות למסמך',
            body: "הכניסו את השורות (למשל: 'ביקור טכנאי'), כמות ומחיר. שמרו על ניסוח קצר וברור.",
          },
          {
            title: "לחצו 'הפק מסמך'",
            body: 'רק אחרי ההפקה המסמך מקבל מספר ונשלח ללקוח (לרוב במייל).',
          },
        ],
      },
      { type: 'h2', text: 'שאלות נפוצות' },
      {
        type: 'bullets',
        items: [
          'למה אין מספר מסמך לפני שהפקתי? כדי למנוע חורים במספור. המספר נוצר רק בהפקה בפועל.',
          'איך אני מוודא שהלקוח קיבל את המסמך במייל? וודאו שיש אימייל מעודכן ללקוח ואז שלחו/הפיקו.',
          'הפקתי ואז גיליתי טעות—מה עושים? בדרך כלל מתקנים באמצעות זיכוי/מסמך מתקן.',
        ],
      },
      { type: 'callout', variant: 'warning', title: 'שימו לב', body: 'במסמכים רשמיים — אל תשנו ידנית מספרים קיימים. השתמשו במסמכי תיקון.' },
    ],
  },
  {
    id: 'manage-service-calls',
    moduleKey: 'operations',
    categoryId: 'work-orders',
    title: 'ניהול קריאת שירות מקצה לקצה',
    description: 'פתיחה, שיגור טכנאי, ביצוע בשטח וסגירה לחיוב.',
    tags: ['קריאות שירות', 'טכנאים', 'Dispatch', 'שטח'],
    content: [
      { type: 'p', text: 'המטרה: שקריאה תעבור משרד → שטח → משרד בלי איבוד מידע, ותהיה מוכנה לחיוב.' },
      { type: 'callout', variant: 'tip', title: 'טיפ', body: 'שימו סדר “Order” לסרטונים/קריאות כדי שכולם יראו את אותו רצף.' },
      {
        type: 'steps',
        items: [
          {
            title: 'פתיחת קריאה',
            body: 'לחצו על "קריאה חדשה" בלוח הבקרה ומלאו את פרטי התקלה והפרויקט.',
          },
          {
            title: 'שיוך טכנאי (Dispatch)',
            body: 'בחרו את איש הצוות בשדה "שיוך טכנאי" ולחצו שמור. הוא יקבל התראה לנייד.',
          },
          {
            title: 'ביצוע בשטח',
            body: 'הטכנאי מדווח "הגעתי", מצלם את התקלה, ומחתים את הלקוח באפליקציה.',
          },
          {
            title: 'סגירה וחיוב',
            body: 'הקריאה חוזרת למשרד כ"הושלמה" ומוכנה להפקת חשבונית.',
          },
        ],
      },
      { type: 'h2', text: 'תקלות נפוצות' },
      {
        type: 'bullets',
        items: [
          'האם הטכנאי יכול לעבוד בלי קליטה? כן, המערכת שומרת Offline ומסנכרנת כשיש קליטה.',
          'איך מזהים חלקים חסרים? אפשר לצלם חלק והמערכת תסייע בזיהוי (כפוף לזמינות הפיצ׳ר).',
        ],
      },
    ],
  },
];

export function getDocsModules() {
  return DOCS_MODULES;
}

export function getDocsCategoriesForModule(moduleKey: OSModuleKey) {
  return DOCS_CATEGORIES.filter((c) => c.moduleKey === moduleKey);
}

export function getDocsArticlesForModule(moduleKey: OSModuleKey) {
  return DOCS_ARTICLES.filter((a) => a.moduleKey === moduleKey);
}

export function getDocsArticle(moduleKey: OSModuleKey, articleId: string) {
  return DOCS_ARTICLES.find((a) => a.moduleKey === moduleKey && a.id === articleId) || null;
}

export function getDocsCategory(moduleKey: OSModuleKey, categoryId: string) {
  return DOCS_CATEGORIES.find((c) => c.moduleKey === moduleKey && c.id === categoryId) || null;
}

export type FlatDocArticle = {
  id: string;
  title: string;
  description: string;
  moduleKey: OSModuleKey;
  categoryId: string;
  tags: string[];
};

export function getAllDocsArticles(): FlatDocArticle[] {
  return DOCS_ARTICLES.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    moduleKey: a.moduleKey,
    categoryId: a.categoryId,
    tags: Array.isArray(a.tags) ? a.tags : [],
  }));
}
