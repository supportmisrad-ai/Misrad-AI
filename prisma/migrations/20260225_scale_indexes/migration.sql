-- Scale optimization: add missing composite indexes for high-volume query patterns
-- Non-destructive: CREATE INDEX IF NOT EXISTS

-- MisradActivityLog: org + type + created_at (filter by org + activity type + time range)
CREATE INDEX IF NOT EXISTS "idx_misrad_activity_logs_org_type_created"
  ON "misrad_activity_logs" ("organization_id", "type", "created_at");

-- NexusTimeEntry: org + date (attendance queries by org + day)
CREATE INDEX IF NOT EXISTS "idx_nexus_time_entries_org_date"
  ON "nexus_time_entries" ("organization_id", "date");

-- NexusTimeEntry: org + user + date (attendance queries per employee)
CREATE INDEX IF NOT EXISTS "idx_nexus_time_entries_org_user_date"
  ON "nexus_time_entries" ("organization_id", "user_id", "date");

-- billing_events: org + event_type + occurred_at (billing history by type)
CREATE INDEX IF NOT EXISTS "idx_billing_events_org_type_occurred"
  ON "billing_events" ("organization_id", "event_type", "occurred_at");

-- NexusTeamEvent: org + start_date (calendar queries)
CREATE INDEX IF NOT EXISTS "idx_nexus_team_events_org_start_date"
  ON "nexus_team_events" ("organization_id", "start_date");

-- ai_usage_logs: org + feature_key + created_at DESC (AI usage analytics per feature)
CREATE INDEX IF NOT EXISTS "ai_usage_logs_org_feature_created_idx"
  ON "ai_usage_logs" ("organization_id", "feature_key", "created_at" DESC);

-- OperationsCallMessage: work_order + created_at (message ordering within work order)
CREATE INDEX IF NOT EXISTS "idx_operations_call_messages_wo_created"
  ON "operations_call_messages" ("work_order_id", "created_at");
