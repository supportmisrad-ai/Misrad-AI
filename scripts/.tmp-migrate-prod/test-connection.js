const fs = require('fs');
const path = require('path');

// Read DIRECT_URL from .env.prod_backup
const envFile = path.resolve(__dirname, '..', '..', '.env.prod_backup');
const lines = fs.readFileSync(envFile, 'utf8').split('\n');

let directUrl = '';
let databaseUrl = '';
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed.startsWith('DIRECT_URL=')) {
    directUrl = trimmed.substring('DIRECT_URL='.length).replace(/^"|"$/g, '').trim();
  }
  if (trimmed.startsWith('DATABASE_URL=')) {
    databaseUrl = trimmed.substring('DATABASE_URL='.length).replace(/^"|"$/g, '').trim();
  }
}

console.log('DATABASE_URL type:', databaseUrl.startsWith('prisma://') ? 'Prisma Accelerate' : 'Direct');
console.log('DIRECT_URL type:', directUrl.startsWith('prisma://') ? 'Prisma Accelerate' : 'Direct PostgreSQL');

// Parse DIRECT_URL to show host/port (no password)
try {
  const u = new URL(directUrl);
  console.log('DIRECT_URL host:', u.hostname);
  console.log('DIRECT_URL port:', u.port || '5432');
  console.log('DIRECT_URL database:', u.pathname.replace(/^\//, ''));
  console.log('DIRECT_URL user:', u.username);
} catch (e) {
  console.error('Failed to parse DIRECT_URL:', e.message);
}

// Test TCP connectivity
const net = require('net');
try {
  const u = new URL(directUrl);
  const host = u.hostname;
  const port = parseInt(u.port || '5432', 10);
  console.log('\nTesting TCP connection to ' + host + ':' + port + '...');
  
  const socket = net.connect({ host, port, timeout: 10000 });
  socket.on('connect', function() {
    console.log('✅ TCP connection successful!');
    socket.destroy();
    
    // Now try PrismaClient
    testPrisma();
  });
  socket.on('timeout', function() {
    console.error('❌ TCP connection timed out (10s)');
    socket.destroy();
    process.exit(1);
  });
  socket.on('error', function(err) {
    console.error('❌ TCP connection failed:', err.message);
    process.exit(1);
  });
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}

function testPrisma() {
  console.log('\nTesting Prisma connection...');
  // Set env for PrismaClient
  process.env.DATABASE_URL = directUrl;
  process.env.DIRECT_URL = directUrl;
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: { db: { url: directUrl } },
  });
  
  prisma.$queryRawUnsafe('SELECT 1 as test')
    .then(function(result) {
      console.log('✅ Prisma query successful:', result);
      return prisma.$queryRawUnsafe("SELECT migration_name FROM public._prisma_migrations ORDER BY started_at DESC LIMIT 5");
    })
    .then(function(rows) {
      console.log('\nLast 5 applied migrations:');
      rows.forEach(function(r) { console.log('  - ' + r.migration_name); });
      return prisma.$queryRawUnsafe("SELECT COUNT(*) as total FROM public._prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL");
    })
    .then(function(rows) {
      console.log('\nTotal applied migrations:', rows[0].total);
      return prisma.$disconnect();
    })
    .then(function() {
      console.log('\n✅ Connection test complete');
    })
    .catch(function(err) {
      console.error('❌ Prisma error:', err.message);
      return prisma.$disconnect().then(function() { process.exit(1); });
    });
}
