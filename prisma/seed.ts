import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ========================================
// הגדרות קבועות מהסכימה בלבד
// ========================================

const AVAILABLE_PLANS = [
  'solo',
  'the_closer',
  'the_authority',
  'the_operator',
  'the_empire',
  'the_mentor',
] as const;

const ROLE_SUPER_ADMIN = 'מנכ״ל'; // מתוך lib/constants/roles.ts

// ========================================
// זיהוי סביבה
// ========================================

function detectEnvironment(): 'DEV' | 'PROD' {
  const dbUrl = process.env.DATABASE_URL || '';
  const directUrl = process.env.DIRECT_URL || '';
  
  // זיהוי PROD: aws-1-ap-northeast-2 (קוריאה) = PROD
  // זיהוי DEV: aws-1-ap-south-1 (הודו) = DEV
  if (dbUrl.includes('aws-1-ap-northeast-2') || directUrl.includes('aws-1-ap-northeast-2')) {
    return 'PROD';
  }
  
  return 'DEV';
}

// ========================================
// פונקציות יצירה
// ========================================

async function createOrFindUser(env: 'DEV' | 'PROD') {
  const email = 'itsikdahan1@gmail.com';
  const name = 'יצחק דהן';
  const clerkUserId = env === 'PROD' 
    ? 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
    : 'user_36taRKpH1VdyycRdg9POOD0trxH';

  console.log(`\n🔍 Looking for existing user...`);
  
  let user = await prisma.organizationUser.findFirst({
    where: {
      OR: [
        { email: { equals: email, mode: 'insensitive' } },
        { clerk_user_id: clerkUserId },
      ],
    },
  });

  if (!user) {
    console.log(`📝 Creating user: ${name} (${email})`);
    user = await prisma.organizationUser.create({
      data: {
        clerk_user_id: clerkUserId,
        email,
        full_name: name,
        role: ROLE_SUPER_ADMIN,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    console.log(`✅ User created: ${user.id}`);
  } else {
    console.log(`✅ User exists: ${user.id}`);
  }

  return user;
}

async function createMainOrganization(env: 'DEV' | 'PROD', ownerId: string) {
  const orgName = env === 'PROD' ? 'Misrad AI HQ' : 'Test Admin Org';
  const slug = env === 'PROD' ? 'misrad-ai-hq' : 'test-admin';
  const plan = 'the_empire'; // החבילה הכי גבוהה

  console.log(`\n🏢 Creating main organization: ${orgName}`);

  const existingOrg = await prisma.organization.findFirst({
    where: { name: orgName },
  });

  if (existingOrg) {
    console.log(`⚠️  Organization "${orgName}" already exists, skipping...`);
    return existingOrg;
  }

  const org = await prisma.organization.create({
    data: {
      name: orgName,
      slug,
      owner_id: ownerId,
      has_nexus: true,
      has_social: true,
      has_system: true,
      has_finance: true,
      has_client: true,
      has_operations: true,
      subscription_status: 'active',
      subscription_plan: plan,
      seats_allowed: 10,
      trial_days: 0,
      balance: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  await prisma.organizationUser.update({
    where: { id: ownerId },
    data: {
      organization_id: org.id,
      role: ROLE_SUPER_ADMIN,
      updated_at: new Date(),
    },
  });

  console.log(`✅ Main organization created: ${org.id}`);
  console.log(`   📦 Plan: ${plan}`);
  console.log(`   🔑 Status: active`);
  
  return org;
}

async function createTestOrganizations(ownerId: string) {
  console.log(`\n🧪 Creating test organizations for all plans...`);
  console.log(`📋 Plans found in schema: ${AVAILABLE_PLANS.join(', ')}`);

  const createdOrgs: Array<{ name: string; plan: string; status: string }> = [];

  for (const plan of AVAILABLE_PLANS) {
    const orgName = `Test ${plan.replace(/_/g, ' ').toUpperCase()}`;
    const slug = `test-${plan}`;
    
    // בדיקה אם קיים
    const existing = await prisma.organization.findFirst({
      where: { slug },
    });

    if (existing) {
      console.log(`   ⏭️  Skipping "${orgName}" - already exists`);
      continue;
    }

    // גוון של מודולים בהתאם לחבילה
    const modules = getModulesForPlan(plan);
    const status = plan === 'solo' ? 'trial' : 'active';

    const org = await prisma.organization.create({
      data: {
        name: orgName,
        slug,
        owner_id: ownerId,
        ...modules,
        subscription_status: status,
        subscription_plan: plan,
        seats_allowed: plan === 'solo' ? 1 : 5,
        trial_days: status === 'trial' ? 14 : 0,
        balance: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    createdOrgs.push({ name: orgName, plan, status });
    console.log(`   ✅ Created: ${orgName} (${plan}, ${status})`);
  }

  return createdOrgs;
}

function getModulesForPlan(plan: string): {
  has_nexus: boolean;
  has_social: boolean;
  has_system: boolean;
  has_finance: boolean;
  has_client: boolean;
  has_operations: boolean;
} {
  // מבוסס על lib/billing/pricing.ts
  switch (plan) {
    case 'solo':
      return {
        has_nexus: false,
        has_social: false,
        has_system: true, // דוגמה: solo עם system
        has_finance: false,
        has_client: false,
        has_operations: false,
      };
    case 'the_closer':
      return {
        has_nexus: true,
        has_social: false,
        has_system: true,
        has_finance: true, // bonus
        has_client: false,
        has_operations: false,
      };
    case 'the_authority':
      return {
        has_nexus: true,
        has_social: true,
        has_system: false,
        has_finance: true, // bonus
        has_client: true,
        has_operations: false,
      };
    case 'the_operator':
      return {
        has_nexus: true,
        has_social: false,
        has_system: false,
        has_finance: true, // bonus
        has_client: false,
        has_operations: true,
      };
    case 'the_empire':
    case 'the_mentor':
      return {
        has_nexus: true,
        has_social: true,
        has_system: true,
        has_finance: true,
        has_client: true,
        has_operations: true,
      };
    default:
      return {
        has_nexus: false,
        has_social: false,
        has_system: false,
        has_finance: false,
        has_client: false,
        has_operations: false,
      };
  }
}

// ========================================
// Main
// ========================================

async function main() {
  console.log('🌱 Starting intelligent seed...');
  console.log('═══════════════════════════════════════');

  const env = detectEnvironment();
  console.log(`🌍 Environment detected: ${env}`);

  const user = await createOrFindUser(env);
  const mainOrg = await createMainOrganization(env, user.id);
  const testOrgs = await createTestOrganizations(user.id);

  console.log('\n═══════════════════════════════════════');
  console.log('🎉 Seed completed successfully!');
  console.log('═══════════════════════════════════════');
  console.log(`\n� Summary:`);
  console.log(`   🌍 Environment: ${env}`);
  console.log(`   👤 User: ${user.full_name} (${user.email})`);
  console.log(`   🆔 Clerk ID: ${user.clerk_user_id}`);
  console.log(`   🏢 Main Org: ${mainOrg.name}`);
  console.log(`   📦 Main Plan: ${mainOrg.subscription_plan}`);
  console.log(`\n🧪 Test Organizations Created: ${testOrgs.length}`);
  
  if (testOrgs.length > 0) {
    console.log(`\n� Plans Coverage:`);
    testOrgs.forEach(({ name, plan, status }) => {
      console.log(`   • ${plan.padEnd(20)} → ${name} (${status})`);
    });
  }

  console.log(`\n✨ All ${AVAILABLE_PLANS.length} plans from schema are covered!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
