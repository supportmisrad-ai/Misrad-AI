/**
 * הרצת תיקון ארגון הדגמה - SQL Script Runner
 * מריץ את EXECUTE-fix-demo-org.sql על PROD database
 */

require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runFixDemoOrg() {
  console.log('🚀 מתחיל תיקון ארגון הדגמה...\n');

  // קריאת הסקריפט SQL
  const sqlPath = path.join(__dirname, 'EXECUTE-fix-demo-org.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // התחברות ל-DB (משתמש ב-DIRECT_URL לפעולות maintenance)
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ Error: DATABASE_URL או DIRECT_URL לא מוגדרים ב-.env.local');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ התחבר ל-database\n');

    // הרצת הסקריפט
    console.log('🔧 מריץ תיקונים...\n');
    const result = await client.query(sql);
    
    console.log('✅ התיקונים הושלמו בהצלחה!\n');
    
    // הצגת תוצאות
    if (result.rows && result.rows.length > 0) {
      console.log('📊 תוצאות:');
      console.table(result.rows);
    }

    console.log('\n✨ סיימתי! הארגונים עודכנו בהצלחה.\n');
    
  } catch (error) {
    console.error('❌ שגיאה בהרצת התיקון:', error.message);
    console.error('\nפרטי שגיאה:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runFixDemoOrg().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
