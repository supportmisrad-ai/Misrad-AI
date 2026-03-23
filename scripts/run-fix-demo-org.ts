/**
 * הרצת תיקון ארגון הדגמה - Prisma Script Runner
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function runFixDemoOrg() {
  console.log('🚀 מתחיל תיקון ארגון הדגמה...\n');

  try {
    // 1. ניתוק ארגונים מ-business_clients
    console.log('📝 שלב 1: ניתוק ארגונים מלקוחות עסקיים...');
    const updateOrgs = await prisma.$executeRaw`
      UPDATE organizations 
      SET 
          client_id = NULL,
          updated_at = NOW()
      WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
        AND client_id IS NOT NULL
    `;
    console.log(`✅ עודכנו ${updateOrgs} ארגונים\n`);

    // 2. עדכון owner לסופר אדמין
    console.log('📝 שלב 2: עדכון owner לסופר אדמין...');
    const updateOwner = await prisma.$executeRaw`
      UPDATE organizations
      SET 
          owner_id = (
              SELECT id 
              FROM organization_users 
              WHERE clerk_user_id = 'user_39UkuSmIkk20b1MuAahuYqWHKoe'
                 OR email ILIKE 'itsikdahan1@gmail.com'
              LIMIT 1
          ),
          updated_at = NOW()
      WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
    `;
    console.log(`✅ עודכנו ${updateOwner} ארגונים\n`);

    // 3. ניקוי אימיילים כפולים
    console.log('📝 שלב 3: ניקוי אימיילים כפולים ב-nexus_users...');
    
    // מציאת כפילויות
    const duplicates = await prisma.$queryRaw<Array<{ organization_id: string, email: string, count: bigint }>>`
      SELECT 
          organization_id,
          email,
          COUNT(*) as count
      FROM nexus_users
      WHERE organization_id IN (
          SELECT id FROM organizations 
          WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
      )
      GROUP BY organization_id, email
      HAVING COUNT(*) > 1
    `;
    
    console.log(`נמצאו ${duplicates.length} אימיילים כפולים`);
    
    if (duplicates.length > 0) {
      // מחיקת כפילויות
      const deleteResult = await prisma.$executeRaw`
        WITH duplicate_emails AS (
            SELECT 
                organization_id,
                email,
                MIN(created_at) as first_created,
                COUNT(*) as count
            FROM nexus_users
            WHERE organization_id IN (
                SELECT id FROM organizations 
                WHERE slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
            )
            GROUP BY organization_id, email
            HAVING COUNT(*) > 1
        ),
        to_delete AS (
            SELECT nu.id
            FROM nexus_users nu
            INNER JOIN duplicate_emails de 
                ON nu.organization_id = de.organization_id 
                AND nu.email = de.email
            WHERE nu.created_at > de.first_created
        )
        DELETE FROM nexus_users
        WHERE id IN (SELECT id FROM to_delete)
      `;
      console.log(`✅ נמחקו ${deleteResult} רשומות כפולות\n`);
    } else {
      console.log(`✅ אין אימיילים כפולים\n`);
    }

    // 4. אימות תקינות
    console.log('📊 שלב 4: בדיקת תקינות...\n');
    
    const validation = await prisma.$queryRaw<Array<{
      slug: string;
      name: string;
      should_be_null: string | null;
      owner_email: string;
      users_count: bigint;
      tasks_count: bigint;
      clients_count: bigint;
    }>>`
      SELECT 
          o.slug,
          o.name,
          o.client_id as should_be_null,
          ou.email as owner_email,
          (SELECT COUNT(*) FROM nexus_users WHERE organization_id = o.id) as users_count,
          (SELECT COUNT(*) FROM nexus_tasks WHERE organization_id = o.id) as tasks_count,
          (SELECT COUNT(*) FROM client_clients WHERE organization_id = o.id) as clients_count
      FROM organizations o
      LEFT JOIN organization_users ou ON ou.id = o.owner_id
      WHERE o.slug IN ('misrad-ai-demo-il', 'misrad-ai-hq-4b96f01c')
      ORDER BY o.slug
    `;

    console.log('תוצאות אימות:');
    console.table(validation.map(v => ({
      ...v,
      users_count: Number(v.users_count),
      tasks_count: Number(v.tasks_count),
      clients_count: Number(v.clients_count)
    })));

    console.log('\n✨ התיקון הושלם בהצלחה!\n');
    
  } catch (error) {
    console.error('❌ שגיאה:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

runFixDemoOrg().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
