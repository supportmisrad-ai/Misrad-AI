# תיעוד שינויים - OrgSlug enforcement (Requests UI + System Flags API)

**תאריך**: 2026-02-03  
**סטטוס**: ✅ הושלם + `typecheck` עבר

---

## 🎯 מטרת השינוי

להמשיך את המהלך של **ביטול הבחירה בארגון לפי `profile`/`organizationId`/`tenantId`** והכרחת עבודה לפי `orgSlug`.

בסט הזה היו שני מוקדים:

1. **Social / Requests (UI)**
   - לחבר את פעולות ה־UI (שליחת בקשה ללקוח / עדכון סטטוס בקשה) ל־server actions.
   - לוודא ש־`orgSlug` עובר לכל פעולה, ללא `openComingSoon()`.

2. **System Flags API (`/api/system/flags`)**
   - לנעול את ה־API כך ש־workspace context יגיע **רק** דרך header `x-org-id` (שהוא `orgSlug`).
   - להסיר fallbacks ישנים של `organizationId/tenantId` ב־query/body.

---

## ✅ מה השתנה בפועל

### 1) Social: חיבור Requests UI ל־server actions

**קבצים מעורבים**:
- `components/social/workspace/useClientWorkspaceHandlers.ts`
- `components/social/ClientWorkspace.tsx`

**מה נוסף/שונה**:

- **`handleSendManagerRequest`**
  - קורא ל־`createManagerRequest({ orgSlug, clientId, title, description, type })`.
  - מעדכן State של `managerRequests` אחרי הצלחה.
  - מציג toast להצלחה/שגיאה.

- **`handleUpdateRequestStatus`**
  - עבור `processed`:
    - קורא ל־`approveClientRequest(requestId, orgSlug)`.
    - מעדכן State של `clientRequests` (סטטוס ל־`processed`).
  - עבור `needs_fix`:
    - קורא ל־`rejectClientRequest(requestId, orgSlug, comment)`.
    - מעדכן State של `clientRequests` (סטטוס ל־`needs_fix` + `managerComment`).

- **הרחבת props של `useClientWorkspaceHandlers`**
  - נוספו:
    - `setClientRequests`
    - `setManagerRequests`

**Guardrails**:
- אם אין `orgSlug` פעיל -> פעולה נעצרת עם toast (`'חסר ארגון פעיל'`).

---

### 2) System: נעילת `/api/system/flags` ל־`x-org-id` בלבד

**קובץ**:
- `app/api/system/flags/route.ts`

**מה השתנה**:

- GET:
  - הוסר שימוש ב־`organizationId/tenantId` כ־fallback ב־query.
  - אם הגיע `organizationId`/`tenantId` ב־query -> מוחזר `400`.
  - נדרש `x-org-id` כדי לפתור Workspace (`getWorkspaceByOrgKeyOrThrow`).

- PATCH:
  - הוסר שימוש ב־`organizationId/tenantId` כ־fallback ב־body.
  - אם הגיע `organizationId`/`tenantId` ב־body -> מוחזר `400`.
  - נדרש `x-org-id` בלבד.

**תוצאה**:
- ה־API לא מאפשר יותר “להזריק” org context דרך body/query.

---

### 3) תיקון call-site שמפר את הכלל

**קובץ**:
- `components/social/admin-panel/tabs/OrganizationsTab.tsx`

**מה השתנה**:
- הקריאה ל־`PATCH /api/system/flags` עברה לשלוח:
  - header: `x-org-id: editForm.slug`
  - body: רק `{ screenId, status }`
- הוסר `tenantId: editForm.organizationId` מה־body.

---

## 🧪 אימות

- `npm -s run typecheck` -> ✅ עבר

---

## 🔜 מה נשאר לעשות (המשך טבעי)

- לנעול/ליישר קו גם עם endpoints אחרים שמקבלים `organizationId` בגוף (בעיקר Super Admin APIs), למשל:
  - `app/api/admin/ai/credits/route.ts`
  - `app/api/admin/ai/ingest-history/route.ts`
  - `app/api/admin/ai/feature-settings/route.ts`

המטרה: workspace context לפי `x-org-id`/`orgSlug` בלבד, בלי `organizationId` ב־body.
