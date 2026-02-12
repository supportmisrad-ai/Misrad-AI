#!/usr/bin/env node
/**
 * Safe SQL Runner with Hebrew confirmations
 * Prevents destructive SQL commands without explicit confirmation
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function loadEnvLocalOnly() {
  const fullPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(fullPath)) {
    console.error('[safe-sql] .env.local not found; using process.env only.');
    return;
  }
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

function printDbTarget() {
  const id = parseDbIdentity(process.env.DATABASE_URL);
  if (!id) {
    console.log('🎯 DATABASE_URL יעד: (חסר/לא תקין)');
    return;
  }
  console.log(`🎯 DATABASE_URL יעד: host=${id.host} port=${id.port} db=${id.database ?? 'unknown'} user=${id.user ?? 'unknown'}`);
}

loadEnvLocalOnly();

const { PrismaClient, Prisma } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Dangerous SQL keywords
const DANGEROUS_KEYWORDS = [
  'DROP TABLE',
  'DROP DATABASE',
  'DROP SCHEMA',
  'TRUNCATE',
  'DELETE FROM',
  'ALTER TABLE',
  'DROP COLUMN',
  'DROP CONSTRAINT',
];

function analyzeSql(sql) {
  const upperSql = sql.toUpperCase();
  const dangerous = [];
  
  DANGEROUS_KEYWORDS.forEach(keyword => {
    if (upperSql.includes(keyword)) {
      dangerous.push(keyword);
    }
  });
  
  return {
    isDangerous: dangerous.length > 0,
    dangerousOperations: dangerous,
    hasInsert: upperSql.includes('INSERT INTO'),
    hasUpdate: upperSql.includes('UPDATE'),
    hasSelect: upperSql.includes('SELECT'),
  };
}

function splitSqlStatements(sql) {
  const out = [];
  let buf = '';
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = null;

  const push = () => {
    const s = buf.trim();
    buf = '';
    if (s) out.push(s);
  };

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = i + 1 < sql.length ? sql[i + 1] : '';

    if (inLineComment) {
      buf += ch;
      if (ch === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      buf += ch;
      if (ch === '*' && next === '/') {
        buf += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }

    if (!inSingle && !inDouble && !dollarTag) {
      if (ch === '-' && next === '-') {
        buf += ch + next;
        i++;
        inLineComment = true;
        continue;
      }

      if (ch === '/' && next === '*') {
        buf += ch + next;
        i++;
        inBlockComment = true;
        continue;
      }
    }

    if (!inSingle && !inDouble) {
      if (dollarTag) {
        if (ch === '$') {
          const endIdx = sql.indexOf('$', i + 1);
          if (endIdx !== -1) {
            const candidate = sql.slice(i, endIdx + 1);
            if (candidate === dollarTag) {
              buf += candidate;
              i = endIdx;
              dollarTag = null;
              continue;
            }
          }
        }
      } else if (ch === '$') {
        const endIdx = sql.indexOf('$', i + 1);
        if (endIdx !== -1) {
          const candidate = sql.slice(i, endIdx + 1);
          if (/^\$[a-zA-Z0-9_]*\$$/.test(candidate)) {
            buf += candidate;
            i = endIdx;
            dollarTag = candidate;
            continue;
          }
        }
      }
    }

    if (!inDouble && !dollarTag && ch === "'") {
      buf += ch;
      if (inSingle) {
        if (next === "'") {
          buf += next;
          i++;
        } else {
          inSingle = false;
        }
      } else {
        inSingle = true;
      }
      continue;
    }

    if (!inSingle && !dollarTag && ch === '"') {
      buf += ch;
      if (inDouble) {
        if (next === '"') {
          buf += next;
          i++;
        } else {
          inDouble = false;
        }
      } else {
        inDouble = true;
      }
      continue;
    }

    if (!inSingle && !inDouble && !dollarTag && ch === ';') {
      push();
      continue;
    }

    buf += ch;
  }

  push();
  return out;
}

async function checkDatabaseStatus() {
  try {
    const orgs = await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*)::int as count FROM organizations`);
    const users = await prisma.$queryRaw(Prisma.sql`SELECT COUNT(*)::int as count FROM organization_users`);
    
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
  printDbTarget();
  const sqlFile = process.argv[2];
  
  if (!sqlFile) {
    console.log('\n❌ שגיאה: נדרש קובץ SQL');
    console.log('   שימוש: npm run sql:safe <נתיב-לקובץ-sql>\n');
    console.log('דוגמה:');
    console.log('   npm run sql:safe scripts/create-demo-organizations.sql\n');
    process.exit(1);
  }
  
  if (!fs.existsSync(sqlFile)) {
    console.log(`\n❌ שגיאה: קובץ לא נמצא: ${sqlFile}\n`);
    process.exit(1);
  }
  
  const sql = fs.readFileSync(sqlFile, 'utf-8');
  const analysis = analyzeSql(sql);
  
  console.log('\n🔍 בודק קובץ SQL...\n');
  console.log(`📄 קובץ: ${sqlFile}`);
  console.log(`📏 אורך: ${sql.length} תווים\n`);
  
  // Check database status
  const status = await checkDatabaseStatus();
  console.log('📊 מצב דאטאבייס נוכחי:');
  console.log(`   ארגונים: ${status.organizations}`);
  console.log(`   משתמשים: ${status.users}\n`);
  
  // Analyze SQL
  if (analysis.hasSelect) {
    console.log('✅ מכיל: שאילתות SELECT (בטוח)');
  }
  if (analysis.hasInsert) {
    console.log('📝 מכיל: פקודות INSERT (הוספת נתונים)');
  }
  if (analysis.hasUpdate) {
    console.log('✏️  מכיל: פקודות UPDATE (עדכון נתונים)');
  }
  
  if (analysis.isDangerous) {
    console.log('\n⚠️  ⚠️  ⚠️  אזהרה! פקודות מסוכנות זוהו! ⚠️  ⚠️  ⚠️\n');
    console.log('הסקריפט מכיל פקודות שיכולות למחוק נתונים:\n');
    analysis.dangerousOperations.forEach(op => {
      console.log(`   ❌ ${op}`);
    });
    console.log('');
    
    if (status.hasData) {
      console.log('🚨 הדאטאבייס מכיל נתונים קיימים!');
      console.log('   מחיקת נתונים יכולה לגרום לאובדן מידע!\n');
    }
    
    console.log('📖 לפני שתמשיך - קרא את מדריך הבטיחות:');
    console.log('   c:\\Projects\\Misrad-AI\\מדריך-בטיחות.md\n');
    console.log('💡 מומלץ ליצור גיבוי קודם: npm run db:backup\n');
    
    const confirm1 = await question('האם אתה בטוח לחלוטין שאתה רוצה להריץ את זה? (כן/לא): ');
    if (confirm1.toLowerCase() !== 'כן') {
      console.log('\n❌ בוטל על ידי המשתמש.\n');
      process.exit(0);
    }
    
    const confirm2 = await question('אישור נוסף - האם יצרת גיבוי? (כן/לא): ');
    if (confirm2.toLowerCase() !== 'כן') {
      console.log('\n❌ בוטל. צור גיבוי קודם: npm run db:backup:critical\n');
      process.exit(0);
    }
    
    console.log('\n⚠️  אישור אחרון!');
    const confirm3 = await question('הקלד "אני מאשר" להמשך: ');
    if (confirm3 !== 'אני מאשר') {
      console.log('\n❌ בוטל.\n');
      process.exit(0);
    }
  } else {
    console.log('\n✅ לא זוהו פקודות מסוכנות\n');
    
    const confirm = await question('להריץ את הסקריפט? (כן/לא): ');
    if (confirm.toLowerCase() !== 'כן') {
      console.log('\n❌ בוטל.\n');
      process.exit(0);
    }
  }
  
  console.log('\n⏳ מריץ SQL...\n');
  
  try {
    const statements = splitSqlStatements(sql);
    await prisma.$transaction(async (tx) => {
      for (const statement of statements) {
        const upper = statement.trim().toUpperCase();
        if (upper === 'BEGIN' || upper === 'COMMIT' || upper === 'ROLLBACK') {
          continue;
        }

        if (upper.startsWith('SELECT')) {
          await tx.$queryRaw(Prisma.sql`${Prisma.raw(statement)}`);
          continue;
        }

        await tx.$executeRaw(Prisma.sql`${Prisma.raw(statement)}`);
      }
    });
    console.log('✅ הסקריפט רץ בהצלחה!\n');
    
    // Show new status
    const newStatus = await checkDatabaseStatus();
    console.log('📊 מצב חדש:');
    console.log(`   ארגונים: ${status.organizations} → ${newStatus.organizations}`);
    console.log(`   משתמשים: ${status.users} → ${newStatus.users}\n`);
    
  } catch (error) {
    console.error('\n❌ שגיאה בהרצת SQL:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

main();
