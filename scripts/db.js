/**
 * Unified Database Management System for Misrad AI
 * 
 * This module provides a single source of truth for all database operations.
 * 
 * Usage:
 * - DEV:  npm run db:dev    (uses .env.local)
 * - PROD: npm run db:prod   (uses .env.prod_backup)
 * 
 * Available commands:
 * - db:dev / db:prod           - Push schema to DB
 * - db:seed:dev / db:seed:prod - Seed the database
 * - db:status                  - Check schema differences
 * - db:backup                  - Create backup
 * - db:reset:dev               - Reset dev database (DANGER)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment detection
const ENV = process.env.DB_ENV || 'dev';
const ENV_FILE = ENV === 'prod' ? '.env.prod_backup' : '.env.local';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadEnv() {
  const envPath = path.join(process.cwd(), ENV_FILE);
  if (!fs.existsSync(envPath)) {
    log(`Error: ${ENV_FILE} not found!`, 'red');
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
  
  log(`Loaded environment from ${ENV_FILE}`, 'cyan');
  
  // Check if we need DIRECT_URL for Prisma
  if (process.env.DIRECT_URL) {
    log('Using DIRECT_URL for Prisma operations', 'blue');
  } else if (process.env.DATABASE_URL) {
    // If DATABASE_URL contains 6543 (pooler), we might need DIRECT_URL
    if (process.env.DATABASE_URL.includes(':6543')) {
      log('Warning: DATABASE_URL uses pooler port 6543', 'yellow');
      log('Consider using DIRECT_URL for Prisma CLI operations', 'yellow');
    }
  }
}

function runPrismaCommand(command) {
  log(`\nRunning: npx prisma ${command}`, 'magenta');
  
  try {
    const output = execSync(`npx prisma ${command}`, {
      stdio: 'inherit',
      env: process.env
    });
    return true;
  } catch (error) {
    log(`Command failed: ${error.message}`, 'red');
    return false;
  }
}

function showHelp() {
  log('\n=== Misrad AI Database Manager ===\n', 'cyan');
  log('Usage: node scripts/db.js [command] [options]\n');
  log('Commands:');
  log('  push:dev       Push schema to DEV database');
  log('  push:prod      Push schema to PROD database');
  log('  seed:dev       Seed DEV database');
  log('  seed:prod      Seed PROD database (DANGER)');
  log('  status         Check schema status');
  log('  validate       Validate Prisma schema');
  log('  generate       Generate Prisma client');
  log('  backup         Create database backup');
  log('  reset:dev      Reset DEV database (DANGER)');
  log('\nOptions:');
  log('  --force        Skip confirmations');
  log('  --env=prod     Use production environment');
  log('\nExamples:');
  log('  node scripts/db.js push:dev');
  log('  node scripts/db.js push:prod --force');
  log('  DB_ENV=prod node scripts/db.js status');
  log('');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }
  
  // Check for --env flag
  const envFlag = args.find(arg => arg.startsWith('--env='));
  if (envFlag) {
    process.env.DB_ENV = envFlag.split('=')[1];
  }
  
  // Load environment variables
  loadEnv();
  
  log(`\n${'='.repeat(50)}`, 'cyan');
  log(`Misrad AI Database Manager - ${ENV.toUpperCase()} Mode`, 'cyan');
  log(`${'='.repeat(50)}\n`, 'cyan');
  
  switch (command) {
    case 'push:dev':
      runPrismaCommand('db push');
      break;
      
    case 'push:prod':
      if (!args.includes('--force')) {
        log('⚠️  WARNING: This will modify PRODUCTION database!', 'red');
        log('Run with --force to proceed\n', 'yellow');
        process.exit(1);
      }
      runPrismaCommand('db push --accept-data-loss');
      break;
      
    case 'seed:dev':
      runPrismaCommand('db seed');
      break;
      
    case 'seed:prod':
      if (!args.includes('--force')) {
        log('⚠️  WARNING: This will SEED PRODUCTION database!', 'red');
        log('Run with --force to proceed\n', 'yellow');
        process.exit(1);
      }
      runPrismaCommand('db seed');
      break;
      
    case 'status':
      runPrismaCommand('migrate status');
      break;
      
    case 'validate':
      runPrismaCommand('validate');
      break;
      
    case 'generate':
      runPrismaCommand('generate');
      break;
      
    case 'backup':
      log('Creating backup...', 'blue');
      // This would integrate with your backup solution
      log('Backup functionality to be implemented', 'yellow');
      break;
      
    case 'reset:dev':
      if (!args.includes('--force')) {
        log('⚠️  WARNING: This will DELETE ALL DATA in DEV!', 'red');
        log('Run with --force to proceed\n', 'yellow');
        process.exit(1);
      }
      runPrismaCommand('migrate reset --force');
      break;
      
    default:
      log(`Unknown command: ${command}`, 'red');
      showHelp();
      process.exit(1);
  }
}

main().catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});
