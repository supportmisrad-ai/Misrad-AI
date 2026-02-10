# 🔄 תכנית מיגרציה: הסרת קידומת social_ מטבלאות

## 🎯 מטרה
הסרת הקידומת `social_` מטבלאות ליבה ושינוי שם לטבלאות שאכן קשורות למודול Social Media.

---

## 📋 מיפוי טבלאות (45 טבלאות)

### קטגוריה 1: טבלאות ליבה (Core) - הסרת social_ לחלוטין

| שם נוכחי | שם חדש | הסבר |
|---------|--------|------|
| `social_organizations` | `organizations` | ✅ כבר יש @map |
| `social_users` | `organization_users` | משתמשי ארגון (owners + team members) |
| `social_team_members` | `team_members` | חברי צוות |
| `social_team_member_clients` | `team_member_clients` | קישור צוות-לקוחות |
| `social_team_comments` | `team_comments` | הערות צוות |
| `social_notifications` | `notifications` | התראות כלליות |
| `social_navigation_menu` | `navigation_menu` | תפריט ניווט |
| `social_impersonation_sessions` | `impersonation_sessions` | סשנים של התחזות |
| `social_global_system_metrics` | `global_system_metrics` | מדדי מערכת גלובליים |
| `social_system_settings` | `system_settings` | הגדרות מערכת |
| `social_system_backups` | `system_backups` | גיבויי מערכת |
| `social_activity_logs` | `activity_logs` | לוגים של פעילות |
| `social_integration_credentials` | `integration_credentials` | אישורי אינטגרציה |
| `social_integration_status` | `integration_status` | סטטוס אינטגרציות |
| `social_oauth_tokens` | `oauth_tokens` | טוקנים OAuth |
| `social_webhook_configs` | `webhook_configs` | הגדרות Webhooks |
| `social_user_update_views` | `user_update_views` | צפיות בעדכונים |
| `social_app_updates` | `app_updates` | עדכוני אפליקציה |

### קטגוריה 2: טבלאות Social Media - שינוי ל-socialmedia_

| שם נוכחי | שם חדש | הסבר |
|---------|--------|------|
| `social_clients` | `socialmedia_clients` | לקוחות Social Media |
| `social_client_dna` | `socialmedia_client_dna` | DNA לקוח Social |
| `social_client_active_platforms` | `socialmedia_client_platforms` | פלטפורמות פעילות |
| `social_client_requests` | `socialmedia_client_requests` | בקשות לקוח |
| `social_campaigns` | `socialmedia_campaigns` | קמפיינים |
| `social_posts` | `socialmedia_posts` | פוסטים |
| `social_post_platforms` | `socialmedia_post_platforms` | פלטפורמות פוסט |
| `social_post_variations` | `socialmedia_post_variations` | וריאציות פוסט |
| `social_post_comments` | `socialmedia_post_comments` | תגובות פוסט |
| `social_platform_credentials` | `socialmedia_platform_credentials` | אישורי פלטפורמות |
| `social_platform_quotas` | `socialmedia_platform_quotas` | מכסות פלטפורמות |
| `social_conversations` | `socialmedia_conversations` | שיחות Social |
| `social_messages` | `socialmedia_messages` | הודעות Social |
| `social_ideas` | `socialmedia_ideas` | רעיונות לתוכן |
| `social_automation_rules` | `socialmedia_automation_rules` | חוקי אוטומציה |
| `social_ai_opportunities` | `socialmedia_ai_opportunities` | הזדמנויות AI |
| `social_business_metrics` | `socialmedia_business_metrics` | מדדים עסקיים |
| `social_calendar_events` | `socialmedia_calendar_events` | אירועי לוח שנה |
| `social_agency_service_configs` | `socialmedia_agency_configs` | הגדרות סוכנות |
| `social_feedback` | `socialmedia_feedback` | פידבק לקוחות |
| `social_tasks` | `socialmedia_tasks` | משימות Social |
| `social_manager_requests` | `socialmedia_manager_requests` | בקשות מנהל |
| `social_invoices` | `socialmedia_invoices` | חשבוניות |
| `social_payment_orders` | `socialmedia_payment_orders` | הזמנות תשלום |
| `social_drive_files` | `socialmedia_drive_files` | קבצי Drive |
| `social_sheets_sync_configs` | `socialmedia_sheets_sync_configs` | סנכרון Sheets |
| `social_sync_logs` | `socialmedia_sync_logs` | לוגי סנכרון |
| `social_site_content` | `socialmedia_site_content` | תוכן אתר |

---

## 🔄 סדר ביצוע (8 שלבים)

### שלב 1: גיבוי מלא ✅
```bash
npm run db:backup:critical
```

### שלב 2: יצירת migration SQL בטוח
- ALTER TABLE RENAME (לא DROP + CREATE)
- עדכון Foreign Keys
- עדכון Indexes
- עדכון RLS Policies
- עדכון Triggers

### שלב 3: עדכון schema.prisma
- שינוי שמות models
- עדכון @@map directives
- עדכון כל ה-relations

### שלב 4: עדכון קוד TypeScript
- עדכון כל imports מ-@prisma/client
- עדכון queries ישירים
- עדכון server actions

### שלב 5: עדכון SQL ישיר
- scripts/db-setup/*.sql
- קבצי migration ישנים
- RLS policies בקוד

### שלב 6: הרצת migration
```bash
npx prisma migrate dev --create-only
# בדיקה ידנית של migration.sql
npx prisma migrate deploy
```

### שלב 7: typecheck + validation
```bash
npm run typecheck
npx prisma validate
```

### שלב 8: בדיקת שלמות נתונים
```sql
SELECT COUNT(*) FROM organizations;
SELECT COUNT(*) FROM organization_users;
```

---

## ⚠️ נקודות קריטיות

1. **לא למחוק נתונים** - רק RENAME, לא DROP
2. **Foreign Keys** - צריך לעדכן את כל ההפניות
3. **RLS Policies** - יש policies רבים שמתייחסים לשמות טבלאות
4. **Triggers** - צריך לעדכן טריגרים קיימים
5. **Indexes** - לשמור על כל האינדקסים
6. **@@map בסכמה** - לעדכן ב-Prisma אבל לא לשנות את model name אם זה ישבור קוד

---

## 📊 הערכת זמן
- יצירת migrations: 30-45 דקות
- עדכון schema: 15 דקות
- עדכון קוד: 45-60 דקות
- בדיקות: 30 דקות
**סה"כ: ~2.5-3 שעות**

---

## ✅ Checklist סופי
- [ ] גיבוי הושלם
- [ ] Migration SQL נוצר ונבדק
- [ ] Schema.prisma עודכן
- [ ] קוד TS עודכן
- [ ] SQL scripts עודכנו
- [ ] RLS policies עודכנו
- [ ] typecheck עובר
- [ ] validation עובר
- [ ] נתונים נשמרו (COUNT)
- [ ] דוח מפורט הוכן
