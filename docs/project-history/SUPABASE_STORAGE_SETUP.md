# הגדרת Supabase Storage

## שלב 1: יצירת Storage Bucket

1. היכנס ל-[Supabase Dashboard](https://supabase.com/dashboard)
2. בחר את הפרויקט שלך
3. לך ל-**Storage** בתפריט השמאלי
4. לחץ על **"New bucket"**
5. מלא את הפרטים:
   - **Name**: `attachments`
   - **Public bucket**: ✅ כן (כדי שניתן יהיה לגשת לקבצים דרך URL)
   - **File size limit**: `52428800` (50MB)
   - **Allowed MIME types**: השאר ריק (לאפשר כל סוגי הקבצים)
6. לחץ **"Create bucket"**

---

## שלב 2: הגדרת הרשאות (RLS Policies)

לאחר יצירת ה-bucket, צריך להגדיר הרשאות כדי שמשתמשים יוכלו להעלות ולקרוא קבצים.

### Policy 1: Allow authenticated users to upload files

1. לך ל-**Storage** → **Policies** → בחר את ה-bucket `attachments`
2. לחץ **"New Policy"**
3. בחר **"For full customization"**
4. השם: `Allow authenticated uploads`
5. ה-SQL:
   ```sql
   (
     bucket_id = 'attachments'::text
     AND (auth.role() = 'authenticated'::text)
   )
   ```
6. **Allowed operations**: בחר רק `INSERT`
7. לחץ **"Review"** ואז **"Save policy"**

### Policy 2: Allow public read access

1. לחץ **"New Policy"** שוב
2. השם: `Allow public read`
3. ה-SQL:
   ```sql
   (
     bucket_id = 'attachments'::text
   )
   ```
4. **Allowed operations**: בחר רק `SELECT`
5. לחץ **"Review"** ואז **"Save policy"**

### Policy 3: Allow users to delete their own files

1. לחץ **"New Policy"** שוב
2. השם: `Allow users to delete own files`
3. ה-SQL:
   ```sql
   (
     bucket_id = 'attachments'::text
     AND (auth.role() = 'authenticated'::text)
     AND (storage.foldername(name))[1] = auth.uid()::text
   )
   ```
4. **Allowed operations**: בחר רק `DELETE` (לא SELECT!)
5. לחץ **"Review"** ואז **"Save policy"**

**⚠️ חשוב:** אם יש לך policy עם אותו שם אבל עם SELECT - מחק אותו! למחיקה לא צריך SELECT.

**🔍 איך לזהות איזה למחוק:**
- **Policy עם SELECT** → מחק! (SELECT זה לקריאה, לא למחיקה)
- **Policy עם DELETE** → השאר! (DELETE זה מה שצריך למחיקת קבצים)

**📋 דוגמה:**
```
Policy: "Allow users to delete own files"
Actions: SELECT  ← מחק את זה!

Policy: "Allow users to delete own files"  
Actions: DELETE  ← השאר את זה!
```

---

## ❓ שאלות נפוצות:

### האם צריך UPDATE policy?
**לא!** המשתמשים לא צריכים לעדכן קבצים. אם צריך לשנות קובץ, עדיף למחוק ולהעלות חדש (יותר בטוח).

### האם צריך Service Role (ALL) policy?
**לא!** אנחנו כבר משתמשים ב-`SUPABASE_SERVICE_ROLE_KEY` ב-API routes, וזה עוקף את כל ה-RLS policies אוטומטית. לא צריך policy נוסף.

### איך למחוק policy כפול?
1. לך ל-Storage → Policies → בחר את ה-bucket `attachments`
2. מצא את ה-policy עם SELECT (לא DELETE)
3. לחץ על ה-3 נקודות → Delete

---

## שלב 3: בדיקה

לאחר הגדרת ה-bucket וה-policies:

### בדיקה אוטומטית (מומלץ):

1. הרץ את השרת: `npm run dev`
2. פתח בדפדפן: `http://localhost:4000/api/storage/test`
3. בדוק את התוצאה - אמור לראות:
   ```json
   {
     "success": true,
     "message": "All storage checks passed! ✅",
     "checks": {
       "supabaseConfigured": true,
       "authenticated": true,
       "bucketExists": true,
       "canUpload": true,
       "canRead": true,
       "canDelete": true
     }
   }
   ```

### בדיקה ידנית:

1. נסה להעלות קובץ במשימה
2. בדוק ב-Supabase Dashboard → Storage → `attachments` שהקובץ הועלה
3. בדוק שהקובץ נגיש דרך URL ציבורי

---

## הערות חשובות:

- **Public bucket**: ה-bucket הוא public, כך שכל הקבצים נגישים דרך URL. אם אתה צריך פרטיות, תצטרך להגדיר signed URLs.
- **File organization**: הקבצים מאורגנים לפי `userId/folder/filename` כדי להקל על ניהול.
- **File size limit**: מוגבל ל-50MB. אם אתה צריך יותר, עדכן את ה-limit ב-bucket settings.

---

## פתרון בעיות:

### בעיה: "new row violates row-level security policy"
**פתרון**: ודא שה-policies מוגדרות נכון ושהמשתמש authenticated.

### בעיה: "Bucket not found"
**פתרון**: ודא שה-bucket נקרא בדיוק `attachments` (case-sensitive).

### בעיה: "Upload failed"
**פתרון**: 
1. בדוק את ה-console logs
2. ודא שה-SUPABASE_SERVICE_ROLE_KEY מוגדר נכון ב-.env.local
3. בדוק שה-bucket הוא public

---

**אחרי שתסיים את ההגדרות - הכל אמור לעבוד! 🎉**

