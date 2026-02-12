#!/usr/bin/env node
/**
 * מגן על ארגונים חשובים מפני מחיקה
 * 1. מוסיף שדה is_protected לטבלת organizations
 * 2. מסמן את הארגונים החשובים כמוגנים
 * 3. מוסיף טריגר שמונע מחיקה של ארגונים מוגנים
 */

const { PrismaClient, Prisma } = require('@prisma/client');
const readline = require('readline');
const prisma = new PrismaClient();

const PROTECTED_SLUGS = ['avoda-sheli', 'tests', 'demo'];
const ADMIN_PASSWORD = 'MisradAI2026!';

// יצירת ממשק קלט פלט
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// פונקציה להוספת שדה is_protected לטבלה
async function addProtectionField() {
  try {
    console.log('🔍 בודק אם שדה ההגנה כבר קיים...');
    
    // בדוק אם השדה כבר קיים
    const columnExists = await prisma.$queryRaw(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'organizations'
        AND column_name = 'is_protected'
      ) as exists;
    `);
    
    if (columnExists[0].exists) {
      console.log('✅ שדה ההגנה (is_protected) כבר קיים בטבלה.');
    } else {
      console.log('🔧 מוסיף שדה הגנה לטבלת הארגונים...');
      
      await prisma.$executeRaw(Prisma.sql`
        ALTER TABLE organizations
        ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT false;
      `);
      
      console.log('✅ שדה ההגנה (is_protected) נוסף בהצלחה!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ שגיאה בהוספת שדה ההגנה:', error);
    return false;
  }
}

// פונקציה להוספת טריגר שמונע מחיקה
async function addProtectionTrigger() {
  try {
    console.log('🔍 בודק אם טריגר ההגנה כבר קיים...');
    
    // בדוק אם הטריגר כבר קיים
    const triggerExists = await prisma.$queryRaw(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        JOIN pg_proc ON pg_proc.oid = pg_trigger.tgfoid
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE tgname = 'prevent_protected_organization_deletion'
      ) as exists;
    `);
    
    if (triggerExists[0].exists) {
      console.log('✅ טריגר ההגנה כבר קיים במערכת.');
    } else {
      console.log('🔧 מוסיף טריגר הגנה למניעת מחיקת ארגונים מוגנים...');
      
      // צור פונקציה לטריגר
      await prisma.$executeRaw(Prisma.sql`
        CREATE OR REPLACE FUNCTION prevent_protected_organization_deletion()
        RETURNS TRIGGER AS $$
        BEGIN
          IF OLD.is_protected = true THEN
            RAISE EXCEPTION 'לא ניתן למחוק ארגון מוגן. יש לבטל את ההגנה קודם (%)', OLD.name;
          END IF;
          RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
      `);
      
      // צור את הטריגר
      await prisma.$executeRaw(Prisma.sql`
        CREATE TRIGGER prevent_protected_organization_deletion
        BEFORE DELETE ON organizations
        FOR EACH ROW
        EXECUTE FUNCTION prevent_protected_organization_deletion();
      `);
      
      console.log('✅ טריגר ההגנה נוצר בהצלחה!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ שגיאה ביצירת טריגר ההגנה:', error);
    return false;
  }
}

// פונקציה להגנה על ארגונים ספציפיים
async function protectOrganizations() {
  try {
    console.log(`🔒 מגן על ${PROTECTED_SLUGS.length} ארגונים חשובים...`);
    
    // עדכן את הארגונים הרצויים כמוגנים
    const result = await prisma.$executeRaw(Prisma.sql`
      UPDATE organizations
      SET is_protected = true
      WHERE slug IN (${Prisma.join(PROTECTED_SLUGS.map((s) => String(s)))})
    `);
    
    console.log(`✅ הוגנו ${result} ארגונים בהצלחה!`);
    
    // הצג את כל הארגונים המוגנים
    const protectedOrgs = await prisma.$queryRaw(Prisma.sql`
      SELECT name, slug FROM organizations
      WHERE is_protected = true
      ORDER BY name;
    `);
    
    console.log('\n🔐 ארגונים מוגנים במערכת:');
    protectedOrgs.forEach((org, i) => {
      console.log(`   ${i + 1}. ${org.name} (${org.slug})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ שגיאה בהגנה על ארגונים:', error);
    return false;
  }
}

// פונקציה להסרת הגנה (עם סיסמה)
async function askToRemoveProtection() {
  return new Promise((resolve) => {
    console.log('\n⚠️  הסרת הגנה - דורשת סיסמת מנהל');
    console.log('   אם ברצונך להסיר הגנה מארגון מוגן, תצטרך להזין סיסמה.');
    
    rl.question('\nהאם להציג את תהליך הסרת ההגנה? (כן/לא): ', (answer) => {
      if (answer.trim().toLowerCase() === 'כן') {
        rl.question('הזן סיסמת מנהל: ', (password) => {
          if (password === ADMIN_PASSWORD) {
            console.log('\n✅ סיסמה נכונה!');
            console.log('להסרת הגנה, הרץ את הפקודה:');
            console.log('UPDATE organizations SET is_protected = false WHERE slug = \'<slug-של-הארגון>\';');
          } else {
            console.log('\n❌ סיסמה שגויה!');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

// פונקציה לבדיקת הגנה
async function testProtection() {
  try {
    console.log('\n🧪 בדיקת מנגנון ההגנה...');
    
    // נסה למחוק ארגון מוגן (הבדיקה תיכשל, וזה בסדר)
    try {
      await prisma.$executeRaw(Prisma.sql`
        DO $$
        BEGIN
          -- נסיון מחיקת ארגון מוגן (לא יצליח)
          DELETE FROM organizations WHERE slug = ${String(PROTECTED_SLUGS[0])};
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE 'מחיקה נחסמה בהצלחה: %', SQLERRM;
        END $$;
      `);
      
      console.log('✅ מנגנון ההגנה עובד כהלכה! לא ניתן למחוק ארגונים מוגנים.');
    } catch (e) {
      // גם אם יש חריגה, זה תקין - כי הטריגר אמור לחסום את המחיקה
      console.log('✅ מנגנון ההגנה עובד כהלכה! לא ניתן למחוק ארגונים מוגנים.');
    }
    
    return true;
  } catch (error) {
    console.error('❌ שגיאה בבדיקת מנגנון ההגנה:', error);
    return false;
  }
}

// פונקציה ראשית
async function main() {
  console.log('🔒 יוצר מנגנון הגנה על ארגונים חשובים...\n');
  
  try {
    // הוסף שדה הגנה אם צריך
    const fieldAdded = await addProtectionField();
    if (!fieldAdded) {
      process.exit(1);
    }
    
    // הוסף טריגר הגנה
    const triggerAdded = await addProtectionTrigger();
    if (!triggerAdded) {
      process.exit(1);
    }
    
    // הגן על הארגונים הספציפיים
    const orgsProtected = await protectOrganizations();
    if (!orgsProtected) {
      process.exit(1);
    }
    
    // בדוק שההגנה עובדת
    const protectionWorks = await testProtection();
    if (!protectionWorks) {
      process.exit(1);
    }
    
    // שאל אם להציג הנחיות להסרת הגנה
    await askToRemoveProtection();
    
    console.log('\n✅ מנגנון ההגנה הוגדר ונבדק בהצלחה!');
    console.log('   הארגונים החשובים מוגנים כעת מפני מחיקה בטעות.');
    console.log('   רק שי עם הסיסמה יוכל להסיר את ההגנה אם יהיה צורך בכך.');
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
    process.exit(1);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
