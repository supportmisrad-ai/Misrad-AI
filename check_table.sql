SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_chat_sessions') as ai_chat_sessions_exists,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'impersonation_audit_logs') as impersonation_audit_logs_exists;
