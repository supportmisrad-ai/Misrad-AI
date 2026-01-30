# Scale CRM / Nexus OS

מערכת CRM מתקדמת לניהול לקוחות, משימות, צוות ופיננסים.

## 🚀 תכונות עיקריות

- **ניהול לקוחות (CRM)** - מעקב אחר לקוחות, לידים ופעילויות מכירה
- **ניהול משימות** - מערכת משימות מתקדמת עם מעקב זמן
- **ניהול צוות** - מעקב אחר עובדים, נוכחות ושעות עבודה
- **פיננסים** - דוחות פיננסיים, חשבוניות ותקציבים
- **Nexus AI** - בינה מלאכותית לניתוח נתונים והמלצות
- **Multi-Tenancy** - תמיכה ב-SaaS עם לקוחות מרובים
- **אינטגרציות** - API לאינטגרציות חיצוניות (Webhooks)

## 📋 דרישות

- Node.js 18+ 
- npm או yarn
- חשבון Supabase (אופציונלי - המערכת עובדת גם עם Mock Data)

## 🔧 התקנה

1. **שכפל את הפרויקט:**
```bash
git clone <repository-url>
cd scale-crm
```

2. **התקן תלויות:**
```bash
npm install
```

3. **הגדר משתני סביבה:**
צור קובץ `.env.local` בשורש הפרויקט (ראה `ENV_SETUP.md` לפרטים מלאים):

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Supabase (אופציונלי)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Integration API Key
NEXUS_API_KEY=your_api_key
```

4. **הרץ את שרת הפיתוח:**
```bash
npm run dev
```

5. **פתח בדפדפן:**
```
http://localhost:4000
```

## 🗄️ חיבור ל-Supabase

המערכת תומכת בחיבור ל-Supabase לדאטה-בייס אמיתי:

1. **צור פרויקט ב-Supabase**: https://app.supabase.com
2. **הרץ את קוד ה-SQL**: העתק את התוכן מ-`supabase-schema.sql` והרץ ב-SQL Editor
3. **הוסף את המפתחות** ל-`.env.local` (ראה `ENV_SETUP.md`)

**הערה:** אם Supabase לא מוגדר, המערכת תשתמש ב-Mock Data אוטומטית.

## 🔌 API Endpoints

### Integration API

**POST** `/api/integrations/onboard-client`
- קליטת לקוחות אוטומטית ממערכות חיצוניות
- דורש header: `x-nexus-api-key`
- Body: `{ companyName, contactName, email, phone, plan }`

### Secure APIs

הלוגיקה העסקית המרכזית של המערכת מבוצעת בצד שרת באמצעות **Server Actions** (ולא דרך API routes) ומוגנת ע"י Clerk + בדיקות הרשאות/Workspace.

דוגמאות ל-Server Actions מרכזיות:
- `getSystemLeads` - טעינת לידים של System (נמצא תחת `app/actions/system-leads.ts`)
- `listNexusUsers`, `updateNexusUser`, `createNexusUser` - ניהול משתמשים של Nexus (נמצא תחת `app/actions/nexus.ts`)
- `createNexusTask`, `updateNexusTask`, `deleteNexusTask` - ניהול משימות של Nexus (נמצא תחת `app/actions/nexus.ts`)
- `listNexusTimeEntries`, `createNexusTimeEntry`, `updateNexusTimeEntry`, `voidNexusTimeEntry` - ניהול דיווחי שעות של Nexus (נמצא תחת `app/actions/nexus.ts`)

בנוסף, קיימים עדיין API routes עבור אינטגרציות/כלים ספציפיים (לדוגמה):
- `/api/clients` - ניהול לקוחות
- `/api/financials` - נתונים פיננסיים
- `/api/ai/analyze` - ניתוח AI

## 📁 מבנה הפרויקט

```
scale-crm/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   └── page.tsx           # דף ראשי
├── components/             # רכיבי React
│   ├── Layout.tsx         # Layout ראשי
│   └── saas/             # רכיבי SaaS Admin
├── views/                  # דפי מערכת
│   ├── DashboardView.tsx
│   ├── ClientsView.tsx
│   └── ...
├── hooks/                  # Custom Hooks
├── lib/                    # ספריות שירות
│   ├── db.ts              # גישה לדאטה-בייס
│   ├── supabase.ts        # Supabase client
│   ├── auth.ts            # אימות והרשאות
│   └── audit.ts           # Audit logging
├── types.ts                # TypeScript types
├── constants.ts            # נתונים סטטיים
└── supabase-schema.sql     # SQL Schema ל-Supabase
```

## 🛠️ פיתוח

```bash
# הרצת שרת פיתוח
npm run dev

# Build לייצור
npm run build

# הרצת build
npm start

# בדיקת linting
npm run lint
```

## 🔐 אבטחה

- **Authentication**: Clerk
- **Authorization**: מערכת הרשאות מבוססת תפקידים
- **Audit Logging**: מעקב אחר כל הפעולות
- **API Security**: API Key authentication לאינטגרציות
- **Data Filtering**: סינון נתונים רגישים לפי הרשאות

## 📚 מסמכים נוספים

- `ENV_SETUP.md` - הוראות מפורטות להגדרת משתני סביבה
- `supabase-schema.sql` - קוד SQL ליצירת הטבלאות
- `SECURITY_STATUS.md` - סטטוס האבטחה

## 🚢 Deployment

הפרויקט מוכן ל-deployment ב-Vercel, Netlify או כל פלטפורמת Next.js.

**חשוב:** הוסף את כל משתני הסביבה ב-hosting platform שלך.

## 📝 רישיון

פרויקט פרטי

## 👥 תמיכה

לשאלות ותמיכה, צור issue ב-repository.
