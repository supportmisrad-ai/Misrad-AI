const fs = require('fs');
const path = require('path');

function inspectEnvFile(filepath) {
  console.log(`\n--- Inspecting ${filepath} ---`);
  if (!fs.existsSync(filepath)) {
    console.log('File does not exist');
    return;
  }
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.includes('DATABASE_URL') || line.includes('DIRECT_URL')) {
      const parts = line.split('=');
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      
      // Basic validation without showing secret info
      console.log(`Key: ${key}`);
      console.log(`Length: ${val.length}`);
      console.log(`Starts with quote: ${val.startsWith('"') || val.startsWith("'")}`);
      console.log(`Ends with quote: ${val.endsWith('"') || val.endsWith("'")}`);
      
      // Check for common issues
      if (val.includes(' ')) console.log('⚠️ CONTAINS SPACES');
      if (val.includes('\r')) console.log('⚠️ CONTAINS CARRIAGE RETURN (\\r)');
      
      // Show scheme carefully
      const schemeMatch = val.match(/^["']?([a-z0-9+.-]+):\/\//i);
      if (schemeMatch) {
        console.log(`Scheme: ${schemeMatch[1]}`);
      } else {
        console.log('❌ SCHEME NOT RECOGNIZED at start of string');
        // Show first 15 chars safely
        const safeStart = val.substring(0, 15).replace(/[^\w:]/g, '.');
        console.log(`Start of string (safe): ${safeStart}`);
      }
    }
  });
}

inspectEnvFile('.env.prod_backup');
inspectEnvFile('.env.local');
