const fs = require('fs');
const path = require('path');
const cp = require('child_process');

// Read DIRECT_URL from .env.prod_backup
const envFile = path.resolve(__dirname, '..', '..', '.env.prod_backup');
const lines = fs.readFileSync(envFile, 'utf8').split('\n');

let directUrl = '';
for (const line of lines) {
  if (line.startsWith('DIRECT_URL=')) {
    directUrl = line.substring('DIRECT_URL='.length).replace(/^"|"$/g, '').trim();
  }
}

if (!directUrl) {
  console.error('ERROR: DIRECT_URL not found in .env.prod_backup');
  process.exit(1);
}

console.log('DIRECT_URL found (length=' + directUrl.length + ')');

const repoRoot = path.resolve(__dirname, '..', '..');
const prismaBin = path.join(repoRoot, 'node_modules', '.bin', 'prisma.cmd');
const schemaPath = path.join(repoRoot, 'prisma', 'schema.prisma');

const env = Object.assign({}, process.env, {
  DATABASE_URL: directUrl,
  DIRECT_URL: directUrl,
});

const mode = process.argv[2] || 'status';

console.log('Running: prisma migrate ' + mode + '...');
console.log('Schema: ' + schemaPath);
console.log('');

try {
  const result = cp.execFileSync(prismaBin, ['migrate', mode, '--schema', schemaPath], {
    cwd: repoRoot,
    env: env,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  console.log(result);
  console.log('\n✅ prisma migrate ' + mode + ' completed successfully');
} catch (err) {
  if (err.stdout) console.log('STDOUT:', err.stdout);
  if (err.stderr) console.error('STDERR:', err.stderr);
  console.error('\n❌ prisma migrate ' + mode + ' failed (exit code: ' + err.status + ')');
  process.exit(1);
}
