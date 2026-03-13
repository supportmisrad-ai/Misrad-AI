#!/usr/bin/env node
/**
 * Simple DB Push to Production
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  Misrad AI - DB Push to Production                     ║');
console.log('╚════════════════════════════════════════════════════════╝\n');

// Read .env.prod_backup
const envContent = fs.readFileSync('.env.prod_backup', 'utf8');
const lines = envContent.split('\n');

let DATABASE_URL = null;
let DIRECT_URL = null;

for (const line of lines) {
  if (line.startsWith('DATABASE_URL=')) {
    DATABASE_URL = line.substring('DATABASE_URL='.length).trim();
  }
  if (line.startsWith('DIRECT_URL=')) {
    DIRECT_URL = line.substring('DIRECT_URL='.length).trim();
  }
}

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in .env.prod_backup');
  process.exit(1);
}

// Use DIRECT_URL if available (better for Prisma CLI)
const urlToUse = DIRECT_URL || DATABASE_URL;
const displayUrl = urlToUse.replace(/:\/\/[^:]+:[^@]+@/, '://****:****@');

console.log('🔗 Database URL:', displayUrl);
console.log('');

// Check if we need to confirm
const force = process.argv.includes('--force');
const acceptLoss = process.argv.includes('--accept-loss');

if (!force) {
  console.log('⚠️  WARNING: This will modify PRODUCTION database!');
  console.log('');
  console.log('To proceed, run with --force flag');
  console.log('Example: node db-push-simple.js --force --accept-loss');
  process.exit(0);
}

console.log('🚀 Running: npx prisma db push --accept-data-loss');
console.log('');

try {
  const result = execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      DATABASE_URL: urlToUse
    },
    stdio: 'inherit'
  });
  
  console.log('');
  console.log('✅ DB Push completed successfully!');
} catch (error) {
  console.error('');
  console.error('❌ DB Push failed:', error.message);
  process.exit(1);
}
