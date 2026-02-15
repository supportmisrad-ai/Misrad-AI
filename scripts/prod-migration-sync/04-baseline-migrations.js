#!/usr/bin/env node
/**
 * 04-baseline-migrations.js
 * סימון המיגרציות הקיימות כ-applied (Baseline)
 * משמש כאשר הטבלאות כבר קיימות אבל _prisma_migrations ריק/מלוכלך
 * 
 * Usage: npx dotenv -e .env.prod_backup -- node scripts/prod-migration-sync/04-baseline-migrations.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

async function baselineMigrations() {
  console.log('📍 Baseline - סימון מיגרציות כמיושמות\n');

  try {
    // 1. קריאת כל תיקיות המיגרציות
    const migrationsDir = path.join(__dirname, '..', '..', 'prisma', 'migrations');
    const migrationFolders = fs.readdirSync(migrationsDir)
      .filter(f => {
        const fullPath = path.join(migrationsDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== 'migration_lock.toml';
      })
      .sort();

    console.log(`📁 נמצאו ${migrationFolders.length} מיגרציות בתיקייה:\n`);
    migrationFolders.forEach((f, idx) => {
      console.log(`   ${idx + 1}. ${f}`);
    });
    console.log('');

    // 2. הרצת prisma migrate resolve --applied לכל מיגרציה
    console.log('🔄 מסמן מיגרציות כמיושמות...\n');

    for (const migration of migrationFolders) {
      try {
        console.log(`   📍 ${migration}...`);
        const cmd = `npx prisma migrate resolve --applied "${migration}"`;
        const { stdout, stderr } = await execAsync(cmd, {
          env: { ...process.env }
        });
        
        if (stderr && !stderr.includes('successfully')) {
          console.log(`      ⚠️  ${stderr}`);
        } else {
          console.log(`      ✅ סומן`);
        }
      } catch (error) {
        console.log(`      ❌ שגיאה: ${error.message}`);
      }
    }

    console.log('\n✅ Baseline הושלם!\n');
    console.log('💡 צעד הבא: הרץ prisma migrate deploy לסנכרון מיגרציות חדשות\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ שגיאה ב-Baseline:', error.message);
    process.exit(1);
  }
}

baselineMigrations();
