---
description: Clerk OAuth Google Sign-Up – הגדרה נכונה ופתרון בעיות (לאחר מסע ניפוי שגיאות אמיתי)
---

# Clerk OAuth Google Sign-Up – המדריך המלא

> **הערה**: מסמך זה נכתב לאחר ניפוי שגיאות מאומץ בסביבת Production.  
> כל הנקודות כאן הן **בעיות אמיתיות שקרו** – לא תיאוריה.

---

## 1. ארכיטקטורת האימות במערכת

```
משתמש לוחץ "Google" 
  → CustomAuth.tsx → signUp.authenticateWithRedirect(...)
  → Google OAuth
  → /sso-callback (AuthenticateWithRedirectCallback)
  → /login?mode=sign-up#/continue (אם נדרש המשך)
  → LoginPageClient.tsx (מטפל ב-#/continue)
  → setActive({ session }) → router.push('/workspaces/new')
  → webhook clerk user.created → יוצר organizationUser בDB
  → /api/legal/consent נשמר ב-DB
```

---

## 2. הגדרות Clerk Dashboard – קריטי

### 2.1 Account Portal Redirects
**נתיב**: Clerk Dashboard → Paths → Account Portal

| שדה | ערך נכון |
|-----|----------|
| Sign-in URL | `https://misrad-ai.com/login` |
| Sign-up URL | `https://misrad-ai.com/login?mode=sign-up` |
| After sign-in URL | `https://misrad-ai.com/me` |
| After sign-up URL | `https://misrad-ai.com/me` |

> ⚠️ **שים לב**: הכתובות חייבות להיות `misrad-ai.com` ולא `www.misrad-ai.com`. Clerk רגיש לזה.

### 2.2 User & Authentication Settings
**נתיב**: Clerk Dashboard → User & Authentication → Email, Phone, Username

| הגדרה | ערך נכון | הסבר |
|--------|----------|-------|
| Username | **Optional** | אם "Required" – Google OAuth נכשל כי גוגל לא מספקת username |
| Legal consent | **Enabled** | אם מופעל, חובה לעבור `legalAccepted: true` ב-SDK |

### 2.3 Social Connections (Google)
- ✅ Google OAuth מופעל
- ✅ Client ID ו-Client Secret מוגדרים
- ✅ Redirect URI ב-Google Cloud Console: `https://clerk.misrad-ai.com/v1/oauth_callback`

---

## 3. משתני סביבה – Vercel

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/login?mode=sign-up
CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/me
CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/me
```

> ⚠️ **שגיאה קריטית שמצאנו**: `signInFallbackRedirectUrl` היה מוגדר כ-`/login` (לולאה!)  
> תמיד צריך להיות `/me` – לא `/login`.

---

## 4. הבאג הגדול – Root Cause של לולאת ה-Redirect

### הסימפטום
```
[Login] OAuth continuation: NO CASE MATCHED.
signUp.status: missing_requirements
signIn.status: null
```
המשתמש נשלח חזרה ל-`/login?mode=sign-up#/continue` שוב ושוב.

### הסיבה האמיתית
Clerk v5 עם "Legal consent" מופעל ב-Dashboard מחזיר `missing_requirements` אם **לא** מעבירים `legalAccepted: true` ב-`authenticateWithRedirect`.

### הפתרון – `components/social/CustomAuth.tsx`
```typescript
// ❌ לפני התיקון – גרם ל-missing_requirements:
await signUp.authenticateWithRedirect({
  strategy,
  redirectUrl: '/sso-callback',
  redirectUrlComplete: signUpRedirect,
  // חסר! legalAccepted
});

// ✅ אחרי התיקון:
await signUp.authenticateWithRedirect({
  strategy,
  redirectUrl: '/sso-callback',
  redirectUrlComplete: signUpRedirect,
  legalAccepted: true,  // ← זה כל ההבדל
});
```

> **חוק ברזל**: בכל קריאה ל-`signUp.authenticateWithRedirect` כשיש "Legal consent" ב-Clerk Dashboard – חובה `legalAccepted: true`.  
> זה לא מופיע בדוקומנטציה הראשית של Clerk. גילינו את זה דרך ניפוי שגיאות.

---

## 5. בעיות נוספות שתוקנו

### 5.1 `window.location.assign` במקום `router.push`
`window.location.assign` גורם ל-hard reload לפני שה-Clerk session cookie מתאחד.  
**תמיד** להשתמש ב-`router.push()` לניווט פנימי אחרי OAuth.

### 5.2 `domain` ו-`isSatellite` ב-ClerkProvider
**אל תוסיף** `domain` ו-`isSatellite` ל-`ClerkProvider` אלא אם מדובר ב-multi-domain satellite architecture אמיתי.  
הוספה שלהם גרמה לבעיות בייצור. Clerk מזהה את ה-instance דרך `publishableKey`.

### 5.3 `proxyUrl` ב-ClerkProvider
`proxyUrl` גרם ל-403 בייצור. מושבת בכוונה:
```typescript
// ClerkProviderWithRouter.tsx
const finalProxyUrl = undefined; // מושבת – גרם ל-403 בפרודקשן
```

### 5.4 לולאה ב-RootPageClient
`router.push('/')` ממסך root גרם ללולאה אינסופית.  
תוקן ל-`router.push('/workspaces/new')` כשאין workspaces.

### 5.5 `/api/legal/consent` – 409 לאחר sign-up
**בעיה**: Race condition – ה-Clerk webhook `user.created` לא הספיק ליצור רשומת `organizationUser` לפני שה-client שולח consent.  
**פתרון**: כשה-record לא קיים, מחזירים `200 { ok: true, pending: true }` במקום `409`. ה-client שומר את ה-localStorage ומנסה שוב בטעינה הבאה.

---

## 6. זרימת ה-OAuth Continuation – `LoginPageClient.tsx`

כשמשתמש מגיע ל-`/login#/continue` אחרי OAuth, הקוד בודק case לפי סדר:

| Case | תנאי | פעולה |
|------|------|--------|
| 1 | `isSignedIn` | redirect לworkspace |
| 2 | `signIn.status === 'complete'` + sessionId | setActive → redirect |
| 3 | `signIn.firstFactorVerification.status === 'transferable'` | transferToSignUp |
| 4 | `signUp.status === 'complete'` + sessionId | setActive → redirect |
| 5 | `signUp.status === 'missing_requirements'` | reload + update fields |
| 6 | NO CASE MATCHED | log + fallback |

> Case 5 (**missing_requirements**) אמור לא לקרות אחרי שהוספנו `legalAccepted: true`.  
> אם הוא עדיין קורה, בדוק את הגדרות Clerk Dashboard שוב.

---

## 7. Checklist לפני deploy של שינויים ב-Auth

- [ ] `legalAccepted: true` קיים בכל קריאות `signUp.authenticateWithRedirect`
- [ ] `signInFallbackRedirectUrl` ו-`signUpFallbackRedirectUrl` מוגדרים ל-`/me` ב-Vercel
- [ ] Clerk Dashboard → Account Portal Redirects מצביעים ל-`misrad-ai.com` (לא `www.`)
- [ ] Username מוגדר כ-"Optional" ב-Clerk Dashboard
- [ ] כל ניווט פנימי אחרי auth משתמש ב-`router.push()` ולא `window.location.assign()`
- [ ] `proxyUrl` מושבת ב-`ClerkProviderWithRouter`
- [ ] `domain` ו-`isSatellite` **לא** מועברים ל-`ClerkProvider`
- [ ] `/sso-callback` מוגדר כ-public route ב-`middleware.ts`

---

## 8. הדרך לאבחן בעיות דומות בעתיד

### 1. הוסף לוגים ל-`sso-callback`
בדוק מה Clerk מחזיר: `signUp.status`, `signIn.status`, `missingFields`.

### 2. בדוק את ה-Console של הדפדפן
חפש:
- `[Login] OAuth continuation: NO CASE MATCHED` → Case לא מטופל
- `[Login] Case 5: missing_requirements` → Legal consent חסר
- `username is not a valid parameter` → Username לא דרוש ב-Clerk אבל הקוד מנסה לעדכן אותו

### 3. בדוק Clerk Dashboard → Users
ראה מה ה-`status` של המשתמש שניסה להירשם. אם הוא נשאר ב-`missing_requirements` – זה Clerk-side issue.

### 4. בדוק `__client_uat` cookie
אם `__client_uat=0` אחרי OAuth – הsession לא נוצר. הסיבה בדרך כלל: `missing_requirements` שלא טופל.

---

## 9. קבצים מרכזיים

| קובץ | תפקיד |
|------|--------|
| `components/social/CustomAuth.tsx` | OAuth initiation – `authenticateWithRedirect` |
| `app/sso-callback/page.tsx` | OAuth callback handler |
| `app/login/LoginPageClient.tsx` | Continuation handler (`#/continue`) |
| `app/ClerkProviderWithRouter.tsx` | Clerk config |
| `app/layout.tsx` | signInUrl, signUpUrl, fallback URLs |
| `middleware.ts` | Public routes, Clerk middleware |
| `app/api/legal/consent/route.ts` | שמירת הסכמת תנאים ב-DB |
| `app/api/webhooks/clerk/route.ts` | user.created → יצירת organizationUser |
