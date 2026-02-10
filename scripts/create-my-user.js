const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'itsikdahan1@gmail.com';
  const fixedId = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';
  const clerkUserId = 'user_itsikdahan1_super_admin';
  const fullName = 'Itsik Dahan';
  const role = 'owner'; // מוגדר כ-Owner (המקביל לסופר אדמין ברמת הארגון)

  console.log(`🔍 בודק אם המשתמש ${email} קיים...`);

  try {
    // נסה למצוא משתמש לפי אימייל
    const existingUser = await prisma.organizationUser.findFirst({
      where: {
        email: {
          equals: email,
          mode: 'insensitive'
        }
      }
    });

    if (existingUser) {
      console.log('✅ המשתמש כבר קיים במערכת:');
      console.log(`   ID: ${existingUser.id}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      
      // אופציונלי: עדכון ל-Owner אם הוא לא
      if (existingUser.role !== role) {
        console.log('🔄 מעדכן תפקיד ל-owner...');
        await prisma.organizationUser.update({
          where: { id: existingUser.id },
          data: { role: role }
        });
        console.log('✅ תפקיד עודכן בהצלחה.');
      }
    } else {
      console.log('✨ המשתמש לא נמצא. יוצר משתמש חדש...');
      
      const newUser = await prisma.organizationUser.create({
        data: {
          id: fixedId,
          email: email,
          clerk_user_id: clerkUserId,
          full_name: fullName,
          role: role,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      console.log('✅ משתמש נוצר בהצלחה!');
      console.log(`   ID: ${newUser.id}`);
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Role: ${newUser.role}`);
    }

  } catch (error) {
    console.error('❌ שגיאה ביצירת המשתמש:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
