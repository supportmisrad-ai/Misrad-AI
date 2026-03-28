# היררכיית הרשאות ותפקידים - מערכת MISRAD AI

## סיכום ביצועים

מערכת ההרשאות מבוססת על **היררכיה ישראלית ארגונית** ברורה עם 9 רמות. כל תפקיד ממופה אוטומטית לרמה, וכל רמה מקבלת הרשאות מוגדרות מראש.

---

## 🏛️ היררכיית התפקידים (9 רמות)

| רמה | תפקיד | מילות מפתח מזהות | הרשאות מרכזיות |
|-----|-------|-------------------|----------------|
| **1** | **מנכ״ל** | `מנכ״ל`, `מנכל`, `מנ"ל`, `ceo` | מלאות - כולל ניהול מערכת |
| **2** | **סמנכ״ל** | `סמנכ״ל`, `סמנכל`, `vp` | CRM, פיננסים, צוות, מחיקה |
| **3** | **ראש מחלקה / מנהל בכיר** | `מנהל בכיר`, `ראש מחלקה`, `director` | CRM, נכסים, צוות |
| **4** | **מנהל** ← סף ניהול | `מנהל`, `מנהלת`, `manager` | CRM, נכסים, **ניהול צוות** |
| 5 | ראש צוות | `ראש צוות`, `רכז`, `team lead` | צפייה ב-CRM, נכסים |
| 6 | עובד בכיר | `בכיר`, `senior` | צפייה ב-CRM, נכסים |
| 7 | עובד | `עובד`, `עובדת`, `נציג` | צפייה בלבד |
| 8 | מתמחה | `מתמחה`, `סטאז'ר`, `intern` | צפייה מוגבלת |
| 9 | פרילנסר | `פרילנסר`, `freelancer`, `יועץ` | ללא הרשאות |

---

## 🔐 מיפוי הרשאות לפי רמה

### רמות 1-2: הנהלה בכירה
```typescript
permissions: [
  'view_crm',        // צפייה בלקוחות
  'view_financials', // צפייה בפיננסים
  'view_intelligence', // אינטליגנציה
  'view_assets',     // נכסים
  'manage_team',     // ניהול צוות
  'delete_data',     // מחיקת נתונים
  'manage_system'    // ניהול מערכת (רק רמה 1)
]
```

### רמות 3-4: ניהול ביניים
```typescript
permissions: [
  'view_crm',        // צפייה בלקוחות
  'view_intelligence', // אינטליגנציה
  'view_assets',     // נכסים
  'manage_team'      // ✅ ניהול צוות
]
```
**חשוב:** רמה 4 (מנהל) היא **סף הניהול** - מכאן ומעלה אפשר להוסיף/לערוך/למחוק עובדים.

### רמות 5-7: עובדים רגילים
```typescript
permissions: [
  'view_crm',        // צפייה בלבד בלקוחות
  'view_intelligence', // אינטליגנציה
  'view_assets'      // צפייה בנכסים
]
```

### רמות 8-9: מעגל חיצוני
```typescript
permissions: [
  'view_intelligence'  // צפייה מוגבלת בלבד
  // או [] (ריק) לפרילנסר
]
```

---

## 📁 פירוט מודולים והשפעות

### 1. מודול NEXUS (ניהול צוות)

#### פעולות מוגנות:
| פעולה | הרשאה נדרשת | קובץ |
|-------|-------------|------|
| יצירת עובד | `manage_team` | `app/actions/nexus/_internal/users.ts:166` |
| עדכון עובד | `manage_team` | `app/actions/nexus/_internal/users.ts:254` |
| מחיקת עובד | `manage_team` | `app/actions/nexus/_internal/users.ts:383` |
| שליחת הזמנה | `manage_team` | `app/actions/nexus/_internal/invitations.ts:22` |
| צפייה בצוות | `manage_team` (מלא) / דpartment (מוגבל) | `app/actions/nexus/_internal/users.ts:34` |

#### לוגיקת הרשאה:
```typescript
// רמה 4+ רואה את כל הצוות
if (canManageTeam) { 
  return allUsers; 
}
// רמה 5-7 רואה רק את המחלקה שלו
else { 
  return departmentUsers; 
}
```

#### השפעות צד:
- **מודול CRM**: מנהל יכול לשייך לקוחות לעובדים
- **מודול Tasks**: מנהל יכול לתת משימות לכל הצוות
- **מודול Finance**: מנהל רואה שכר של כל הצוות

---

### 2. מודול SYSTEM (Sales Pipeline)

#### פעולות מוגנות בשרת:
| פעולה | הרשאה | הגנה | קובץ |
|-------|-------|------|------|
| עדכון ליד | `manage_team` או סוכן משויך | `canManageLead()` | `system-leads.ts:868` |
| יצירת פעילות | `manage_team` או סוכן משויך | `canManageLead()` | `system-leads.ts:1044` |
| עדכון סטטוס | `manage_team` או סוכן משויך | `canManageLead()` | `system-leads.ts:1281` |
| מחיקת ליד | `manage_team` | ישירה | `system-leads.ts:1340` |
| שינוי שלבים | `manage_team` | דרך `isAdmin` ב-UI | `SystemSalesPipelineClient.tsx:73` |

#### לוגיקת UI:
```typescript
// UI מציג כפתורים לפי רמה
const isAdmin = getRoleLevel(userRole) <= 4;
// מציג: ייבוא לידים, שלבי pipeline, טופס לידים
```

#### השפעות צד:
- **מודול Notifications**: מנהל מקבל התראות על כל הלידים
- **מודול Calendar**: מנהל רואה פגישות של כל הצוות
- **מודול Email**: מנהל יכול לשלוח מיילים מטעם כל הסוכנים

---

### 3. מודול CRM (לקוחות)

#### הרשאות לפי רמה:
| רמה | צפייה | יצירה | עריכה | מחיקה | שיוך |
|-----|-------|-------|-------|-------|------|
| 1-2 | ✅ כל | ✅ | ✅ | ✅ | ✅ כל |
| 3-4 | ✅ כל | ✅ | ✅ | ❌ | ✅ צוות |
| 5-7 | ✅ מוגבל | ❌ | ❌ | ❌ | ❌ |
| 8-9 | ❌ | ❌ | ❌ | ❌ | ❌ |

#### מיקומי הגנה:
- `app/actions/client/*.ts` - server actions עם `hasPermission('view_crm')`
- `app/w/[orgSlug]/(modules)/client/*.tsx` - UI עם בדיקות role

---

### 4. מודול FINANCE (פיננסים)

#### הרשאות:
| רמה | צפייה | עריכה |
|-----|-------|-------|
| 1-2 | ✅ מלאה | ✅ |
| 3 | ✅ מלאה | ❌ |
| 4+ | ❌ | ❌ |

#### מיקומי הגנה:
- `app/w/[orgSlug]/(modules)/finance/expenses/page.tsx` - `hasPermission('view_financials')`
- `app/w/[orgSlug]/(modules)/finance/invoices/page.tsx` - `hasPermission('view_financials')`

#### השפעות צד:
- **מודול Nexus**: מנהל רואה שכר עובדים, עובד רואה רק של עצמו
- **מודול Reports**: מנהל רואה דוחות פיננסיים, עובד לא

---

### 5. מודול ASSETS (נכסים)

#### הרשאות:
- רמות 1-6: ✅ צפייה מלאה
- רמות 7-9: ✅ צפייה מוגבלת

#### מיקומי הגנה:
- `lib/auth.ts:554-587` - `filterSensitiveData()` מסיר שדות רגישים ללא הרשאה

---

### 6. מודול AI/Intelligence

#### הרשאות:
- כל הרמות (1-8): ✅ צפייה
- פרילנסר (9): ❌

#### מיקומי הגנה:
- `app/api/cron/ai-monthly-digest/route.ts` - רמה 4+ מקבל דוחות AI

---

### 7. מודול SUPPORT (פניות)

#### הרשאות:
| פעולה | מי יכול |
|-------|---------|
| פתיחת פנייה | כולם |
| צפייה בכל הפניות | רמה 4+ |
| עדכון סטטוס | רמה 4+ או יוצר הפנייה |
| מחיקת פנייה | רמה 2+ |

---

## 🔧 מנגנוני הגנה מרכזיים

### 1. `requireManagementRole()` - `lib/auth.ts:611`
```typescript
// בודק אם משתמש הוא מנהל (רמה 4+) ומעלה
const result = await requireManagementRole(clerkUserId, organizationId);
if (!result.authorized) throw new Error('Forbidden');
```

### 2. `canManageLead()` - `lib/auth.ts:669`
```typescript
// מנהל יכול לנהל הכל, סוכן רק את שלו
if (result.authorized) return true;  // מנהל
if (orgUser?.id === leadAssignedAgentId) return true;  // סוכן משויך
return false;
```

### 3. `hasPermission()` - `lib/auth.ts:237`
```typescript
// מערכת ההרשאות הראשית
const hasAccess = await hasPermission('manage_team');
```

### 4. `getLevelBasedPermissions()` - `lib/auth.ts:156`
```typescript
// מחזירה הרשאות אוטומטיות לפי רמה
switch (roleLevel) {
  case 1: return ['manage_system', 'manage_team', ...];
  case 4: return ['manage_team', 'view_crm', ...];
}
```

---

## 🚨 חריגים ומקרים מיוחדים

### Super Admin (מערכת)
- מקבל **הכל** בכל הארגונים
- לא נכלל בהיררכיה הרגילה
- בדיקה: `user.isSuperAdmin === true`

### Tenant Owner (בעל ארגון)
- מקבל הרשאות רמה 1-2 אוטומטית
- בדיקה: `isTenantOwner()`

### Fallback Permissions
אם תפקיד לא מזוהה בהיררכיה, המערכת בודקת:
1. מסד נתונים (הגדרות אדמין)
2. `FALLBACK_ROLE_PERMISSIONS` (קשיח)
3. רמה 7 (עובד) כברירת מחדל

---

## 📊 טבלת השפעות מודולים

```
NEXUS (צוות)
    ├── CRM (שיוך לקוחות)
    ├── System (שיוך לידים)
    ├── Tasks (הקצאת משימות)
    ├── Finance (שכר עובדים)
    └── Reports (נתוני צוות)

System (Sales)
    ├── Notifications (התראות לידים)
    ├── Calendar (פגישות)
    └── Email (תקשורת)

CRM (לקוחות)
    └── Finance (היסטוריה פיננסית)

Finance
    └── Reports (דוחות)
```

---

## ✅ רשימת בדיקות לאימות

### בדיקות שכדאי לעשות:
1. [ ] משתמש עם תפקיד "מנהל מכירות" (רמה 4) יכול להוסיף עובד בנקסוס
2. [ ] משתמש עם תפקיד "איש מכירות" (רמה 7) לא יכול להוסיף עובד
3. [ ] מנהל רואה כפתור "ייבוא לידים" ב-System
4. [ ] עובד רגיל לא רואה כפתורי ניהול ב-System
5. [ ] מנהל יכול לעדכן ליד שלא משויך אליו
6. [ ] עובד יכול לעדכן רק ליד משויך אליו
7. [ ] סמנכ״ל (רמה 2) רואה נתונים פיננסיים
8. [ ] מנהל (רמה 4) לא רואה נתונים פיננסיים

---

## 📝 סיכום מקומות קוד קריטיים

| קובץ | שורות | תפקיד |
|------|-------|-------|
| `lib/constants/roles.ts` | 1-95 | הגדרת היררכיה |
| `lib/auth.ts:156-193` | `getLevelBasedPermissions()` | מיפוי רמות להרשאות |
| `lib/auth.ts:198-223` | `getRolePermissions()` | לוגיקת הרשאות |
| `lib/auth.ts:611-644` | `requireManagementRole()` | בדיקת מנהל |
| `lib/auth.ts:669-686` | `canManageLead()` | ניהול לידים |
| `app/actions/nexus/_internal/users.ts` | 166, 254, 383 | ניהול עובדים |
| `app/actions/system-leads.ts` | 868, 1044, 1281 | ניהול לידים |
| `app/api/cron/ai-monthly-digest/route.ts` | 285 | דוחות AI |
| `app/w/[orgSlug]/lobby/page.tsx` | 34 | תפקיד fallback |
| `app/w/[orgSlug]/(modules)/system/SystemSalesPipelineClient.tsx` | 73 | UI מודל System |

---

**מסמך זה נכון לתאריך:** 27.03.2025
**גרסה:** 1.0
**אחראי:** מערכת MISRAD AI
