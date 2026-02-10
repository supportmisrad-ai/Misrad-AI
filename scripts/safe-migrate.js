#!/usr/bin/env node
/**
 * Safe Migration Runner
 * Prevents destructive Prisma migrations and enforces backup workflow
 */

const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  } catch (e) {
    console.error(`[safe-migrate] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
} else {
  console.error(`[safe-migrate] ${envPath} not found; using process.env only.`);
}

const { PrismaClient } = require('@prisma/client');
const { execFileSync } = require('child_process');
const path = require('path');
const readline = require('readline');

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

function printDbTarget() {
  const id = parseDbIdentity(process.env.DATABASE_URL);
  if (!id) {
    console.log('🎯 DATABASE_URL יעד: (חסר/לא תקין)');
    return;
  }
  console.log(`🎯 DATABASE_URL יעד: host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`);
}

const prisma = new PrismaClient();

const repoRoot = process.cwd();
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');
const prismaBin =
  process.platform === 'win32'
    ? path.join(repoRoot, 'node_modules', '.bin', 'prisma.cmd')
    : path.join(repoRoot, 'node_modules', '.bin', 'prisma');

function runPrisma(args) {
  execFileSync(prismaBin, [...args, '--schema', schemaPath], {
    stdio: 'inherit',
    env: process.env,
    cwd: repoRoot,
  });
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

const assumeYes = hasFlag('--yes');
const autoApply = hasFlag('--apply');
const disableShadowDb = hasFlag('--no-shadow');
const createOnly = hasFlag('--create-only');
const applyOnly = hasFlag('--apply-only');

let rl = null;

function getRl() {
  if (rl) return rl;
  rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return rl;
}

function question(query) {
  if (assumeYes) return Promise.resolve('כן');
  if (!process.stdin.isTTY) {
    throw new Error('Non-interactive stdin detected. Re-run with --yes (and optionally --apply).');
  }
  const rli = getRl();
  return new Promise((resolve) => rli.question(query, resolve));
}

async function checkDatabaseStatus() {
  try {
    const orgs = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM organizations');
    const users = await prisma.$queryRawUnsafe('SELECT COUNT(*)::int as count FROM organization_users');
    
    return {
      organizations: orgs[0].count,
      users: users[0].count,
      hasData: orgs[0].count > 0 || users[0].count > 0
    };
  } catch (error) {
    return { organizations: 0, users: 0, hasData: false };
  }
}

async function main() {
  console.log('\n🛡️  מערכת מיגריישן בטוחה\n');
  console.log('כלי זה מונע מיגריישנים שיכולים למחוק נתונים.\n');

  printDbTarget();
  
  // Check if we're in production
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    console.log('❌ חסום! אי אפשר להריץ migrations בפרודקשן!');
    console.log('   השתמש ב: npm run prisma:migrate:deploy\n');
    process.exit(1);
  }
  
  // Check database status
  console.log('📊 בודק מצב דאטאבייס...\n');
  const status = await checkDatabaseStatus();
  
  console.log(`   ארגונים: ${status.organizations}`);
  console.log(`   משתמשים: ${status.users}\n`);
  
  if (status.hasData) {
    console.log('⚠️  אזהרה: הדאטאבייס מכיל נתונים!\n');
    console.log('🔒 שלבים נדרשים לפני מיגריישן:\n');
    console.log('   1. צור גיבוי: npm run db:backup:critical');
    console.log('   2. בדוק את קבצי ה-SQL של המיגריישן');
    console.log('   3. בדוק בסביבת staging קודם\n');
    console.log('📖 קרא את מדריך הבטיחות המלא:');
    console.log('   c:\\Projects\\Misrad-AI\\מדריך-בטיחות.md\n');
    
    const confirmed = await question('האם יצרת גיבוי? (כן/לא): ');
    
    if (confirmed.toLowerCase() !== 'כן') {
      console.log('\n❌ המיגריישן בוטל. צור גיבוי קודם!\n');
      process.exit(1);
    }
  }
  
  // Get migration name
  const migrationName = process.argv.slice(2).find((arg) => arg && !String(arg).startsWith('--'));
  if (!applyOnly) {
    if (!migrationName) {
      console.log('❌ שגיאה: נדרש שם למיגריישן');
      console.log('   שימוש: npm run migrate:safe <שם-מיגריישן>\n');
      process.exit(1);
    }

    console.log(`\n📝 יוצר מיגריישן: ${migrationName}\n`);
  }
  
  // Create migration (without applying)
  try {
    if (applyOnly) {
      console.log('\n📦 מריץ מיגריישנים קיימים...\n');
      if (disableShadowDb) {
        delete process.env.SHADOW_DATABASE_URL;
      }
      runPrisma(['migrate', 'dev']);
      console.log('\n✅ המיגריישנים הורצו בהצלחה!\n');
      return;
    }

    console.log('יוצר קובץ מיגריישן...\n');

    if (disableShadowDb) {
      delete process.env.SHADOW_DATABASE_URL;
    }

    runPrisma(['migrate', 'dev', '--create-only', '--name', migrationName]);
    
    console.log('\n✅ קובץ המיגריישן נוצר!\n');
    console.log('📋 שלבים הבאים:\n');
    console.log('   1. בדוק את ה-SQL ב: prisma/migrations/');
    console.log('   2. חפש פקודות מסוכנות: DROP, TRUNCATE, DELETE');
    console.log('   3. אם בטוח - המשך להריץ\n');

    const apply = createOnly ? 'לא' : autoApply ? 'כן' : await question('להריץ את המיגריישן עכשיו? (כן/לא): ');
    
    if (apply.toLowerCase() === 'כן') {
      console.log('\n📦 מריץ מיגריישן...\n');
      if (disableShadowDb) {
        delete process.env.SHADOW_DATABASE_URL;
      }
      runPrisma(['migrate', 'dev']);
      console.log('\n✅ המיגריישן רץ בהצלחה!\n');
    } else {
      console.log('\n⏸️  המיגריישן נוצר אבל לא הורץ.\n');
      console.log('   להריץ מאוחר יותר: npx prisma migrate dev\n');
    }
    
  } catch (error) {
    console.error('\n❌ המיגריישן נכשל:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    if (rl) rl.close();
  }
}

main();
