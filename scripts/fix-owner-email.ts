/**
 * תיקון owner_email - מציאת המשתמש הנכון ועדכון
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixOwnerEmail() {
  console.log('🔧 מתקן owner_email...\n');

  try {
    // מציאת המשתמש
    const user = await prisma.organizationUser.findFirst({
      where: {
        OR: [
          { clerk_user_id: 'user_39UkuSmIkk20b1MuAahuYqWHKoe' },
          { email: { contains: 'itsikdahan1', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('❌ משתמש לא נמצא!');
      // צור משתמש חדש
      const newUser = await prisma.organizationUser.create({
        data: {
          clerk_user_id: 'user_39UkuSmIkk20b1MuAahuYqWHKoe',
          email: 'itsikdahan1@gmail.com',
          full_name: 'יצחק דהן',
          role: 'super_admin',
          is_super_admin: true,
        }
      });
      console.log('✅ נוצר משתמש חדש:', newUser.id);
      
      // עדכן את הארגונים
      const updated = await prisma.organization.updateMany({
        where: {
          slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
        },
        data: {
          owner_id: newUser.id
        }
      });
      console.log(`✅ עודכנו ${updated.count} ארגונים עם owner חדש\n`);
    } else {
      console.log('✅ נמצא משתמש:', user.email);
      
      // עדכן את הארגונים
      const updated = await prisma.organization.updateMany({
        where: {
          slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
        },
        data: {
          owner_id: user.id
        }
      });
      console.log(`✅ עודכנו ${updated.count} ארגונים\n`);
    }

    // אימות
    const validation = await prisma.organization.findMany({
      where: {
        slug: { in: ['misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c'] }
      },
      include: {
        owner: {
          select: {
            email: true,
            full_name: true,
          }
        }
      }
    });

    console.log('📊 תוצאות אימות:');
    console.table(validation.map(v => ({
      slug: v.slug,
      name: v.name,
      owner_email: v.owner?.email || 'NULL',
      owner_name: v.owner?.full_name || 'NULL',
    })));

  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixOwnerEmail();
