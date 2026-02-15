# 🔥 דו"ח מבחן אש — מיזוג סכימה סופי

**תאריך:** 2026-02-15  
**סכימה:** `prisma/schema.prisma` (182 models, 43 enums)

---

## ✅ מבחן אש 1: prisma generate

```
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 817ms
```

**תוצאה: PASS ✅**

---

## ✅ מבחן אש 2: TypeCheck (npx tsc --noEmit)

```
0 errors
```

**תוצאה: PASS ✅** — כל הקוד בפרויקט תואם לסכימה הממוזגת.

---

## ✅ מבחן אש 3: סריקת Raw SQL

נסרקו **34 קבצים** עם שאילתות Raw SQL (`queryRaw`/`executeRaw`/`Prisma.sql`).

### טבלאות ב-Raw SQL שנמצאות בסכימה (15) ✅

| טבלה | קבצים | סטטוס |
|-------|--------|--------|
| `ai_embeddings` | 1 | ✅ |
| `client_clients` | 2 | ✅ |
| `clients` | 1 | ✅ |
| `misrad_invoices` | 1 | ✅ |
| `misrad_notifications` | 9 | ✅ |
| `nexus_time_entries` | 2 | ✅ |
| `nexus_users` | 5 | ✅ |
| `notifications` | 1 | ✅ |
| `organizations` | 1 | ✅ |
| `profiles` | 2 | ✅ |
| `support_ticket_events` | 3 | ✅ |
| `system_invoices` | 2 | ✅ |
| `system_leads` | 2 | ✅ |
| `system_settings` | 2 | ✅ |
| `system_tasks` | 2 | ✅ |

### טבלאות ב-Raw SQL שמנוהלות מחוץ ל-Prisma (7) ⚠️

אלו טבלאות שנוצרו ב-SQL ישיר ולא דרך Prisma. הן ניגשות **רק** דרך `queryRawOrgScoped`/`executeRawOrgScoped` ו**לא** דרך Prisma Client. **מצב זה קיים לפני המיזוג ולא השתנה.**

| טבלה | מקור יצירה | קבצים שמשתמשים | הערות |
|-------|------------|----------------|-------|
| `ai_chat_sessions` | `prisma/ai_chat_sessions.sql` | `ai-chat-sessions.ts`, `ai/feedback/route.ts` | עם RLS |
| `ai_chat_messages` | `prisma/ai_chat_sessions.sql` | `ai-chat-sessions.ts` | FK → ai_chat_sessions |
| `module_chat_history` | `prisma/chat_history.sql` | `chat-history.ts` | עם RLS |
| `api_keys` | `prisma/migrations/create_api_keys_table.sql` | `public/leads/route.ts` | אימות API |
| `payments` | SQL ישיר (לא נמצא CREATE TABLE) | `payments.ts` | Legacy Social |
| `invoices` | SQL ישיר (לא נמצא CREATE TABLE) | `payments.ts` | Legacy Social (לא misrad/system invoices) |
| `announcements` | SQL ישיר (לא נמצא CREATE TABLE) | `announcements/route.ts` | עם fallback handling |

**חשוב:** `announcements` כולל `isMissingTableOrSchemaError` fallback — מתוכנן לעבוד גם ללא הטבלה. `payments` ו-`invoices` הם Legacy ששייכים למודול Social הישן.

---

## 📊 סיכום כולל

| בדיקה | תוצאה |
|--------|--------|
| `prisma validate` | ✅ VALID |
| `prisma generate` | ✅ Generated |
| `tsc --noEmit` | ✅ 0 errors |
| Raw SQL → schema tables | ✅ 15/15 matched |
| Raw SQL → non-Prisma tables | ⚠️ 7 (לא השתנה מלפני המיזוג) |

### אישור סופי

**הסכימה הממוזגת תואמת לקוד לחלוטין.**

- כל שימוש ב-Prisma Client עובר typecheck
- כל טבלה שהקוד מצפה לה דרך Prisma Client קיימת בסכימה
- 7 טבלאות Raw-SQL-only מנוהלות מחוץ ל-Prisma — מצב שלא השתנה
- אפס שגיאות, אפס regression
