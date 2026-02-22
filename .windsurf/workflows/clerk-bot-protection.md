---
description: הגדרת Bot Protection ב-Clerk Dashboard + הגדרות חיוניות לפרודקשן
---

# הוראות הגדרת Clerk Dashboard — Bot Protection + הגדרות חיוניות

## שלב 1 — Bot Protection (הגנה מפני בוטים)

1. כנס ל-[https://dashboard.clerk.com](https://dashboard.clerk.com)
2. בחר את האפליקציה שלך (MISRAD AI — Production)
3. בתפריט השמאלי: **Configure → Attack Protection**
4. תחת **Bot Protection**:
   - הפעל **"Enable bot protection"** → ON
   - בחר רמה: **"Always on"** (מומלץ לפרודקשן)
   - זה מפעיל Cloudflare Turnstile CAPTCHA על sign-up ו-sign-in
5. לחץ **Save**

> ⚠️ אחרי הפעלת Bot Protection, ודא שב-`components/social/CustomAuth.tsx` יש `legalAccepted: true` ב-`authenticateWithRedirect` (כבר קיים בקוד).

---

## שלב 2 — Rate Limiting (הגבלת קצב)

1. באותו עמוד **Attack Protection**:
2. תחת **Rate Limiting**:
   - **Sign-up rate limit**: הפעל → מומלץ **10 per hour per IP**
   - **Sign-in rate limit**: הפעל → מומלץ **20 per hour per IP**
3. לחץ **Save**

---

## שלב 3 — Email Verification (אימות אימייל)

1. בתפריט: **Configure → Email, Phone, Username**
2. ודא שה-**Email address** מוגדר כ:
   - ✅ **Required**
   - ✅ **Verify at sign-up** = ON
3. לחץ **Save**

---

## שלב 4 — Allowed Redirect URLs (כתובות redirect מאושרות)

1. בתפריט: **Configure → Restrictions**
2. תחת **Allowlist** (אם רלוונטי):
   - הוסף: `https://misrad-ai.com`
   - הוסף: `https://www.misrad-ai.com`
3. בתפריט: **Configure → Paths**
4. ודא:
   - **Sign-in URL**: `/login`
   - **Sign-up URL**: `/login`
   - **After sign-in URL**: `/me`
   - **After sign-up URL**: `/me`
5. לחץ **Save**

---

## שלב 5 — Webhook (ודא שמוגדר נכון)

1. בתפריט: **Configure → Webhooks**
2. ודא שיש endpoint: `https://misrad-ai.com/api/webhooks/clerk`
3. ודא שה-events הבאים מסומנים:
   - ✅ `user.created`
   - ✅ `user.updated`
   - ✅ `user.deleted`
   - ✅ `organization.created`
   - ✅ `organizationMembership.created`
   - ✅ `organizationMembership.deleted`
4. העתק את **Signing Secret** → שמור ב-Vercel env vars כ-`CLERK_WEBHOOK_SECRET`

---

## שלב 6 — Session Settings (הגדרות session)

1. בתפריט: **Configure → Sessions**
2. מומלץ:
   - **Inactivity timeout**: 7 days
   - **Maximum session duration**: 30 days
3. לחץ **Save**

---

## שלב 7 — Vercel Environment Variables (ודא שכולם קיימים)

ב-[https://vercel.com](https://vercel.com) → הפרויקט → Settings → Environment Variables, ודא שקיימים:

| Variable | מקור |
|---|---|
| `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Signing Secret |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/login` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/me` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/me` |

---

## בדיקה לאחר ההגדרה

1. פתח חלון incognito → נסה להירשם → ודא שה-CAPTCHA מופיע
2. ב-Clerk Dashboard → **Logs** → ודא שה-events מגיעים
3. ב-Vercel → **Functions** → בדוק logs של `/api/webhooks/clerk`
