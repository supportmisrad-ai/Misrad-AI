#!/usr/bin/env node
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  try {
    const parsed = dotenv.parse(fs.readFileSync(envPath));
    for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
  } catch (e) {
    console.error(`[find-my-user] Failed to load ${envPath}:`, e);
    process.exit(1);
  }
} else {
  console.error(`[find-my-user] ${envPath} not found; using process.env only.`);
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

const dbId = parseDbIdentity(process.env.DATABASE_URL);
if (dbId) {
  console.error(
    `[find-my-user] DATABASE_URL -> host=${dbId.host} port=${dbId.port} db=${dbId.database ?? 'unknown'} user=${dbId.user ?? 'unknown'}`
  );
} else {
  console.error('[find-my-user] DATABASE_URL -> (missing/invalid)');
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('🔍 Looking for user: itsikdahan1@gmail.com\n');
    
    const user = await prisma.social_users.findFirst({
      where: {
        email: {
          contains: 'itsikdahan1',
          mode: 'insensitive',
        },
      },
      select: {
        id: true,
        email: true,
        full_name: true,
        clerk_user_id: true,
        role: true,
        created_at: true,
      },
    });

    if (!user) {
      console.log('❌ User not found in social_users table!');
      console.log('\n💡 You need to login to the app first:');
      console.log('   1. npm run dev');
      console.log('   2. Go to http://localhost:4000');
      console.log('   3. Login with itsikdahan1@gmail.com');
      console.log('   4. Run this script again\n');
      process.exit(1);
    }

    console.log('✅ Found your user!\n');
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.full_name || 'N/A'}`);
    console.log(`Role: ${user.role || 'N/A'}`);
    console.log(`ID: ${user.id}`);
    console.log(`Clerk ID: ${user.clerk_user_id || 'N/A'}`);
    console.log(`Created: ${user.created_at}\n`);

    console.log('📝 Your owner_id is: ' + user.id);
    console.log('\n✅ Now updating create-demo-organizations.sql with your ID...\n');

    // Update the SQL file
    const fs = require('fs');
    const sqlPath = './scripts/create-demo-organizations.sql';
    let sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Replace the old owner_id
    const oldId = 'e0117831-48ed-4548-a2ea-ba246a5b6dcc';
    const newId = user.id;
    
    const updatedSql = sql.replaceAll(oldId, newId);
    fs.writeFileSync(sqlPath, updatedSql, 'utf-8');
    
    console.log('✅ Updated create-demo-organizations.sql!');
    console.log(`   Replaced all instances of ${oldId}`);
    console.log(`   With: ${newId}\n`);
    
    console.log('🚀 Now run: npm run db:create:demos\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
