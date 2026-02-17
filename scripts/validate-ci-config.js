#!/usr/bin/env node

/**
 * Pre-push validation: Catch CI errors locally before pushing to GitHub
 * Run this manually: node scripts/validate-ci-config.js
 * Or add to package.json: "validate:ci": "node scripts/validate-ci-config.js"
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating CI configuration...\n');

let hasErrors = false;
let hasWarnings = false;

// Check if ci.yml exists
const ciFile = path.join(__dirname, '..', '.github', 'workflows', 'ci.yml');
if (!fs.existsSync(ciFile)) {
  console.error('❌ CI workflow file not found: .github/workflows/ci.yml');
  process.exit(1);
}

const ciContent = fs.readFileSync(ciFile, 'utf8');

// Check for common typos in prisma commands
const prismaDbPushRegex = /npx\s+db\s+push/g;
const matches = ciContent.match(prismaDbPushRegex);
if (matches) {
  console.error('❌ Found "npx db push" without "prisma" - typo detected!');
  console.error('   Should be: npx prisma db push --skip-generate');
  hasErrors = true;
}

// Check for malformed commands
if (ciContent.includes('--skp-ene') || ciContent.includes('--skip-ene')) {
  console.error('❌ Found typo in --skip-generate flag');
  hasErrors = true;
}

// Check Prisma schema
const schemaFile = path.join(__dirname, '..', 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaFile)) {
  console.error('❌ Prisma schema not found: prisma/schema.prisma');
  process.exit(1);
}

const schemaContent = fs.readFileSync(schemaFile, 'utf8');

// Check if schema uses vector types (requires pgvector)
if (schemaContent.includes('Unsupported("vector")')) {
  if (!ciContent.includes('CREATE EXTENSION') || !ciContent.match(/vector["']/)) {
    console.error('❌ Schema uses vector types but CI doesn\'t enable pgvector extension!');
    console.error('   Add to ci.yml: CREATE EXTENSION IF NOT EXISTS "vector";');
    hasErrors = true;
  } else {
    console.log('✅ pgvector extension configured');
  }
}

// Check if schema uses uuid_generate_v4 (requires uuid-ossp)
if (schemaContent.includes('uuid_generate_v4')) {
  if (!ciContent.includes('uuid-ossp')) {
    console.error('❌ Schema uses uuid_generate_v4 but CI doesn\'t enable uuid-ossp extension!');
    console.error('   Add to ci.yml: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    hasErrors = true;
  } else {
    console.log('✅ uuid-ossp extension configured');
  }
}

// Check for proper prisma db push command
const properPrismaCommand = /npx\s+prisma\s+db\s+push\s+--skip-generate/;
if (!properPrismaCommand.test(ciContent)) {
  console.warn('⚠️  Warning: Could not find "npx prisma db push --skip-generate" in CI');
  hasWarnings = true;
}

// Check that both jobs have the same setup
const buildJobMatch = ciContent.match(/jobs:\s*\n\s*build:/);
const e2eJobMatch = ciContent.match(/security_e2e:/);

if (buildJobMatch && e2eJobMatch) {
  console.log('✅ Both CI jobs found (build & security_e2e)');
} else {
  console.warn('⚠️  Warning: Expected CI jobs not found');
  hasWarnings = true;
}

console.log('');

if (hasErrors) {
  console.error('❌ CI validation failed! Fix errors before pushing.');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('⚠️  CI validation completed with warnings.');
  process.exit(0);
}

console.log('✅ CI validation passed! Safe to push.');
process.exit(0);
