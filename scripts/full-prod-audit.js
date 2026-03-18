const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

const TABLES_TO_CHECK = [
  // Bot leads - CRITICAL
  'bot_leads', 'bot_leads_extended', 'bot_conversations',
  'bot_media', 'bot_outgoing_messages', 'bot_survey_responses',
  'bot_campaigns', 'bot_lottery', 'bot_referrals', 'bot_coupons',
  'bot_affiliates', 'bot_analytics', 'bot_conversions',
  // Core
  'organizations', 'social_users', 'users', 'clients',
  // Business
  'business_clients', 'business_client_contacts', 'business_client_organizations',
  // Client OS
  'client_clients', 'client_contacts', 'client_interactions',
  // Finance
  'invoices', 'payments', 'expenses', 'financial_accounts',
  // Nexus
  'nexus_tasks', 'nexus_projects', 'nexus_teams', 'nexus_time_entries',
  // Booking
  'booking_services', 'booking_availability', 'booking_appointments',
  // AI
  'ai_chats', 'ai_messages', 'ai_tower_usage', 'ai_credits',
  // Support
  'tickets', 'ticket_comments', 'ticket_attachments',
  // Email
  'email_templates', 'email_logs', 'email_sequences',
  // Attendance
  'attendance_records', 'attendance_time_entries', 'employees',
  // Social
  'social_posts', 'social_accounts', 'social_organizations',
  // Other
  'notifications', 'notification_preferences',
  'subscriptions', 'subscription_items', 'plans', 'plan_features',
  'campaigns', 'campaign_recipients', 'campaign_events',
  'webhooks', 'webhook_deliveries',
  'api_keys', 'api_logs',
  'documents', 'document_versions', 'document_shares',
  'workflows', 'workflow_runs', 'workflow_steps',
  'forms', 'form_submissions', 'form_fields',
  'tags', 'taggables',
  'activities', 'activity_logs',
  'settings', 'user_settings',
  'media', 'files', 'uploads',
  'departments', 'locations',
  // E-commerce
  'products', 'product_variants', 'product_inventory',
  'orders', 'order_items', 'services', 'service_packages',
  // Communication
  'sms', 'sms_logs', 'push', 'push_tokens',
  // HR
  'shift_schedules', 'shift_swaps', 'time_off', 'time_off_requests',
  'payroll', 'payroll_runs', 'benefits', 'benefit_enrollments',
  // Marketing
  'coupons', 'coupon_redemptions',
  'affiliates', 'affiliate_referrals', 'affiliate_commissions',
  'referrals', 'referral_codes', 'referral_rewards',
  // Learning
  'courses', 'course_modules', 'course_lessons', 'course_progress',
  'training', 'training_modules', 'training_progress',
  // Knowledge
  'kb_articles', 'kb_categories', 'kb_tags',
  'help_articles', 'help_categories',
  'faq_questions', 'faq_categories',
  // Events
  'events', 'event_registrations', 'event_recordings',
  'webinars', 'webinar_registrations',
  // Analytics
  'analytics_events', 'analytics_sessions', 'analytics_pageviews',
  'reports', 'report_schedules',
  // Security
  'sessions', 'audit_logs',
  'password_resets', 'verification_tokens',
  'invites', 'invite_codes',
  // Integrations
  'integrations', 'integration_configs', 'integration_logs',
  'oauth_accounts', 'oauth_tokens',
  // Data
  'imports', 'import_rows', 'import_errors',
  'exports', 'export_rows',
  'backups', 'backup_logs',
];

async function fullProdAudit() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 FULL PROD DATABASE AUDIT');
  console.log('=' .repeat(70));
  console.log(`Checking ${TABLES_TO_CHECK.length} tables...\n`);
  
  const existing = [];
  const missing = [];
  const errors = [];
  
  for (const table of TABLES_TO_CHECK) {
    try {
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        // Check if it's "relation does not exist" error
        if (error.message?.includes('does not exist') || 
            error.message?.includes('42P01') ||
            error.code === '42P01') {
          missing.push(table);
        } else {
          errors.push({ table, error: error.message, code: error.code });
        }
      } else {
        existing.push({ table, count: count || 0 });
      }
    } catch (e) {
      errors.push({ table, error: e.message });
    }
  }
  
  // Results
  console.log(`\n📊 RESULTS:`);
  console.log(`  ✅ EXISTING: ${existing.length} tables`);
  console.log(`  ❌ MISSING: ${missing.length} tables`);
  console.log(`  ⚠️  ERRORS: ${errors.length} tables`);
  
  // Show existing tables
  console.log(`\n✅ EXISTING TABLES (${existing.length}):`);
  existing.sort((a, b) => b.count - a.count);
  existing.forEach(({ table, count }) => {
    console.log(`  ${table.padEnd(35)} ${String(count).padStart(5)} rows`);
  });
  
  // Show missing tables
  if (missing.length > 0) {
    console.log(`\n❌ MISSING TABLES (${missing.length}) - NEED MIGRATION:`);
    missing.sort().forEach(table => {
      console.log(`  - ${table}`);
    });
  }
  
  // Show errors
  if (errors.length > 0) {
    console.log(`\n⚠️  TABLES WITH ERRORS (${errors.length}):`);
    errors.forEach(({ table, error, code }) => {
      console.log(`  - ${table}: ${code || error}`);
    });
  }
  
  // Summary by category
  console.log(`\n📋 SUMMARY BY CATEGORY:`);
  const categories = {
    'Bot Leads': ['bot_leads', 'bot_leads_extended', 'bot_conversations', 'bot_media', 'bot_outgoing_messages', 'bot_survey_responses', 'bot_campaigns', 'bot_lottery', 'bot_referrals', 'bot_coupons', 'bot_affiliates', 'bot_analytics', 'bot_conversions'],
    'Core': ['organizations', 'social_users', 'users', 'clients'],
    'Business': ['business_clients', 'business_client_contacts', 'business_client_organizations'],
    'Client OS': ['client_clients', 'client_contacts', 'client_interactions'],
    'Finance': ['invoices', 'payments', 'expenses', 'financial_accounts'],
    'Nexus': ['nexus_tasks', 'nexus_projects', 'nexus_teams', 'nexus_time_entries'],
    'Booking': ['booking_services', 'booking_availability', 'booking_appointments'],
    'AI': ['ai_chats', 'ai_messages', 'ai_tower_usage', 'ai_credits'],
    'Support': ['tickets', 'ticket_comments', 'ticket_attachments'],
    'Email': ['email_templates', 'email_logs', 'email_sequences'],
    'Attendance': ['attendance_records', 'attendance_time_entries', 'employees'],
    'Social': ['social_posts', 'social_accounts', 'social_organizations'],
    'Other': ['notifications', 'subscriptions', 'plans', 'campaigns', 'webhooks', 'api_keys', 'documents', 'workflows', 'forms', 'tags', 'activities', 'settings', 'departments', 'locations']
  };
  
  for (const [cat, tables] of Object.entries(categories)) {
    const catExisting = tables.filter(t => existing.some(e => e.table === t)).length;
    const catMissing = tables.filter(t => missing.includes(t)).length;
    const catTotal = tables.length;
    const status = catMissing === 0 ? '✅' : catMissing === catTotal ? '❌' : '⚠️';
    console.log(`  ${status} ${cat.padEnd(15)} ${catExisting}/${catTotal} tables`);
  }
  
  // Check migrations
  const { data: migrations } = await supabase
    .from('_prisma_migrations')
    .select('migration_name, finished_at')
    .order('finished_at', { ascending: false })
    .limit(20);
    
  console.log(`\n📜 LAST 10 MIGRATIONS:`);
  migrations?.slice(0, 10).forEach(m => {
    const date = new Date(m.finished_at).toLocaleDateString('he-IL');
    console.log(`  ${date}  ${m.migration_name}`);
  });
  
  return { existing, missing, errors };
}

fullProdAudit().then(result => {
  console.log(`\n${'='.repeat(70)}`);
  if (result.missing.length > 0) {
    console.log(`⚠️  ACTION: Run prisma migrate deploy on PROD`);
    console.log(`   Or manually create ${result.missing.length} missing tables`);
  } else {
    console.log(`✅ ALL TABLES EXIST - NO ACTION NEEDED`);
  }
}).catch(console.error);
