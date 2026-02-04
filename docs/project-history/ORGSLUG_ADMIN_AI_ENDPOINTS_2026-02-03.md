# תיעוד שינויים - OrgSlug enforcement ב־Admin AI APIs (`x-org-id` בלבד)

**תאריך**: 2026-02-03  
**סטטוס**: ✅ הושלם + `typecheck` עבר

---

## 🎯 מטרת השינוי

לנעול endpoints של Super Admin בתחום AI כך ש־workspace context יעבור **רק** דרך header `x-org-id` (שהוא `orgSlug`/orgKey), ולהסיר תמיכה ישנה ב־`organizationId` בתוך query/body.

מטרת־על: לחסל דרכי fallback שמאפשרות לבחור ארגון לפי `organizationId/tenantId` בלי `orgSlug`.

---

## ✅ מה השתנה

### 1) API: Credits

**קובץ**: `app/api/admin/ai/credits/route.ts`

- **GET**
  - קודם: `organizationId` נקרא מ־query string.
  - עכשיו: נדרש `x-org-id`, וה־`organizationId` נגזר מה־workspace:
    - `getOrgKeyOrThrow(req)`
    - `getWorkspaceByOrgKeyOrThrow(orgKey)`
- **POST**
  - קודם: `organizationId` בגוף הבקשה.
  - עכשיו:
    - `organizationId` נגזר מה־`x-org-id`.
    - אם נשלח `organizationId` בגוף -> מוחזר `400`.

---

### 2) API: Ingest History

**קובץ**: `app/api/admin/ai/ingest-history/route.ts`

- **POST**
  - קודם: `organizationId` בגוף הבקשה.
  - עכשיו:
    - נדרש `x-org-id`.
    - אם נשלח `organizationId` בגוף -> `400`.
    - נשמרה אפשרות להריץ על כל הארגונים באמצעות `x-org-id: all`.

---

### 3) API: Feature Settings

**קובץ**: `app/api/admin/ai/feature-settings/route.ts`

- **GET**
  - קודם: `organizationId` ב־query לסינון.
  - עכשיו: נדרש `x-org-id` והקריאה scoped ל־`organization_id = workspaceId`.
- **POST**
  - קודם: `organization_id` בגוף.
  - עכשיו:
    - `organization_id` נגזר מה־`x-org-id` בלבד.
    - אם נשלח `organization_id` בגוף -> `400`.
- **DELETE**
  - קודם: מחיקה לפי `featureKey` + `organizationId` ב־query (כולל אפשרות global דרך `organizationIdRaw === null`).
  - עכשיו:
    - המחיקה scoped לארגון הנוכחי (נגזר מה־`x-org-id`).
    - נוסף פרמטר `scope=global` למחיקה גלובלית (`organization_id = null`).

---

### 4) API: Brain Export

**קובץ**: `app/api/admin/ai/brain-export/route.ts`

- **GET**
  - קודם: `organizationId` ב־query.
  - עכשיו: נדרש `x-org-id` והארגון נפתר דרך workspace lookup.

---

## 🧩 Call-sites שעודכנו

### AiBrainPanel

**קובץ**: `components/saas/AiBrainPanel.tsx`

- הוסר שימוש ב־`organizationId` ב־query/body לכל endpoints של `/api/admin/ai/*`.
- נוסף header `x-org-id` בכל הקריאות.
- `x-org-id` נקבע כך:
  - אם יש `selectedOrg.slug` -> משתמשים בו (orgSlug)
  - אחרת fallback ל־`selectedOrg.id`

### SystemControlPanel

**קובץ**: `components/saas/SystemControlPanel.tsx`

- `brain-export` עבר לשליחת `x-org-id` מה־pathname במקום `organizationId` ב־query.

---

## 🧪 אימות

- `npm -s run typecheck` -> ✅ עבר

---

## הערות/סיכונים

- שינוי זה **שובר אחורה** קריאות API שמסתמכות על `organizationId` ב־query/body (בכוונה).
- ל־`feature-settings` מחיקה גלובלית עובדת דרך `?scope=global` במקום `organizationId=null`.

---

## 🔜 המשך טבעי

- לוודא אם יש עוד endpoints פנימיים שמקבלים `organizationId/tenantId` בבקשות Admin/Tools, וליישר אותם ל־`x-org-id` בלבד.
