#!/usr/bin/env node
/**
 * Unified Database Manager for Misrad AI
 * מערכת ניהול מסד נתונים מאוחדת - פשוטה, בטוחה, אמינה
 * 
 * Usage:
 *   node db.js <command> [options]
 * 
 * Commands:
 *   dev           - Push schema to DEV database (.env.local)
 *   prod          - Push schema to PROD database (.env.prod_backup) ⚠️
 *   seed          - Seed DEV database
 *   seed:prod     - Seed PROD database ⚠️
 *   status        - Show migration status
 *   validate      - Validate Prisma schema
 *   generate      - Generate Prisma client
 *   studio        - Open Prisma Studio
 * 
 * Options:
 *   --force       - Skip confirmation for production
 *   --accept-loss - Accept data loss (for prod)
 * 
 * Examples:
 *   node db.js dev
 *   node db.js prod --force --accept-loss
 *   node db.js seed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(title) {
  const line = '═'.repeat(60);
  log(`\n${line}`, 'cyan');
  log(`  ${title}`, 'white');
  log(`${line}\n`, 'cyan');
}

function loadEnv(envFile) {
  const envPath = path.join(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) {
    log(`❌ שגיאה: הקובץ ${envFile} לא נמצא!`, 'red');
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  
  log(`✅ נטען מ-variables מ-${envFile}`, 'green');
}

async function runPrismaCommand(command, description) {
  log(`\n🚀 מריץ: ${description || command}`, 'magenta');
  log(`   npx prisma ${command}\n`, 'blue');
  
  try {
    execSync(`npx prisma ${command}`, {
      stdio: 'inherit',
      env: process.env
    });
    return true;
  } catch (error) {
    log(`\n❌ שגיאה: ${error.message}`, 'red');
    return false;
  }
}

async function confirmProdDanger() {
  logHeader('⚠️  אזהרת סכנה - PRODUCTION DATABASE');
  log('אתה עומד לשנות את מסד הנתונים של הפרודקשן!', 'red');
  log('פעולה זו עלולה:', 'yellow');
  log('  • למחוק נתונים קיימים', 'yellow');
  log('  • לשבור תכונות במערכת', 'yellow');
  log('  • להשפיע על משתמשים פעילים\n', 'yellow');
  
  const answer = await ask('האם אתה בטוח? הקלד "YES" כדי להמשיך: ');
  return answer === 'YES';
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const force = args.includes('--force');
  const acceptLoss = args.includes('--accept-loss');
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    logHeader('מנהל מסד הנתונים של Misrad AI');
    log('פקודות זמינות:\n', 'bold');
    log('  dev                דחוף סכמה ל-DEV (.env.local)', 'green');
    log('  prod               דחוף סכמה ל-PROD (.env.prod_backup) ⚠️', 'red');
    log('  seed               Seed DEV database', 'green');
    log('  seed:prod          Seed PROD database ⚠️', 'red');
    log('  status             הצג מצב מיגרציות', 'blue');
    log('  validate           בדוק תקינות סכמה', 'blue');
    log('  generate           Generate Prisma client', 'blue');
    log('  studio             Open Prisma Studio', 'blue');
    log('\nאפשרויות:', 'bold');
    log('  --force            דלג על אישורים', 'yellow');
    log('  --accept-loss      קבל אובדן נתונים', 'yellow');
    log('\nדוגמאות:', 'bold');
    log('  node db.js dev', 'cyan');
    log('  node db.js prod --force --accept-loss', 'cyan');
    log('  node db.js seed\n', 'cyan');
    process.exit(0);
  }
  
  let success = false;
  
  switch (command) {
    case 'dev':
      logHeader('דחיפת סכמה ל-DEV');
      loadEnv('.env.local');
      success = await runPrismaCommand('db push', 'db push to DEV');
      break;
      
    case 'prod':
      logHeader('דחיפת סכמה ל-PROD');
      loadEnv('.env.prod_backup');
      
      if (!force) {
        const confirmed = await confirmProdDanger();
        if (!confirmed) {
          log('\n❌ פעולה בוטלה על ידי המשתמש', 'yellow');
          process.exit(0);
        }
      }
      
      success = await runPrismaCommand('migrate deploy', 'migrate deploy to PROD');
      break;
      
    case 'seed':
      logHeader('Seed DEV Database');
      loadEnv('.env.local');
      success = await runPrismaCommand('db seed', 'seed DEV');
      break;
      
    case 'seed:prod':
      logHeader('Seed PROD Database ⚠️');
      loadEnv('.env.prod_backup');
      
      if (!force) {
        const confirmed = await confirmProdDanger();
        if (!confirmed) {
          log('\n❌ פעולה בוטלה על ידי המשתמש', 'yellow');
          process.exit(0);
        }
      }
      
      success = await runPrismaCommand('db seed', 'seed PROD');
      break;
      
    case 'status':
      logHeader('מצב מיגרציות');
      loadEnv('.env.local');
      success = await runPrismaCommand('migrate status', 'migration status');
      break;
      
    case 'validate':
      logHeader('בדיקת תקינות סכמה');
      loadEnv('.env.local');
      success = await runPrismaCommand('validate', 'validate schema');
      break;
      
    case 'generate':
      logHeader('Generate Prisma Client');
      loadEnv('.env.local');
      success = await runPrismaCommand('generate', 'generate client');
      break;
      
    case 'studio':
      logHeader('Prisma Studio');
      loadEnv('.env.local');
      success = await runPrismaCommand('studio', 'open studio');
      break;
      
    default:
      log(`❌ פקודה לא ידועה: ${command}`, 'red');
      log('הרץ: node db.js help לעזרה', 'yellow');
      process.exit(1);
  }
  
  rl.close();
  
  if (success) {
    log('\n✅ פעולה הושלמה בהצלחה!', 'green');
    process.exit(0);
  } else {
    log('\n❌ פעולה נכשלה', 'red');
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n💥 שגיאה קריטית: ${error.message}`, 'red');
  process.exit(1);
});
