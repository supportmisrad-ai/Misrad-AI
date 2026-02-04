#!/usr/bin/env node
/**
 * יצירת 13 ארגוני דמו - כל החבילות והסטטוסים
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvLocalOnly() {
  const fullPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(fullPath)) return;
  const parsed = dotenv.parse(fs.readFileSync(fullPath));
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
}

function parseDbIdentity(urlValue) {
  try {
    if (!urlValue) return null;
    const u = new URL(String(urlValue));
    const port = u.port ? Number.parseInt(String(u.port), 10) : 5432;
    const database = u.pathname ? String(u.pathname).replace(/^\//, '') : '';
    return {
      host: u.hostname || null,
      port: Number.isFinite(port) ? port : 5432,
      database: database || null,
      user: u.username ? decodeURIComponent(u.username) : null,
    };
  } catch {
    return null;
  }
}

function printDbTargetToStderr() {
  const id = parseDbIdentity(process.env.DATABASE_URL);
  if (!id) {
    console.error('[create-demo-organizations] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[create-demo-organizations] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
  );
}

loadEnvLocalOnly();
printDbTargetToStderr();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const OWNER_ID = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';

const demoOrgs = [
  // 3 הארגונים המקוריים
  {
    name: 'מערכת Misrad AI שלי',
    slug: 'avoda-sheli',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_empire',
    trial_days: 365,
  },
  {
    name: 'בדיקות ופיתוח',
    slug: 'tests',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_empire',
    trial_days: 365,
  },
  {
    name: 'הדגמות ללקוחות',
    slug: 'demo',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_empire',
    trial_days: 365,
  },
  
  // 1-6: חבילות בעברית (לפי הסטנדרט החדש)
  {
    name: 'דמו - כל החבילות',
    slug: 'nexus-demo',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_mentor',
  },
  {
    name: 'דמו - חבילת שיווק ומיתוג',
    slug: 'social-demo',
    has_nexus: true, has_social: true, has_system: false, has_finance: false, has_client: true, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'the_authority',
  },
  {
    name: 'דמו - חבילת מכירות',
    slug: 'system-demo',
    has_nexus: true, has_social: false, has_system: true, has_finance: false, has_client: false, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'the_closer',
  },
  {
    name: 'דמו - מודול בודד (Finance)',
    slug: 'finance-demo',
    has_nexus: false, has_social: false, has_system: false, has_finance: true, has_client: false, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'solo',
  },
  {
    name: 'דמו - מודול בודד (Operations)',
    slug: 'client-demo',
    has_nexus: false, has_social: false, has_system: false, has_finance: false, has_client: false, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'solo',
  },
  {
    name: 'דמו - חבילת תפעול ושטח',
    slug: 'operations-demo',
    has_nexus: true, has_social: false, has_system: false, has_finance: true, has_client: false, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_operator',
  },
  
  // 7-10: מודולים בודדים (דמו)
  {
    name: 'דמו - מודול בודד (System)',
    slug: 'starter-demo',
    has_nexus: false, has_social: false, has_system: true, has_finance: false, has_client: false, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'solo',
  },
  {
    name: 'דמו - מודול בודד (Social)',
    slug: 'growth-demo',
    has_nexus: false, has_social: true, has_system: false, has_finance: false, has_client: false, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'solo',
  },
  {
    name: 'דמו - מודול בודד (Client)',
    slug: 'pro-demo',
    has_nexus: false, has_social: false, has_system: false, has_finance: false, has_client: true, has_operations: false,
    subscription_status: 'active',
    subscription_plan: 'solo',
  },
  {
    name: 'דמו - הכל כלול',
    slug: 'enterprise-demo',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'active',
    subscription_plan: 'the_empire',
  },
  
  // 11-13: סטטוסים שונים לטסטים
  {
    name: 'טסט - Trial',
    slug: 'test-trial',
    has_nexus: true, has_social: true, has_system: true, has_finance: true, has_client: true, has_operations: true,
    subscription_status: 'trial',
    subscription_plan: null,
  },
  {
    name: 'טסט - Expired',
    slug: 'test-expired',
    has_nexus: true, has_social: false, has_system: true, has_finance: false, has_client: false, has_operations: false,
    subscription_status: 'expired',
    subscription_plan: 'the_closer',
  },
  {
    name: 'טסט - Canceled',
    slug: 'test-canceled',
    has_nexus: true, has_social: false, has_system: true, has_finance: false, has_client: false, has_operations: false,
    subscription_status: 'canceled',
    subscription_plan: 'the_authority',
  },
];

async function main() {
  console.log('🏢 יוצר ארגוני דמו...\n');
  
  try {
    // בדוק אם המשתמש קיים
    const owner = await prisma.social_users.findUnique({
      where: { id: OWNER_ID }
    });
    
    if (!owner) {
      console.error(`❌ המשתמש ${OWNER_ID} לא נמצא!`);
      console.error('   הרץ קודם: npm run db:create:my-user\n');
      process.exit(1);
    }
    
    console.log(`✅ בעלים: ${owner.email || owner.full_name}\n`);
    
    let created = 0;
    let skipped = 0;
    
    for (const org of demoOrgs) {
      // בדוק אם כבר קיים
      const existing = await prisma.social_organizations.findFirst({
        where: { slug: org.slug }
      });
      
      if (existing) {
        await prisma.social_organizations.update({
          where: { id: existing.id },
          data: {
            name: org.name,
            owner_id: OWNER_ID,
            has_nexus: org.has_nexus,
            has_social: org.has_social,
            has_system: org.has_system,
            has_finance: org.has_finance,
            has_client: org.has_client,
            has_operations: org.has_operations,
            subscription_status: org.subscription_status,
            subscription_plan: org.subscription_plan,
            updated_at: new Date(),
          }
        });
        console.log(`🔄 ${org.name} - עודכן (${org.slug})`);
        skipped++;
        continue;
      }
      
      // צור ארגון חדש
      await prisma.social_organizations.create({
        data: {
          name: org.name,
          slug: org.slug,
          owner_id: OWNER_ID,
          has_nexus: org.has_nexus,
          has_social: org.has_social,
          has_system: org.has_system,
          has_finance: org.has_finance,
          has_client: org.has_client,
          has_operations: org.has_operations,
          subscription_status: org.subscription_status,
          subscription_plan: org.subscription_plan,
          created_at: new Date(),
          updated_at: new Date(),
        }
      });
      
      console.log(`✅ ${org.name} (${org.slug})`);
      created++;
    }
    
    console.log(`\n📊 סיכום:`);
    console.log(`   ✨ נוצרו: ${created} ארגונים`);
    if (skipped > 0) {
      console.log(`   🔄 עודכנו/דולגו: ${skipped} (כבר קיימים)`);
    }
    console.log(`   📍 סה"כ בדאטאבייס: ${created + skipped} ארגונים\n`);
    
    // הצג את כל הארגונים
    const allOrgs = await prisma.social_organizations.findMany({
      where: { owner_id: OWNER_ID },
      select: {
        slug: true,
        name: true,
        subscription_status: true,
        subscription_plan: true,
      },
      orderBy: { created_at: 'asc' }
    });
    
    console.log('🏢 ארגונים קיימים:');
    allOrgs.forEach((o, i) => {
      console.log(`   ${i + 1}. ${o.name} (${o.slug}) - ${o.subscription_status}`);
    });
    console.log('');
    
  } catch (error) {
    console.error('❌ שגיאה ביצירת ארגונים:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
