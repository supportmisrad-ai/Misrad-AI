// Check and fix DATABASE_URL format
const fs = require('fs');

const envPath = '.env.prod_backup';
const content = fs.readFileSync(envPath, 'utf8');
const lines = content.split(/\r?\n/);

console.log('Current DATABASE_URL line:');
for (const line of lines) {
  if (line.startsWith('DATABASE_URL')) {
    // Mask sensitive parts
    const masked = line.replace(/:\/\/[^:]+:[^@]+@/, '://USER:PASS@');
    console.log(masked);
    
    // Check format
    if (!line.includes('://')) {
      console.log('\n❌ ERROR: Missing :// in URL');
    } else if (!line.includes('postgresql://') && !line.includes('postgres://')) {
      console.log('\n⚠️ WARNING: URL scheme might be invalid');
      console.log('Should start with: postgresql:// or postgres://');
    }
  }
}
