# מיפוי שמות: Prisma ↔ Database

## למה הדוקומנט הזה קיים?

כשכותבים **raw SQL** בפרויקט הזה, אתה **לא** משתמש בשמות המודלים של Prisma.
אתה חייב להשתמש בשמות הטבלאות והעמודות **האמיתיים** ב-PostgreSQL.

זה גורם לבלבול כי Prisma מאפשר לשנות שמות דרך `@@map()` ו-`@map()`.

---

## מיפוי טבלאות ראשיות

| שם מודל Prisma | שם טבלה ב-DB | הערות |
|----------------|--------------|-------|
| `OrganizationUser` | `organization_users` | משתמשי מערכת |
| `social_organizations` | `organizations` | ארגונים/workspaces |
| `TeamMember` | `team_members` | חברי צוות |
| `NexusUser` | `nexus_users` | משתמשי Nexus |
| `ClientClient` | `client_clients` | לקוחות Client |
| `social_posts` | `social_posts` | פוסטים Social |

---

## מיפוי עמודות קריטיות

### OrganizationUser (organization_users)

| שדה Prisma | עמודה ב-DB | הערות |
|-----------|-----------|-------|
| `last_location_org` | `last_org_slug` | ⚠️ שונה! |
| `clerk_user_id` | `clerk_user_id` | זהה |
| `organization_id` | `organization_id` | זהה |

### social_organizations (organizations)

| שדה Prisma | עמודה ב-DB | הערות |
|-----------|-----------|-------|
| `id` | `id` | זהה |
| `slug` | `slug` | זהה |
| `name` | `name` | זהה |
| `owner_id` | `owner_id` | זהה |

---

## איך למצוא את שם הטבלה/עמודה האמיתי?

### דרך 1: חפש ב-schema.prisma

```prisma
model OrganizationUser {
  last_location_org String? @map("last_org_slug")  // ← שם העמודה האמיתי
  
  @@map("organization_users")  // ← שם הטבלה האמיתי
}
```

### דרך 2: הרץ את הסקריפט הזה

```powershell
# מציג את כל הטבלאות ב-DB
npx.cmd dotenv -e .env.local -- prisma db execute --stdin <<< "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
```

### דרך 3: בדוק קוד קיים

חפש בקבצים שכבר משתמשים ב-raw SQL:
- `@C:\Projects\Misrad-AI\lib\services\operations\db.ts` - דוגמאות `orgQuery`
- `@C:\Projects\Misrad-AI\lib\prisma.ts` - `queryRawOrgScoped` examples

---

## Best Practices: עבודה עם SQL

### ✅ DO: השתמש ב-Prisma Client

```typescript
// המומלץ - Prisma Client משתמש בשמות הנכונים אוטומטית
const user = await prisma.OrganizationUser.findUnique({
  where: { clerk_user_id: userId }
});
```

### ✅ DO: אם חייבים raw SQL - שמות DB אמיתיים

```typescript
// נכון - שמות טבלאות/עמודות אמיתיים מה-DB
await queryRawOrgScoped(prisma, {
  organizationId: orgId,
  reason: 'my_query',
  query: `
    SELECT id, clerk_user_id, last_org_slug
    FROM organization_users
    WHERE organization_id = $1
  `,
  values: [orgId]
});
```

### ❌ DON'T: raw SQL עם שמות Prisma

```typescript
// שגוי - ייתן שגיאה "relation does not exist"
await queryRawOrgScoped(prisma, {
  organizationId: orgId,
  reason: 'my_query',
  query: `
    SELECT id, clerk_user_id, last_location_org
    FROM OrganizationUser
    WHERE organization_id = $1
  `,
  values: [orgId]
});
```

### ⚠️ WATCH OUT: PostgreSQL reserved words

מילים שמורות שאסור להשתמש בהן כשמות:
- `user`, `current_user`, `session_user`
- `table`, `column`, `index`
- `order`, `group`, `having`

**פתרון:** השתמש בשמות CTE אחרים כמו `my_user`, `user_data`, וכו'.

---

## Checklist לפני כתיבת raw SQL

- [ ] בדקתי את שם הטבלה האמיתי ב-`schema.prisma` (`@@map()`)
- [ ] בדקתי את שמות העמודות האמיתיים ב-`schema.prisma` (`@map()`)
- [ ] השתמשתי ב-`queryRawOrgScoped` / `queryRawTenantScoped` (לא `$queryRawUnsafe`)
- [ ] ודאתי שאין מילים שמורות של PostgreSQL ב-query
- [ ] בדקתי את ה-CTE scope (CTEs זמינים רק בשאילתה אחת, לא בשאילתות נפרדות)

---

## למה זה ככה?

Prisma נותן **abstraction layer** מעל ה-DB:
- שמות "יפים" וקריאים בקוד (`OrganizationUser`)
- שמות אמיתיים ב-DB לפי conventions (`organization_users`)
- אפשרות לשנות convention דרך `@@map()`

זה **לא באג** - זה תכונה שמאפשרת לנו:
1. לשמור על DB schema ישן
2. להשתמש בשמות קריאים בקוד
3. לעשות migrations בהדרגה

אבל כשכותבים **raw SQL**, אנחנו עוקפים את Prisma ועובדים ישירות מול ה-DB,
אז חייבים להשתמש בשמות האמיתיים.

---

## שאלות נפוצות

**Q: איך אני יודע אם צריך raw SQL או Prisma Client?**

A: העדפה: **Prisma Client תמיד**. raw SQL רק אם:
- צריך שאילתות מורכבות שPrisma לא תומך בהן
- צריך ביצועים מקסימליים (aggregations, joins מורכבים)
- צריך פונקציות PostgreSQL ספציפיות

**Q: מה ההבדל בין `queryRawOrgScoped` ל-`$queryRawUnsafe`?**

A: 
- `queryRawOrgScoped` - מאובטח, מוסיף `organization_id` scoping אוטומטית
- `$queryRawUnsafe` - **חסום** במערכת שלנו (tenant isolation)

**Q: איך אני מוודא שלא עשיתי טעות בשמות?**

A: הרץ את הסקריפט `show-my-workspaces.js` כדוגמא - הוא משתמש ב-Prisma Client הנכון.
