# 🗄️ הוראות הגדרת Database - Supabase

> DEPRECATED - Historic Only

## 📋 תוכן עניינים
1. [הכנה](#הכנה)
2. [הרצת הסקריפט](#הרצת-הסקריפט)
3. [אימות](#אימות)
4. [מיגרציה מנתונים קיימים](#מיגרציה-מנתונים-קיימים)

---

## 🔧 הכנה

### 1. פתח את Supabase Dashboard
- היכנס ל-[Supabase Dashboard](https://app.supabase.com)
- בחר את הפרויקט שלך

### 2. פתח את SQL Editor
- לחץ על **SQL Editor** בתפריט הצד
- לחץ על **New Query**

---

## 🚀 הרצת הסקריפט

### אופציה 1: יצירת טבלאות חדשות (מומלץ לפרויקט חדש)

**⚠️ אזהרה: זה ימחק את כל הנתונים הקיימים!**

1. פתח את הקובץ `supabase-complete-schema.sql`
2. העתק את כל התוכן
3. הדבק ב-SQL Editor
4. **הסר את ההערות** בשורות 20-28 (השורות שמתחילות ב-`-- DROP TABLE`)
5. לחץ על **Run** (או `Ctrl+Enter`)

### אופציה 2: עדכון טבלאות קיימות (שומר נתונים)

אם יש לך נתונים קיימים, השתמש בסקריפטים הנפרדים:

1. **ראשית, הרץ את `supabase-schema.sql`** (אם עדיין לא רץ)
2. **אז, הרץ את `supabase-roles-permissions-schema.sql`**
3. **לבסוף, הרץ את `supabase-integrations-schema.sql`**

---

## ✅ אימות

לאחר הרצת הסקריפט, בדוק שהכל עבד:

### 1. בדוק שהטבלאות נוצרו

הרץ את השאילתה הבאה:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**צריך לראות:**
- ✅ `users`
- ✅ `clients`
- ✅ `tasks`
- ✅ `time_entries`
- ✅ `tenants`
- ✅ `roles`
- ✅ `permissions`
- ✅ `integrations`

### 2. בדוק שה-Permissions הוכנסו

```sql
SELECT * FROM permissions;
```

**צריך לראות 7 הרשאות:**
- `view_crm`
- `view_financials`
- `view_assets`
- `view_intelligence`
- `manage_team`
- `manage_system`
- `delete_data`

### 3. בדוק שה-Roles הוכנסו

```sql
SELECT name, is_system, array_length(permissions, 1) as permissions_count 
FROM roles 
ORDER BY is_system DESC, name;
```

**צריך לראות 12 תפקידים:**
- מנכ״ל (system)
- אדמין (system)
- סמנכ״ל מכירות
- מנהלת שיווק
- איש מכירות
- מנהל אופרציה
- עובד שיווק
- אדמיניסטרציה
- הנהלת חשבונות
- מנהל קהילה
- עובד
- פרילנסר

### 4. בדוק Foreign Keys

```sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;
```

**צריך לראות Foreign Keys:**
- `tasks.creator_id` → `users.id`
- `tasks.assignee_id` → `users.id`
- `tasks.client_id` → `clients.id`
- `time_entries.user_id` → `users.id`
- `users.manager_id` → `users.id`
- `users.role_id` → `roles.id`
- `integrations.user_id` → `users.id`

---

## 🔄 מיגרציה מנתונים קיימים

אם יש לך נתונים קיימים, **אל תמחק אותם!** השתמש בסקריפטים הנפרדים:

### שלב 1: גיבוי נתונים

```sql
-- גיבוי users
CREATE TABLE users_backup AS SELECT * FROM users;

-- גיבוי tasks
CREATE TABLE tasks_backup AS SELECT * FROM tasks;

-- גיבוי clients
CREATE TABLE clients_backup AS SELECT * FROM clients;
```

### שלב 2: הוסף עמודות חדשות

```sql
-- הוסף manager_id ו-role_id ל-users (אם עדיין לא קיים)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
```

### שלב 3: עדכן נתונים קיימים

```sql
-- עדכן role_id לפי role name (דוגמה)
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.role = r.name
AND u.role_id IS NULL;
```

---

## 🐛 פתרון בעיות

### שגיאה: "relation already exists"
- הטבלה כבר קיימת. השתמש ב-`DROP TABLE IF EXISTS` או ב-`ALTER TABLE` במקום `CREATE TABLE`.

### שגיאה: "foreign key constraint fails"
- יש נתונים שסותרים את ה-Foreign Keys. בדוק את הנתונים לפני הוספת ה-Constraints.

### שגיאה: "invalid input syntax for type uuid"
- יש נתונים עם IDs שלא בפורמט UUID. צריך להמיר אותם או למחוק אותם.

---

## 📞 תמיכה

אם יש בעיות, בדוק:
1. ✅ שהסקריפט רץ במלואו (ללא שגיאות)
2. ✅ שהטבלאות נוצרו (בדוק ב-Table Editor)
3. ✅ שה-Indexes נוצרו (בדוק ב-SQL Editor)
4. ✅ שה-Triggers נוצרו (בדוק ב-Database → Triggers)

---

## ✨ סיום

לאחר שהכל עובד:
1. ✅ בדוק שהאפליקציה מתחברת ל-Database
2. ✅ נסה ליצור משתמש חדש
3. ✅ נסה ליצור משימה חדשה
4. ✅ בדוק שה-Foreign Keys עובדים

**הכל מוכן! 🎉**

