// Verify operations tables exist in production
const { execSync } = require('child_process');
const fs = require('fs');

console.log('בודק אם הטבלאות operations נוצרו בפרודקשן...\n');

// Load prod env
const envContent = fs.readFileSync('.env.prod_backup', 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim();
  }
}

// Use DIRECT_URL if available, otherwise DATABASE_URL
const dbUrl = envVars.DIRECT_URL || envVars.DATABASE_URL;

if (!dbUrl) {
  console.error('❌ DATABASE_URL לא נמצא');
  process.exit(1);
}

console.log('מחבר למסד הנתונים...');
console.log('URL:', dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@'));

try {
  // Check if tables exist
  const result = execSync(
    `npx prisma db execute --stdin --url="${dbUrl}"`,
    {
      input: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('operations_locations', 'operations_work_order_types');`,
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: dbUrl }
    }
  );
  
  console.log('\nתוצאה:');
  console.log(result);
  
  if (result.includes('operations_locations') && result.includes('operations_work_order_types')) {
    console.log('✅ שתי הטבלאות קיימות!');
  } else {
    console.log('⚠️ הטבלאות עדיין לא נוצרו');
  }
} catch (e) {
  console.error('❌ שגיאה:', e.message);
}
