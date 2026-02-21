# Clerk Email Templates — עברית RTL | MISRAD AI

> **הוראות:** העתק כל טמפלייט והדבק בדשבורד של Clerk תחת Email Templates.
> כל הטמפלייטים מעוצבים ב-RTL עברית עם מיתוג MISRAD AI.

---

## 🔐 Authentication — אימות

---

### 1. Email link — Sign in (קישור כניסה)

```html
<re-html>
<re-head>
    <re-title>
        כניסה ל-{{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        הקישור שלך לכניסה ל-{{app.name}} מוכן
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                היי, טוב שחזרת 👋
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                מישהו (בתקווה אתה) ביקש קישור כניסה ל-{{app.name}}. לחץ על הכפתור למטה כדי להיכנס. הקישור תקף ל-{{ttl_minutes}} דקות.
            </re-text>
            <re-button padding="16px 48px" href="{{magic_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                כניסה לחשבון ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{magic_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת את זה?</b> הבקשה נשלחה מ-<b>{{requested_from}}</b> בשעה <b>{{requested_at}}</b>. אם לא יזמת את הבקשה, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 2. Email link — Sign up (קישור הרשמה)

```html
<re-html>
<re-head>
    <re-title>
        הרשמה ל-{{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        ברוכים הבאים ל-{{app.name}} — אשר את ההרשמה שלך
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                ברוכים הבאים ל-{{app.name}} 🚀
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                שמחים שהחלטת להצטרף! לחץ על הכפתור למטה כדי להשלים את ההרשמה וליצור את החשבון שלך. הקישור תקף ל-{{ttl_minutes}} דקות.
            </re-text>
            <re-button padding="16px 48px" href="{{magic_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                השלמת הרשמה ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{magic_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת את זה?</b> הבקשה נשלחה מ-<b>{{requested_from}}</b> בשעה <b>{{requested_at}}</b>. אם לא יזמת את הבקשה, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 3. Email link — Verify email (אימות כתובת אימייל)

```html
<re-html>
<re-head>
    <re-title>
        אימות כתובת האימייל — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        אמת את כתובת האימייל שלך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                אימות כתובת האימייל ✉️
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                כדי לוודא שכתובת האימייל שלך שייכת אליך, לחץ על הכפתור למטה. הקישור תקף ל-{{ttl_minutes}} דקות.
            </re-text>
            <re-button padding="16px 48px" href="{{magic_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                אימות האימייל ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{magic_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת את זה?</b> אם לא יזמת אימות כתובת אימייל ב-{{app.name}}, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 4. Invitation (הזמנה למערכת)

```html
<re-html>
<re-head>
    <re-title>
        הוזמנת להצטרף ל-{{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        {{inviter_name}} מזמין אותך להצטרף ל-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                יש לך הזמנה! 🎉
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                <b>{{inviter_name}}</b> מזמין אותך להצטרף ל-<b>{{app.name}}</b>. לחץ על הכפתור למטה כדי לקבל את ההזמנה וליצור את החשבון שלך.
            </re-text>
            <re-button padding="16px 48px" href="{{invitation_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                קבלת ההזמנה ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{invitation_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא מכיר את השולח?</b> אם אינך מצפה להזמנה זו, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 5. Verification code (קוד אימות)

```html
<re-html>
<re-head>
    <re-title>
        קוד האימות שלך — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        קוד האימות שלך ב-{{app.name}}: {{code}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                קוד האימות שלך 🔐
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                הזן את הקוד הבא כדי להמשיך. הקוד תקף ל-{{ttl_minutes}} דקות.
            </re-text>
            <re-text margin="32px 0px 32px 0px" align="center" font-size="40px" color="#0f172a" font-weight="bold" padding="24px 0px" background-color="#f1f5f9" border-radius="16px" letter-spacing="12px">
                {{code}}
            </re-text>
            <re-text margin="0px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                העתק את הקוד והזן אותו בחלון האימות.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת קוד אימות?</b> אם לא יזמת בקשה זו, אפשר להתעלם מהמייל הזה בבטחה. מישהו עשוי שהזין את כתובת האימייל שלך בטעות.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## 🛡️ Security — אבטחה

---

### 6. Account Locked (חשבון נעול)

```html
<re-html>
<re-head>
    <re-title>
        החשבון שלך נעול — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        החשבון שלך ב-{{app.name}} ננעל עקב ניסיונות כניסה רבים
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px" border-color="#fecaca" border-width="1px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#dc2626" font-size="26px">
                החשבון שלך ננעל 🔒
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                זיהינו מספר ניסיונות כניסה כושלים לחשבונך ב-<b>{{app.name}}</b>. לצורך הגנה על חשבונך, הוא ננעל באופן זמני.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                <b>מה עכשיו?</b> המתן מספר דקות ונסה שוב, או אפס את הסיסמה שלך. אם אתה מאמין שמישהו מנסה לגשת לחשבונך — אפס את הסיסמה מיד.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fef2f2" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#991b1b" align="right">
                <b>טיפ אבטחה:</b> לעולם אל תשתף את הסיסמה שלך עם אף אחד. צוות {{app.name}} לעולם לא יבקש ממך את הסיסמה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 7. Password changed (סיסמה שונתה)

```html
<re-html>
<re-head>
    <re-title>
        הסיסמה שלך שונתה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        הסיסמה של חשבונך ב-{{app.name}} שונתה בהצלחה
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                הסיסמה שונתה בהצלחה ✅
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                רצינו לעדכן אותך שהסיסמה של חשבונך ב-<b>{{app.name}}</b> שונתה בהצלחה.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם ביצעת את השינוי — הכל בסדר, אין צורך לעשות דבר. אם לא שינית את הסיסמה, אנא פנה אלינו מיד.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>שמירה על אבטחה:</b> מומלץ להשתמש בסיסמה ייחודית שאינך משתמש בה באתרים אחרים.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 8. Password removed (סיסמה הוסרה)

```html
<re-html>
<re-head>
    <re-title>
        הסיסמה הוסרה מהחשבון — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        הסיסמה הוסרה מחשבונך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                הסיסמה הוסרה מהחשבון 🔑
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                רצינו לעדכן אותך שהסיסמה הוסרה מחשבונך ב-<b>{{app.name}}</b>. מעתה תוכל להיכנס באמצעות שיטות אימות אחרות (כמו Google או קישור באימייל).
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם לא ביצעת את השינוי הזה, אנא פנה אלינו מיד.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fff7ed" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#92400e" align="right">
                <b>שים לב:</b> אם ברצונך להגדיר סיסמה חדשה, תוכל לעשות זאת דרך הגדרות החשבון שלך בכל עת.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 9. Primary email address changed (כתובת אימייל ראשית שונתה)

```html
<re-html>
<re-head>
    <re-title>
        כתובת האימייל שונתה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        כתובת האימייל הראשית בחשבונך ב-{{app.name}} עודכנה
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                כתובת האימייל שונתה ✉️
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                רצינו לעדכן אותך שכתובת האימייל הראשית בחשבונך ב-<b>{{app.name}}</b> עודכנה.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם ביצעת את השינוי — הכל תקין. אם לא אתה ששינית את כתובת האימייל, אנא פנה אלינו מיד כדי לאבטח את חשבונך.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fff7ed" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#92400e" align="right">
                <b>חשוב:</b> אם לא ביצעת שינוי זה, ייתכן שמישהו מנסה לגשת לחשבונך. מומלץ לשנות את הסיסמה שלך באופן מיידי.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 10. Reset password code (קוד איפוס סיסמה)

```html
<re-html>
<re-head>
    <re-title>
        קוד איפוס סיסמה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        קוד איפוס הסיסמה שלך ב-{{app.name}}: {{code}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                איפוס סיסמה 🔑
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                קיבלנו בקשה לאפס את הסיסמה שלך ב-<b>{{app.name}}</b>. הזן את הקוד הבא כדי להמשיך. הקוד תקף ל-{{ttl_minutes}} דקות.
            </re-text>
            <re-text margin="32px 0px 32px 0px" align="center" font-size="40px" color="#0f172a" font-weight="bold" padding="24px 0px" background-color="#f1f5f9" border-radius="16px" letter-spacing="12px">
                {{code}}
            </re-text>
            <re-text margin="0px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                העתק את הקוד והזן אותו בעמוד איפוס הסיסמה.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת איפוס סיסמה?</b> אפשר להתעלם מהמייל הזה בבטחה. הסיסמה שלך לא תשתנה עד שתזין את הקוד.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 11. Sign in from new device (כניסה ממכשיר חדש)

```html
<re-html>
<re-head>
    <re-title>
        כניסה ממכשיר חדש — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        זוהתה כניסה לחשבונך ב-{{app.name}} ממכשיר חדש
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px" border-color="#bfdbfe" border-width="1px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                כניסה ממכשיר חדש 📱
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                זיהינו כניסה לחשבונך ב-<b>{{app.name}}</b> ממכשיר או מיקום שלא השתמשת בהם בעבר.
            </re-text>
            <re-text margin="24px 0px 0px 0px" align="right" font-size="14px" color="#334155" padding="20px 24px" background-color="#f1f5f9" border-radius="12px">
                <b>מכשיר:</b> {{device}}<br/>
                <b>מיקום:</b> {{location}}<br/>
                <b>זמן:</b> {{time}}
            </re-text>
            <re-text margin="24px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם זה אתה — הכל בסדר. אם אתה לא מזהה כניסה זו, מומלץ לשנות את הסיסמה שלך מיד.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#eff6ff" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#1e40af" align="right">
                <b>טיפ אבטחה:</b> אם אינך מזהה את הפעילות הזו, שנה את הסיסמה שלך ובדוק את ההתקנים המחוברים לחשבונך.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## 🔑 Passkeys — מפתחות גישה

---

### 12. Passkey added (מפתח גישה נוסף)

```html
<re-html>
<re-head>
    <re-title>
        מפתח גישה חדש נוסף — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        מפתח גישה (Passkey) חדש נוסף לחשבונך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                מפתח גישה חדש נוסף 🔐
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                רצינו לעדכן אותך שמפתח גישה (Passkey) חדש נוסף לחשבונך ב-<b>{{app.name}}</b>. מעתה תוכל להשתמש בו לכניסה מהירה ומאובטחת.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם לא ביצעת פעולה זו, אנא היכנס לחשבונך מיד ובדוק את מפתחות הגישה שלך.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>מה זה Passkey?</b> מפתח גישה הוא שיטת אימות מתקדמת המאפשרת כניסה באמצעות טביעת אצבע, זיהוי פנים, או מפתח אבטחה פיזי — ללא צורך בסיסמה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 13. Passkey removed (מפתח גישה הוסר)

```html
<re-html>
<re-head>
    <re-title>
        מפתח גישה הוסר — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        מפתח גישה (Passkey) הוסר מחשבונך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                מפתח גישה הוסר 🗝️
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                רצינו לעדכן אותך שמפתח גישה (Passkey) הוסר מחשבונך ב-<b>{{app.name}}</b>.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אם ביצעת את השינוי — הכל בסדר. אם לא הסרת מפתח גישה, מומלץ לבדוק את הגדרות האבטחה של חשבונך.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fff7ed" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#92400e" align="right">
                <b>שים לב:</b> אם לא נשארו שיטות כניסה אחרות, מומלץ להוסיף מפתח גישה חדש או לוודא שיש לך סיסמה פעילה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## 🏢 Organizations — ארגונים (לעתיד)

> הטמפלייטים הבאים יהיו זמינים כשתפעיל Organizations / Verified Domains ב-Clerk.

---

### 14. Affiliation code (קוד שיוך לארגון)

```html
<re-html>
<re-head>
    <re-title>
        קוד אימות דומיין — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        קוד אימות הדומיין שלך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                אימות דומיין הארגון 🏢
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                הזן את הקוד הבא כדי לאמת את הדומיין של הארגון שלך ב-<b>{{app.name}}</b>.
            </re-text>
            <re-text margin="32px 0px 32px 0px" align="center" font-size="40px" color="#0f172a" font-weight="bold" padding="24px 0px" background-color="#f1f5f9" border-radius="16px" letter-spacing="12px">
                {{code}}
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא ביקשת אימות?</b> אם לא יזמת בקשה זו, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 15. Organization invitation (הזמנה לארגון)

```html
<re-html>
<re-head>
    <re-title>
        הוזמנת להצטרף לארגון — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        הוזמנת להצטרף לארגון ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                הוזמנת לסביבת עבודה 🤝
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                הוזמנת להצטרף לסביבת עבודה ב-<b>{{app.name}}</b>. לחץ על הכפתור למטה כדי לקבל את ההזמנה ולהתחיל.
            </re-text>
            <re-button padding="16px 48px" href="{{invitation_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                הצטרפות לסביבת העבודה ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{invitation_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f1f5f9" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#64748b" align="right">
                <b>לא מכיר את ההזמנה?</b> אם אינך מצפה להזמנה זו, אפשר להתעלם מהמייל הזה בבטחה.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 16. Organization invitation accepted (הזמנה לארגון אושרה)

```html
<re-html>
<re-head>
    <re-title>
        ההזמנה לארגון אושרה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        ההזמנה שלך לסביבת העבודה ב-{{app.name}} אושרה
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                ההזמנה אושרה! ✅
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                שמחים לבשר שההזמנה שלך לסביבת העבודה ב-<b>{{app.name}}</b> אושרה. מעתה תוכל לגשת לסביבת העבודה ולהתחיל לעבוד.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>בהצלחה!</b> היכנס ל-{{app.name}} כדי לראות את סביבת העבודה החדשה שלך.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 17. Organization joined (הצטרפות לארגון אושרה)

```html
<re-html>
<re-head>
    <re-title>
        בקשת ההצטרפות אושרה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        בקשת ההצטרפות שלך לסביבת העבודה ב-{{app.name}} אושרה
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                ההצטרפות אושרה! 🎉
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                בקשתך להצטרף לסביבת העבודה ב-<b>{{app.name}}</b> אושרה. מעתה תוכל לגשת לכל התכנים ולהתחיל לעבוד עם הצוות.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>ברוכים הבאים!</b> היכנס ל-{{app.name}} כדי להתחיל.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 18. Organization membership requested (בקשת הצטרפות לארגון)

```html
<re-html>
<re-head>
    <re-title>
        בקשת הצטרפות חדשה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        משתמש מבקש להצטרף לסביבת העבודה שלך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                בקשת הצטרפות חדשה 👤
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                משתמש חדש מבקש להצטרף לסביבת העבודה שלך ב-<b>{{app.name}}</b>. היכנס לדשבורד הניהול כדי לאשר או לדחות את הבקשה.
            </re-text>
            <re-button padding="16px 48px" href="{{action_url}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                צפייה בבקשה ←
            </re-button>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#eff6ff" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#1e40af" align="right">
                <b>למנהלים בלבד:</b> הודעה זו נשלחת למנהלי סביבת העבודה בלבד.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## ⏳ Waitlist — רשימת המתנה (לעתיד)

---

### 19. Waitlist confirmation (אישור רשימת המתנה)

```html
<re-html>
<re-head>
    <re-title>
        נרשמת לרשימת ההמתנה — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        נרשמת בהצלחה לרשימת ההמתנה של {{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                נרשמת בהצלחה! ⏳
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                תודה שנרשמת לרשימת ההמתנה של <b>{{app.name}}</b>. נעדכן אותך ברגע שנפתח לך גישה למערכת.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                בינתיים — שמור על הקשר. אנחנו עובדים קשה כדי להביא לך את החוויה הכי טובה.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#f5f3ff" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#5b21b6" align="right">
                <b>רוצה לזרז?</b> שתף את {{app.name}} עם חברים — ככל שיותר אנשים מצטרפים, כך נוכל לפתוח גישה מהר יותר.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 20. Waitlist invitation (הזמנה מרשימת ההמתנה)

```html
<re-html>
<re-head>
    <re-title>
        תורך הגיע! — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        תורך הגיע — הגישה שלך ל-{{app.name}} מוכנה!
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                תורך הגיע! 🎉
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                חיכינו לרגע הזה — הגישה שלך ל-<b>{{app.name}}</b> מוכנה! לחץ על הכפתור למטה כדי ליצור את החשבון שלך ולהתחיל.
            </re-text>
            <re-button padding="16px 48px" href="{{invitation_link}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                יצירת חשבון ←
            </re-button>
            <re-text margin="24px 0px 0px 0px" font-size="13px" color="#94a3b8" align="right">
                אם הכפתור לא עובד, <a href="{{invitation_link}}" style="color: #6366f1; text-decoration: underline;">לחץ כאן</a>.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>ברוכים הבאים!</b> אנחנו שמחים שהצטרפת. אם יש שאלות — אנחנו כאן בשבילך.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## 💳 Billing — חיוב (לעתיד)

---

### 21. Free Trial Ending Soon (תקופת הניסיון מסתיימת)

```html
<re-html>
<re-head>
    <re-title>
        תקופת הניסיון מסתיימת — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        תקופת הניסיון שלך ב-{{app.name}} עומדת להסתיים
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px" border-color="#fed7aa" border-width="1px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                תקופת הניסיון מסתיימת בקרוב ⏰
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                תקופת הניסיון שלך ב-<b>{{app.name}}</b> עומדת להסתיים. כדי להמשיך ליהנות מכל היכולות של המערכת, שדרג עכשיו לאחת מהחבילות שלנו.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                אל תפסיד את הנתונים שצברת — שדרוג לחבילה ישמור הכל כפי שהוא.
            </re-text>
            <re-button padding="16px 48px" href="{{action_url}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#6366f1" color="#ffffff" font-weight="bold">
                שדרוג החשבון ←
            </re-button>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fff7ed" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#92400e" align="right">
                <b>שאלות?</b> אנחנו כאן לעזור — צור קשר ונשמח להתאים לך את החבילה המושלמת.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 22. Payment Attempt — Failed (תשלום נכשל)

```html
<re-html>
<re-head>
    <re-title>
        בעיה בתשלום — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        הייתה בעיה בעיבוד התשלום שלך ב-{{app.name}}
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px" border-color="#fecaca" border-width="1px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#dc2626" font-size="26px">
                בעיה בתשלום ⚠️
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                ניסיון החיוב האחרון שלך ב-<b>{{app.name}}</b> נכשל. כדי להבטיח שהגישה שלך למערכת לא תיפגע, עדכן את אמצעי התשלום.
            </re-text>
            <re-button padding="16px 48px" href="{{action_url}}" font-size="16px" border-radius="12px" margin="32px 0px 0px 0px" background-color="#dc2626" color="#ffffff" font-weight="bold">
                עדכון אמצעי תשלום ←
            </re-button>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#fef2f2" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#991b1b" align="right">
                <b>צריך עזרה?</b> לפעמים התשלום נכשל בגלל כרטיס שפג תוקף או חסימת הבנק. אם הבעיה ממשיכה, צור איתנו קשר.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

### 23. Payment Attempt — Success (תשלום הצליח)

```html
<re-html>
<re-head>
    <re-title>
        קבלה על תשלום — {{app.name}}
    </re-title>
</re-head>
<re-body background-color="#f8fafc" padding="0px 0px 0px 0px">
    <re-preheader>
        התשלום שלך ב-{{app.name}} התקבל בהצלחה
    </re-preheader>
    <re-header padding="32px 32px 24px 32px" background-color="#0f172a">
        <re-text font-size="24px" color="#ffffff" align="center">
            {{> app_logo}}
        </re-text>
    </re-header>
    <re-main background-color="#f8fafc" border-radius="0px">
        <re-block border-radius="16px" align="right" padding="48px 40px 48px 40px" background-color="#ffffff" font-size="14px" margin="24px 24px 0px 24px">
            <re-heading margin="0px 0px 0px 0px" level="h1" align="right" color="#0f172a" font-size="26px">
                תודה על התשלום! 💚
            </re-heading>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                התשלום שלך ב-<b>{{app.name}}</b> התקבל בהצלחה. קבלה מפורטת מצורפת לנוחיותך.
            </re-text>
            <re-text margin="16px 0px 0px 0px" align="right" font-size="15px" color="#334155" line-height="1.7">
                תודה שאתה חלק מ-{{app.name}}. אנחנו כאן כדי לוודא שהמערכת עובדת בשבילך בצורה הטובה ביותר.
            </re-text>
        </re-block>
        <re-block border-radius="16px" align="right" padding="24px 40px 24px 40px" background-color="#ecfdf5" margin="16px 24px 24px 24px">
            <re-text font-size="13px" color="#065f46" align="right">
                <b>קבלה:</b> פרטי התשלום המלאים זמינים באזור הניהול שלך ב-{{app.name}}.
            </re-text>
        </re-block>
    </re-main>
</re-body>
</re-html>
```

---

## 📋 סיכום כל הטמפלייטים

| # | קטגוריה | שם הטמפלייט | סטטוס |
|---|---------|------------|-------|
| 1 | Authentication | Email link — Sign in | ✅ זמין |
| 2 | Authentication | Email link — Sign up | ✅ זמין |
| 3 | Authentication | Email link — Verify email | ✅ זמין |
| 4 | Authentication | Invitation | ✅ זמין |
| 5 | Authentication | Verification code | ✅ זמין |
| 6 | Security | Account Locked | ✅ זמין |
| 7 | Security | Password changed | ✅ זמין |
| 8 | Security | Password removed | ✅ זמין |
| 9 | Security | Primary email address changed | ✅ זמין |
| 10 | Security | Reset password code | ✅ זמין |
| 11 | Security | Sign in from new device | ✅ זמין |
| 12 | Passkeys | Passkey added | ✅ זמין |
| 13 | Passkeys | Passkey removed | ✅ זמין |
| 14 | Organizations | Affiliation code | 🔒 דורש הפעלה |
| 15 | Organizations | Organization invitation | 🔒 דורש הפעלה |
| 16 | Organizations | Organization invitation accepted | 🔒 דורש הפעלה |
| 17 | Organizations | Organization joined | 🔒 דורש הפעלה |
| 18 | Organizations | Organization membership requested | 🔒 דורש הפעלה |
| 19 | Waitlist | Waitlist confirmation | 🔒 דורש הפעלה |
| 20 | Waitlist | Waitlist invitation | 🔒 דורש הפעלה |
| 21 | Billing | Free Trial Ending Soon | 🔒 דורש הפעלה |
| 22 | Billing | Payment Attempt — Failed | 🔒 דורש הפעלה |
| 23 | Billing | Payment Attempt — Success | 🔒 דורש הפעלה |

---

> **עיצוב:** הדר כהה (#0f172a) · אינדיגו (#6366f1) · רקע בהיר (#f8fafc) · RTL עברי מלא
> **מיתוג:** MISRAD AI — כל הטמפלייטים תואמים לשפת העיצוב של המערכת
