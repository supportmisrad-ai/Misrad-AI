/**
 * תיקון owner ל-Clerk ID הנכון של PROD
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CORRECT_PROD_CLERK_ID = 'user_39UkuSmIkk20b1MuAahuYqWHKoe';

async function fixOwnerToCorrectClerkId() {
  console.log('🔧 מתקן owner ל-Clerk ID הנכון של PROD...\n');

  try {
    // 1. מציאת המשתמש הנכון
    let correctUser = await prisma.organizationUser.findFirst({
      where: { clerk_user_id: CORRECT_PROD_CLERK_ID }
    });

    if (!correctUser) {
      console.log('❌ משתמש עם Clerk ID הנכון לא נמצא!');
      console.log('   יוצר משתמש חדש...\n');
      
      correctUser = await prisma.organizationUser.create({
        data: {
          clerk_user_id: CORRECT_PROD_CLERK_ID,
          email: 'itsikdahan1@gmail.com',
          full_name: 'יצחק דהן',
          role: 'super_admin',
        }
      });
      console.log('✅ נוצר משתמש:', correctUser.id, correctUser.email);
    } else {
      console.log('✅ נמצא משתמש:', correctUser.email, '|', correctUser.clerk_user_id);
    }

    // 2. עדכון כל הארגונים
    const updated = await prisma.organization.updateMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      data: {
        owner_id: correctUser.id,
        updated_at: new Date()
      }
    });

    console.log(`\n✅ עודכנו ${updated.count} ארגונים\n`);

    // 3. אימות
    const orgs = await prisma.organization.findMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      include: {
        owner: {
          select: {
            email: true,
            clerk_user_id: true,
            full_name: true,
          }
        }
      }
    });

    console.log('📊 תוצאות אימות:\n');
    orgs.forEach(org => {
      console.log(`ארגון: ${org.name} (${org.slug})`);
      console.log(`  Owner: ${org.owner?.full_name} | ${org.owner?.email}`);
      console.log(`  Clerk ID: ${org.owner?.clerk_user_id}`);
      console.log(`  ✅ תקין: ${org.owner?.clerk_user_id === CORRECT_PROD_CLERK_ID ? 'כן' : '❌ לא!'}\n`);
    });

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixOwnerToCorrectClerkId();
