#!/usr/bin/env node
/**
 * Database Connection Diagnostic Tool
 * 
 * אבחון מקיף של בעיות חיבור ל-Supabase Pooler
 * מזהה: IP Whitelist / Connection String / Network Issues
 * 
 * שימוש: node scripts/diagnose-db-connection.js
 */

const { execSync } = require('child_process');
const https = require('https');

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

// Load .env.local
function loadEnv() {
  const fs = require('fs');
  const path = require('path');
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('⚠️  .env.local לא נמצא!', 'yellow');
    return {};
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  
  for (const line of content.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  }
  return env;
}

// Parse connection URL safely
function parseDbUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol,
      host: u.hostname,
      port: u.port,
      database: u.pathname?.replace('/', ''),
      isPooler: u.hostname?.includes('pooler'),
      poolerPort: u.port === '6543' || u.port === '6544' ? 'transaction' : 
                  u.port === '5432' ? 'session' : 'unknown',
    };
  } catch {
    return null;
  }
}

// Get public IP
async function getPublicIP() {
  return new Promise((resolve) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data).ip);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

// Test connection with psql
function testConnection(url, name) {
  try {
    execSync(`npx.cmd dotenv -e .env.local -- psql "${url}" -c "SELECT 'OK' as status;"`, {
      timeout: 10000,
      stdio: 'pipe'
    });
    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  section('🔍 אבחון חיבור ל-Supabase Database');

  const env = loadEnv();
  const dbUrl = env.DATABASE_URL;
  const directUrl = env.DIRECT_URL;

  // Show current configuration
  section('⚙️  תצורה נוכחית');
  
  if (dbUrl) {
    const parsed = parseDbUrl(dbUrl);
    log(`DATABASE_URL:`, 'blue');
    if (parsed) {
      log(`  Host: ${parsed.host}`, 'reset');
      log(`  Port: ${parsed.port} (${parsed.poolerPort} mode)`, 'reset');
      log(`  Database: ${parsed.database}`, 'reset');
      log(`  Is Pooler: ${parsed.isPooler ? '✅ כן' : '❌ לא'}`, parsed.isPooler ? 'green' : 'reset');
    }
  } else {
    log('❌ DATABASE_URL חסר!', 'red');
  }

  if (directUrl) {
    const parsed = parseDbUrl(directUrl);
    log(`\nDIRECT_URL:`, 'blue');
    if (parsed) {
      log(`  Host: ${parsed.host}`, 'reset');
      log(`  Port: ${parsed.port}`, 'reset');
      log(`  Is Pooler: ${parsed.isPooler ? '⚠️  כן (לא תקין ל-DIRECT)' : '✅ לא'}`, parsed.isPooler ? 'yellow' : 'green');
    }
  } else {
    log('\n⚠️  DIRECT_URL חסר (ייתכן שיהיה צורך בהגדרה)', 'yellow');
  }

  // Get public IP
  section('🌐 כתובת IP ציבורית שלך');
  const publicIP = await getPublicIP();
  if (publicIP) {
    log(`IP: ${publicIP}`, 'green');
    log('\n⚠️  ודא ש-IP זה מוגדר ב-Supabase Dashboard:', 'yellow');
    log('   Database → Network Restrictions → Add IP', 'reset');
    log(`   הכנס: ${publicIP}/32`, 'cyan');
  } else {
    log('לא ניתן לזהות IP ציבורי', 'red');
  }

  // Test connections
  section('🔌 בדיקת חיבורים');
  
  if (dbUrl) {
    log('\nבודק DATABASE_URL...', 'blue');
    const result = testConnection(dbUrl, 'DATABASE_URL');
    if (result.success) {
      log('✅ DATABASE_URL עובד!', 'green');
    } else {
      log('❌ DATABASE_URL נכשל:', 'red');
      log(result.error, 'red');
    }
  }

  if (directUrl && directUrl !== dbUrl) {
    log('\nבודק DIRECT_URL...', 'blue');
    const result = testConnection(directUrl, 'DIRECT_URL');
    if (result.success) {
      log('✅ DIRECT_URL עובד!', 'green');
    } else {
      log('❌ DIRECT_URL נכשל:', 'red');
      log(result.error, 'red');
    }
  }

  // Recommendations
  section('💡 המלצות');
  
  const parsedDb = parseDbUrl(dbUrl);
  const parsedDirect = parseDbUrl(directUrl);
  
  if (!parsedDb?.isPooler && !parsedDirect) {
    log('✅ אתה משתמש בחיבור ישיר (ללא Pooler) - הכל תקין!', 'green');
  } else if (parsedDb?.isPooler && !parsedDirect) {
    log('⚠️  בעיה זוהתה:', 'yellow');
    log('   אתה משתמש ב-Pooler (port 6543) אבל DIRECT_URL לא מוגדר.', 'reset');
    log('   הפתרון: הגדר DIRECT_URL לחיבור ישיר (port 5432)', 'reset');
    log('\n   מה לעשות:', 'cyan');
    log('   1. כנס ל-Supabase Dashboard → Project Settings → Database', 'reset');
    log('   2. תחת "Connection String" בחר "PSQL" (לא "Pooler")', 'reset');
    log('   3. העתק את ה-URL והוסף ל-.env.local:', 'reset');
    log('      DIRECT_URL=postgresql://...:5432/...', 'cyan');
  }

  if (publicIP) {
    log('\n📝 פעולה נדרשת:', 'cyan');
    log('   הוסף את ה-IP שלך ל-Whitelist ב-Supabase:', 'reset');
    log(`   https://supabase.com/dashboard/project/_/settings/database`, 'cyan');
  }

  section('✅ האבחון הושלם');
}

main().catch(console.error);
