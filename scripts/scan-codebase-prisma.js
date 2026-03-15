/**
 * Comprehensive Code Scanner for Prisma Usage
 * Maps all modules, pages, and identifies schema requirements
 */

const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = 'c:/Projects/Misrad-AI';
const SCAN_DIRS = ['app/actions', 'app/api', 'app/w', 'components', 'lib'];

// Results storage
const results = {
  modules: new Map(),
  tablesUsed: new Set(),
  fieldsUsed: new Map(), // table -> Set(fields)
  unknownTables: new Set(),
  missingFields: [],
  routes: [],
  actions: []
};

// Prisma method patterns
const PRISMA_METHODS = [
  'findUnique', 'findMany', 'findFirst', 'findFirstOrThrow',
  'create', 'createMany',
  'update', 'updateMany',
  'delete', 'deleteMany',
  'upsert',
  '$queryRaw', '$executeRaw'
];

// Extract model name from Prisma call
function extractModelName(line) {
  // Pattern: prisma.tableName.method() or prisma.tableName.field
  const match = line.match(/prisma\.(\w+)\.(?:find|create|update|delete|upsert|\$query)/);
  if (match) return match[1];
  
  // Pattern: prisma.tableName (for raw queries that reference tables)
  const rawMatch = line.match(/prisma\.(\w+)\s*[,;)]/);
  if (rawMatch) return rawMatch[1];
  
  return null;
}

// Extract fields from include/select/data objects
function extractFields(line) {
  const fields = [];
  
  // Pattern: { field: true, field2: true }
  const includeMatch = line.match(/(?:include|select)\s*:\s*{([^}]+)}/);
  if (includeMatch) {
    const fieldMatches = includeMatch[1].match(/(\w+)\s*:/g);
    if (fieldMatches) {
      fieldMatches.forEach(m => {
        const field = m.replace(':', '').trim();
        if (field && !['where', 'data', 'orderBy', 'take', 'skip'].includes(field)) {
          fields.push(field);
        }
      });
    }
  }
  
  // Pattern: data: { field: value }
  const dataMatch = line.match(/data\s*:\s*{([^}]+)}/);
  if (dataMatch) {
    const fieldMatches = dataMatch[1].match(/(\w+)\s*:/g);
    if (fieldMatches) {
      fieldMatches.forEach(m => {
        const field = m.replace(':', '').trim();
        if (field && field !== 'data') fields.push(field);
      });
    }
  }
  
  return fields;
}

// Scan a single file
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileResults = {
    path: filePath.replace(PROJECT_ROOT, ''),
    tables: new Set(),
    fields: new Map(),
    actions: []
  };
  
  lines.forEach((line, idx) => {
    // Check for Prisma usage
    const modelName = extractModelName(line);
    if (modelName) {
      fileResults.tables.add(modelName);
      results.tablesUsed.add(modelName);
      
      const fields = extractFields(line);
      if (fields.length > 0) {
        if (!fileResults.fields.has(modelName)) {
          fileResults.fields.set(modelName, new Set());
        }
        fields.forEach(f => fileResults.fields.get(modelName).add(f));
        
        if (!results.fieldsUsed.has(modelName)) {
          results.fieldsUsed.set(modelName, new Set());
        }
        fields.forEach(f => results.fieldsUsed.get(modelName).add(f));
      }
    }
    
    // Check for action exports
    if (line.includes('export async function') && line.includes('Action')) {
      const actionMatch = line.match(/export async function\s+(\w+)/);
      if (actionMatch) {
        fileResults.actions.push(actionMatch[1]);
      }
    }
  });
  
  return fileResults;
}

// Recursively scan directory
function scanDirectory(dir) {
  const fullPath = path.join(PROJECT_ROOT, dir);
  if (!fs.existsSync(fullPath)) return;
  
  const items = fs.readdirSync(fullPath);
  
  items.forEach(item => {
    const itemPath = path.join(fullPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      scanDirectory(path.join(dir, item));
    } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(item)) {
      const fileResults = scanFile(itemPath);
      if (fileResults.tables.size > 0) {
        results.routes.push(fileResults);
      }
    }
  });
}

// Main execution
console.log('🔍 Scanning codebase for Prisma usage...\n');

SCAN_DIRS.forEach(dir => scanDirectory(dir));

// Categorize modules
const moduleCategories = {
  'Admin Panel': [],
  'Client Portal': [],
  'Nexus (Team)': [],
  'Social Media': [],
  'Operations': [],
  'System': [],
  'Finance/Billing': [],
  'Attendance': [],
  'Landing/Public': [],
  'Auth': [],
  'API Routes': [],
  'Other': []
};

results.routes.forEach(route => {
  const path = route.path.toLowerCase();
  
  if (path.includes('/admin/')) moduleCategories['Admin Panel'].push(route);
  else if (path.includes('/client/') || path.includes('client-portal')) moduleCategories['Client Portal'].push(route);
  else if (path.includes('/nexus/') || path.includes('nexus-')) moduleCategories['Nexus (Team)'].push(route);
  else if (path.includes('/social/') || path.includes('socialmedia')) moduleCategories['Social Media'].push(route);
  else if (path.includes('/operations/')) moduleCategories['Operations'].push(route);
  else if (path.includes('/system/') || path.includes('/admin/')) moduleCategories['System'].push(route);
  else if (path.includes('/finance/') || path.includes('billing') || path.includes('invoice')) moduleCategories['Finance/Billing'].push(route);
  else if (path.includes('attendance') || path.includes('kiosk')) moduleCategories['Attendance'].push(route);
  else if (path.includes('/api/')) moduleCategories['API Routes'].push(route);
  else if (path.includes('/login') || path.includes('/sign') || path.includes('/invite')) moduleCategories['Auth'].push(route);
  else if (path.includes('/page') && !path.includes('/w/')) moduleCategories['Landing/Public'].push(route);
  else moduleCategories['Other'].push(route);
});

// Print results
console.log('📊 MODULE CATEGORIES');
console.log('='.repeat(60));
Object.entries(moduleCategories).forEach(([category, routes]) => {
  if (routes.length > 0) {
    console.log(`\n${category}: ${routes.length} files`);
    routes.slice(0, 5).forEach(r => {
      console.log(`  - ${r.path} (${Array.from(r.tables).join(', ')})`);
    });
    if (routes.length > 5) {
      console.log(`  ... and ${routes.length - 5} more`);
    }
  }
});

console.log('\n\n📋 TABLES USED ACROSS CODEBASE');
console.log('='.repeat(60));
const sortedTables = Array.from(results.tablesUsed).sort();
sortedTables.forEach(table => {
  const fields = results.fieldsUsed.get(table);
  const fieldCount = fields ? fields.size : 0;
  console.log(`  - ${table}${fieldCount > 0 ? ` (${fieldCount} fields referenced)` : ''}`);
});

console.log(`\nTotal unique tables referenced: ${sortedTables.length}`);

// Save detailed results
const outputPath = path.join(PROJECT_ROOT, 'scripts', 'codebase-scan-results.json');
fs.writeFileSync(outputPath, JSON.stringify({
  summary: {
    totalFiles: results.routes.length,
    totalTables: sortedTables.length,
    categories: Object.entries(moduleCategories).map(([k, v]) => ({ name: k, count: v.length }))
  },
  tables: sortedTables,
  tableFields: Object.fromEntries(
    Array.from(results.fieldsUsed.entries()).map(([k, v]) => [k, Array.from(v)])
  ),
  files: results.routes.map(r => ({
    path: r.path,
    tables: Array.from(r.tables),
    actions: r.actions
  }))
}, null, 2));

console.log(`\n✅ Detailed results saved to: ${outputPath}`);
