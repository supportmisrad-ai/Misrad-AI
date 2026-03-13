#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

function getProdUrl() {
  const content = fs.readFileSync('.env.prod_backup', 'utf8');
  const lines = content.split('\n');
  let directUrl = null;
  let databaseUrl = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('DIRECT_URL=')) {
      directUrl = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
    if (trimmed.startsWith('DATABASE_URL=') && !trimmed.startsWith('DATABASE_URL="prisma://')) {
      databaseUrl = trimmed.split('=')[1].trim().replace(/^["']|["']$/g, '');
    }
  }
  return directUrl || databaseUrl;
}

const url = getProdUrl();
if (!url) {
  console.error('❌ Could not find valid production URL');
  process.exit(1);
}

console.log('🚀 Running production push with cleaned URL...');
try {
  execSync('npx prisma db push --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    stdio: 'inherit'
  });
  console.log('✅ Success!');
} catch (e) {
  console.error('❌ Failed:', e.message);
  process.exit(1);
}
