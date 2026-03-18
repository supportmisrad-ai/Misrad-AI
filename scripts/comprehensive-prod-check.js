const { createClient } = require('@supabase/supabase-js');

const PROD_URL = 'https://jlgoeqhlkxyhlfnijyxu.supabase.co';
const PROD_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY_PROD || process.env.SUPABASE_SERVICE_ROLE_KEY;

async function comprehensiveProdCheck() {
  const supabase = createClient(PROD_URL, PROD_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  console.log('🔍 COMPREHENSIVE PROD DATABASE AUDIT\n');
  console.log('=' .repeat(60));
  
  // 1. Check _prisma_migrations
  console.log('\n📜 PRISMA MIGRATIONS:');
  const { data: migrations, error: migError } = await supabase
    .from('_prisma_migrations')
    .select('migration_name, finished_at, applied_steps_count')
    .order('finished_at', { ascending: false });
    
  if (migError) {
    console.log('  ❌ Cannot read _prisma_migrations:', migError.message);
  } else {
    console.log(`  Total migrations: ${migrations.length}`);
    console.log('\n  Last 15 migrations:');
    migrations.slice(0, 15).forEach(m => {
      const date = new Date(m.finished_at).toLocaleDateString('he-IL');
      console.log(`    - ${m.migration_name} (${date})`);
    });
  }
  
  // 2. Get all tables by trying to select from them
  console.log('\n\n📊 ALL TABLES CHECK:');
  const allTables = [
    // Core tables
    'organizations', 'users', 'clients', 'projects', 'tasks',
    // Bot leads tables
    'bot_leads', 'bot_leads_extended', 'bot_conversations', 'bot_conversations_extended',
    'bot_media', 'bot_outgoing_messages', 'bot_survey_responses',
    'bot_campaigns', 'bot_lottery', 'bot_referrals', 'bot_coupons',
    'bot_affiliates', 'bot_analytics', 'bot_conversions',
    // Social tables
    'social_posts', 'social_accounts', 'social_organizations', 'social_users',
    // CRM tables
    'business_clients', 'business_client_contacts', 'business_client_organizations',
    'client_clients', 'client_contacts', 'client_interactions',
    // Booking tables
    'booking_services', 'booking_availability', 'booking_appointments',
    // Finance tables
    'invoices', 'payments', 'expenses', 'financial_accounts',
    // Nexus tables
    'nexus_tasks', 'nexus_projects', 'nexus_teams', 'nexus_time_entries',
    // AI tables
    'ai_chats', 'ai_messages', 'ai_tower_usage', 'ai_credits',
    // Other tables
    'attendance_records', 'attendance_time_entries', 'employees',
    'email_templates', 'email_logs', 'email_sequences',
    'notifications', 'notification_preferences',
    'subscriptions', 'plans', 'plan_features',
    'tickets', 'ticket_comments', 'ticket_attachments',
    'documents', 'document_versions', 'document_shares',
    'workflows', 'workflow_runs', 'workflow_steps',
    'forms', 'form_submissions', 'form_fields',
    'tags', 'taggables',
    'activities', 'activity_logs',
    'settings', 'user_settings',
    'media', 'files', 'uploads',
    'webhooks', 'webhook_deliveries',
    'api_keys', 'api_logs',
    'campaigns', 'campaign_recipients', 'campaign_events',
    'coupons', 'coupon_redemptions',
    'affiliates', 'affiliate_referrals', 'affiliate_commissions',
    'waitlist', 'early_access', 'beta_users',
    'feedback', 'reviews', 'testimonials',
    'reports', 'report_schedules', 'report_deliveries',
    'dashboards', 'dashboard_widgets', 'widget_data',
    'integrations', 'integration_configs', 'integration_logs',
    'imports', 'import_rows', 'import_errors',
    'exports', 'export_rows',
    'backups', 'backup_logs',
    'jobs', 'job_queues', 'job_failures',
    'events', 'event_logs', 'event_handlers',
    'audits', 'audit_logs', 'audit_entries',
    'sessions', 'session_logs',
    'permissions', 'roles', 'role_permissions',
    'oauth_accounts', 'oauth_tokens',
    'mfa', 'mfa_methods', 'mfa_codes',
    'password_resets', 'verification_tokens',
    'invites', 'invite_codes',
    'domains', 'domain_verifications',
    'ssl_certificates', 'ssl_logs',
    'cdn_logs', 'edge_logs',
    'analytics_events', 'analytics_sessions', 'analytics_pageviews',
    'feature_flags', 'feature_flag_conditions',
    'experiments', 'experiment_variants', 'experiment_results',
    'ab_tests', 'ab_test_variants', 'ab_test_results',
    'surveys', 'survey_questions', 'survey_answers',
    'polls', 'poll_options', 'poll_votes',
    'quizzes', 'quiz_questions', 'quiz_answers',
    'certificates', 'certificate_logs',
    'signatures', 'signature_logs',
    'contracts', 'contract_versions', 'contract_signatures',
    'proposals', 'proposal_versions', 'proposal_approvals',
    'invoices', 'invoice_items', 'invoice_payments',
    'quotes', 'quote_items', 'quote_approvals',
    'orders', 'order_items', 'order_shipments',
    'products', 'product_variants', 'product_inventory',
    'services', 'service_packages', 'service_bookings',
    'subscriptions', 'subscription_items', 'subscription_payments',
    'credits', 'credit_transactions', 'credit_balances',
    'points', 'point_transactions', 'point_balances',
    'wallets', 'wallet_transactions', 'wallet_balances',
    'referrals', 'referral_codes', 'referral_rewards',
    'loyalty', 'loyalty_tiers', 'loyalty_rewards',
    'gamification', 'badges', 'achievements', 'leaderboards',
    'notifications', 'notification_templates', 'notification_logs',
    'emails', 'email_templates', 'email_logs',
    'sms', 'sms_templates', 'sms_logs',
    'push', 'push_tokens', 'push_logs',
    'slack', 'slack_channels', 'slack_logs',
    'discord', 'discord_channels', 'discord_logs',
    'teams', 'team_members', 'team_invites',
    'departments', 'department_members',
    'locations', 'location_hours', 'location_holidays',
    'shifts', 'shift_schedules', 'shift_swaps',
    'time_off', 'time_off_requests', 'time_off_balances',
    'payroll', 'payroll_runs', 'payroll_items',
    'benefits', 'benefit_enrollments', 'benefit_claims',
    'expenses', 'expense_reports', 'expense_items',
    'budgets', 'budget_items', 'budget_actuals',
    'forecasts', 'forecast_items', 'forecast_actuals',
    'kpi', 'kpi_values', 'kpi_targets',
    'goals', 'goal_progress', 'goal_achievements',
    'okrs', 'okr_key_results', 'okr_progress',
    'reviews', 'review_cycles', 'review_forms', 'review_answers',
    'feedbacks', 'feedback_requests', 'feedback_responses',
    'one_on_ones', 'one_on_one_notes', 'one_on_one_action_items',
    'performance', 'performance_reviews', 'performance_goals',
    'training', 'training_modules', 'training_progress',
    'certifications', 'certification_requirements', 'certification_completions',
    'compliance', 'compliance_requirements', 'compliance_audits',
    'policies', 'policy_acknowledgments',
    'procedures', 'procedure_steps', 'procedure_logs',
    'sops', 'sop_versions', 'sop_logs',
    'kb', 'kb_articles', 'kb_categories', 'kb_tags',
    'docs', 'docs_pages', 'docs_versions',
    'wiki', 'wiki_pages', 'wiki_versions',
    'help', 'help_articles', 'help_categories',
    'faq', 'faq_questions', 'faq_categories',
    'tutorials', 'tutorial_steps', 'tutorial_progress',
    'guides', 'guide_steps', 'guide_progress',
    'videos', 'video_progress', 'video_analytics',
    'webinars', 'webinar_registrations', 'webinar_recordings',
    'podcasts', 'podcast_episodes', 'podcast_subscriptions',
    'courses', 'course_modules', 'course_lessons', 'course_progress',
    'tests', 'test_questions', 'test_answers', 'test_results',
    'assessments', 'assessment_questions', 'assessment_answers',
    'evaluations', 'evaluation_criteria', 'evaluation_scores',
    'screenings', 'screening_questions', 'screening_results',
    'interviews', 'interview_questions', 'interview_feedback',
    'hiring', 'hiring_stages', 'hiring_candidates',
    'onboarding', 'onboarding_tasks', 'onboarding_progress',
    'offboarding', 'offboarding_tasks', 'offboarding_progress',
  ];
  
  const existing = [];
  const missing = [];
  
  for (const table of allTables) {
    const { data, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error && error.code === '42P01') { // Table doesn't exist
      missing.push(table);
    } else if (!error) {
      existing.push({ table, count: data?.length ?? '?' });
    } else {
      // Some other error
      console.log(`  ⚠️ ${table}: ${error.message}`);
    }
  }
  
  console.log(`\n  ✅ EXISTING: ${existing.length} tables`);
  console.log(`  ❌ MISSING: ${missing.length} tables`);
  
  if (missing.length > 0) {
    console.log('\n  ❌ MISSING TABLES:');
    missing.forEach(t => console.log(`    - ${t}`));
  }
  
  return { existing, missing, migrations };
}

comprehensiveProdCheck().then(result => {
  if (result?.missing?.length > 0) {
    console.log('\n\n⚠️ ACTION REQUIRED:');
    console.log(`Run: npx prisma migrate deploy on PROD`);
    console.log('Or create missing tables manually');
  }
}).catch(console.error);
