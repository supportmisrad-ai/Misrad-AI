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
    console.error('[create-my-user-v2] DATABASE_URL -> (missing/invalid)');
    return;
  }
  console.error(
    `[create-my-user-v2] DATABASE_URL -> host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`
  );
}

loadEnvLocalOnly();
printDbTargetToStderr();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'itsikdahan1@gmail.com';
  const fixedId = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';
  const clerkUserId = 'user_itsikdahan1_super_admin';
  const fullName = 'Itsik Dahan';
  const role = 'owner'; // מגדיר אותך כ-Owner של הארגונים

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
      
      // עדכון ל-Owner אם הוא לא
      if (existingUser.role !== role) {
        console.log(`🔄 מעדכן תפקיד מ-${existingUser.role} ל-${role}...`);
        await prisma.organizationUser.update({
          where: { id: existingUser.id },
          data: { role: role }
        });
        console.log('✅ תפקיד עודכן בהצלחה.');
      } else {
        console.log('✅ התפקיד כבר מעודכן.');
      }
      
      // בדיקה אם ה-ID תואם למה שאנחנו צריכים לארגוני הדמו
      if (existingUser.id !== fixedId) {
        console.warn(`⚠️  שים לב: ה-ID של המשתמש (${existingUser.id}) שונה מה-ID הקבוע בסקריפטים (${fixedId}).`);
        console.warn('   זה אומר שארגוני הדמו ייווצרו, אבל צריך לוודא שהם מקושרים ל-ID הנכון.');
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
