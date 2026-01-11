-- ============================================================
-- Strategic Content (The Content Injection)
-- ============================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.strategic_content (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  title text not null,
  content text not null,
  module_id text not null
);

alter table public.strategic_content enable row level security;

alter table public.strategic_content force row level security;

drop policy if exists strategic_content_public_read on public.strategic_content;
create policy strategic_content_public_read
on public.strategic_content
for select
using (true);

drop policy if exists strategic_content_super_admin_write on public.strategic_content;
create policy strategic_content_super_admin_write
on public.strategic_content
for all
using (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true)
with check (coalesce((auth.jwt() -> 'app_metadata' ->> 'is_super_admin')::boolean, false) = true);

create unique index if not exists strategic_content_unique
on public.strategic_content (module_id, category, title);

delete from public.strategic_content
where (module_id = 'social' and category = 'scripts')
   or (module_id = 'system' and category in ('sales_mastery', 'objections'));

insert into public.strategic_content (category, title, content, module_id)
values
  (
    'scripts',
    'תסריט בניית סמכות - לשיחת היכרות ראשונית',
    'היי [שם הלקוח], מה שלומך? המטרה של השיחה היא להבין אם הפתרון שלי מתאים לצרכים שלך. ספר לי קצת על [המוצר/השירות] שלך? מי קהל היעד האידיאלי? אחרי שמישהו קונה ממך, מהי התוצאה הסופית שהוא מקבל? מה המכשול הכי גדול שמונע ממך להגיע ליעד ההכנסה שלך כרגע?',
    'social'
  ),
  (
    'sales_mastery',
    'מתודולוגיית מכירה: מעבר ממצב ''תקוע'' למצב ''צמיחה''',
    'שלב 1: סמול טוק מקצועי. שלב 2: גילוי - הבנת הפער בין המצב הנוכחי ליעד הרצוי. שלב 3: הצגת תוכנית הפעולה ב-3 צעדים: אבחון עסקי, הגדרת יעדים מדידים, ובניית תוכנית עבודה צעד אחר צעד. שלב 4: המחשת התוצאה הסופית - יותר לקוחות, ניהול זמן אפקטיבי וחוסן מנטלי בניהול העסק.',
    'system'
  ),
  (
    'objections',
    'מדריך לטיפול בהתנגדויות - גרסה כללית למכירות פרימיום',
    '- ''יקר לי'': בוא נבדוק מה המחיר של להישאר באותו מצב לעומת ההחזר על ההשקעה מהתוכנית.

''צריך לחשוב על זה'': מה בדיוק חסר לך כדי לקבל החלטה בטוחה עכשיו? אני כאן כדי לענות על הכל.

''אין לי כסף'': אני מבין, וזו בדיוק הסיבה שאנחנו צריכים לבנות לך מנגנון שמייצר הכנסה יציבה. בוא נבדוק פריסת תשלומים.',
    'system'
  )
on conflict (module_id, category, title)
do update set
  content = excluded.content;

commit;
