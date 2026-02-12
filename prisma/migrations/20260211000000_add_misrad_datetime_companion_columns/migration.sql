-- Add DateTime/Date companion columns for legacy string date/time fields (non-destructive)

-- misrad_clients
ALTER TABLE "misrad_clients"
  ADD COLUMN IF NOT EXISTS "last_contact_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "next_renewal_at" DATE,
  ADD COLUMN IF NOT EXISTS "cancellation_date_at" DATE;

UPDATE "misrad_clients"
SET "last_contact_at" = CASE
  WHEN "lastContact" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastContact"::timestamptz
  WHEN "lastContact" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastContact"::date)::timestamptz
  WHEN "lastContact" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastContact", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastContact" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastContact", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_contact_at" IS NULL;

UPDATE "misrad_clients"
SET "next_renewal_at" = CASE
  WHEN "nextRenewal" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "nextRenewal"::date
  WHEN "nextRenewal" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("nextRenewal", 'DD.MM.YYYY')
  WHEN "nextRenewal" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("nextRenewal", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "next_renewal_at" IS NULL;

UPDATE "misrad_clients"
SET "cancellation_date_at" = CASE
  WHEN "cancellationDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "cancellationDate"::date
  WHEN "cancellationDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("cancellationDate", 'DD.MM.YYYY')
  WHEN "cancellationDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("cancellationDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "cancellation_date_at" IS NULL;

-- misrad_journey_stages
ALTER TABLE "misrad_journey_stages"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_journey_stages"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_success_goals
ALTER TABLE "misrad_success_goals"
  ADD COLUMN IF NOT EXISTS "deadline_at" DATE,
  ADD COLUMN IF NOT EXISTS "last_updated_at" TIMESTAMPTZ(6);

UPDATE "misrad_success_goals"
SET "deadline_at" = CASE
  WHEN "deadline" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "deadline"::date
  WHEN "deadline" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("deadline", 'DD.MM.YYYY')
  WHEN "deadline" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("deadline", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "deadline_at" IS NULL;

UPDATE "misrad_success_goals"
SET "last_updated_at" = CASE
  WHEN "lastUpdated" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastUpdated"::timestamptz
  WHEN "lastUpdated" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastUpdated"::date)::timestamptz
  WHEN "lastUpdated" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastUpdated", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastUpdated" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastUpdated", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_updated_at" IS NULL;

-- misrad_metric_history
ALTER TABLE "misrad_metric_history"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_metric_history"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_client_handoffs
ALTER TABLE "misrad_client_handoffs"
  ADD COLUMN IF NOT EXISTS "handoff_date_at" DATE;

UPDATE "misrad_client_handoffs"
SET "handoff_date_at" = CASE
  WHEN "handoffDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "handoffDate"::date
  WHEN "handoffDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("handoffDate", 'DD.MM.YYYY')
  WHEN "handoffDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("handoffDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "handoff_date_at" IS NULL;

-- misrad_roi_records
ALTER TABLE "misrad_roi_records"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_roi_records"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_client_actions
ALTER TABLE "misrad_client_actions"
  ADD COLUMN IF NOT EXISTS "due_date_at" DATE,
  ADD COLUMN IF NOT EXISTS "last_reminder_sent_at" TIMESTAMPTZ(6);

UPDATE "misrad_client_actions"
SET "due_date_at" = CASE
  WHEN "dueDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "dueDate"::date
  WHEN "dueDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("dueDate", 'DD.MM.YYYY')
  WHEN "dueDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("dueDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "due_date_at" IS NULL;

UPDATE "misrad_client_actions"
SET "last_reminder_sent_at" = CASE
  WHEN "lastReminderSent" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastReminderSent"::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastReminderSent"::date)::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastReminderSent", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastReminderSent", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_reminder_sent_at" IS NULL;

-- misrad_assigned_forms
ALTER TABLE "misrad_assigned_forms"
  ADD COLUMN IF NOT EXISTS "date_sent_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "last_activity_at" TIMESTAMPTZ(6);

UPDATE "misrad_assigned_forms"
SET "date_sent_at" = CASE
  WHEN "dateSent" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "dateSent"::timestamptz
  WHEN "dateSent" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("dateSent"::date)::timestamptz
  WHEN "dateSent" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("dateSent", 'DD.MM.YYYY'))::timestamptz
  WHEN "dateSent" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("dateSent", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "date_sent_at" IS NULL;

UPDATE "misrad_assigned_forms"
SET "last_activity_at" = CASE
  WHEN "lastActivity" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastActivity"::timestamptz
  WHEN "lastActivity" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastActivity"::date)::timestamptz
  WHEN "lastActivity" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastActivity", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastActivity" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastActivity", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_activity_at" IS NULL;

-- misrad_feedback_items
ALTER TABLE "misrad_feedback_items"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_feedback_items"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_client_assets
ALTER TABLE "misrad_client_assets"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_client_assets"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_client_deliverables
ALTER TABLE "misrad_client_deliverables"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_client_deliverables"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_stakeholders
ALTER TABLE "misrad_stakeholders"
  ADD COLUMN IF NOT EXISTS "last_contact_at" TIMESTAMPTZ(6);

UPDATE "misrad_stakeholders"
SET "last_contact_at" = CASE
  WHEN "lastContact" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastContact"::timestamptz
  WHEN "lastContact" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastContact"::date)::timestamptz
  WHEN "lastContact" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastContact", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastContact" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastContact", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_contact_at" IS NULL;

-- misrad_meetings
ALTER TABLE "misrad_meetings"
  ADD COLUMN IF NOT EXISTS "date_at" DATE,
  ADD COLUMN IF NOT EXISTS "meeting_at" TIMESTAMPTZ(6);

UPDATE "misrad_meetings"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

UPDATE "misrad_meetings"
SET "meeting_at" = ("date_at")::timestamptz
WHERE "meeting_at" IS NULL AND "date_at" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_misrad_meetings_org_meeting_at" ON "misrad_meetings"("organization_id", "meeting_at");
CREATE INDEX IF NOT EXISTS "idx_misrad_meetings_client_meeting_at" ON "misrad_meetings"("client_id", "meeting_at");

-- misrad_ai_tasks
ALTER TABLE "misrad_ai_tasks"
  ADD COLUMN IF NOT EXISTS "deadline_at" DATE;

UPDATE "misrad_ai_tasks"
SET "deadline_at" = CASE
  WHEN "deadline" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "deadline"::date
  WHEN "deadline" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("deadline", 'DD.MM.YYYY')
  WHEN "deadline" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("deadline", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "deadline_at" IS NULL;

-- misrad_emails
ALTER TABLE "misrad_emails"
  ADD COLUMN IF NOT EXISTS "timestamp_at" TIMESTAMPTZ(6);

UPDATE "misrad_emails"
SET "timestamp_at" = CASE
  WHEN "timestamp" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "timestamp"::timestamptz
  ELSE NULL
END
WHERE "timestamp_at" IS NULL;

-- misrad_client_agreements
ALTER TABLE "misrad_client_agreements"
  ADD COLUMN IF NOT EXISTS "signed_date_at" DATE,
  ADD COLUMN IF NOT EXISTS "expiry_date_at" DATE;

UPDATE "misrad_client_agreements"
SET "signed_date_at" = CASE
  WHEN "signedDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "signedDate"::date
  WHEN "signedDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("signedDate", 'DD.MM.YYYY')
  WHEN "signedDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("signedDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "signed_date_at" IS NULL;

UPDATE "misrad_client_agreements"
SET "expiry_date_at" = CASE
  WHEN "expiryDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "expiryDate"::date
  WHEN "expiryDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("expiryDate", 'DD.MM.YYYY')
  WHEN "expiryDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("expiryDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "expiry_date_at" IS NULL;

-- misrad_cycles
ALTER TABLE "misrad_cycles"
  ADD COLUMN IF NOT EXISTS "start_date_at" DATE,
  ADD COLUMN IF NOT EXISTS "end_date_at" DATE;

UPDATE "misrad_cycles"
SET "start_date_at" = CASE
  WHEN "startDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "startDate"::date
  WHEN "startDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("startDate", 'DD.MM.YYYY')
  WHEN "startDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("startDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "start_date_at" IS NULL;

UPDATE "misrad_cycles"
SET "end_date_at" = CASE
  WHEN "endDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "endDate"::date
  WHEN "endDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("endDate", 'DD.MM.YYYY')
  WHEN "endDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("endDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "end_date_at" IS NULL;

-- misrad_cycle_tasks
ALTER TABLE "misrad_cycle_tasks"
  ADD COLUMN IF NOT EXISTS "due_date_at" DATE,
  ADD COLUMN IF NOT EXISTS "last_reminder_sent_at" TIMESTAMPTZ(6);

UPDATE "misrad_cycle_tasks"
SET "due_date_at" = CASE
  WHEN "dueDate" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "dueDate"::date
  WHEN "dueDate" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("dueDate", 'DD.MM.YYYY')
  WHEN "dueDate" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("dueDate", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "due_date_at" IS NULL;

UPDATE "misrad_cycle_tasks"
SET "last_reminder_sent_at" = CASE
  WHEN "lastReminderSent" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "lastReminderSent"::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("lastReminderSent"::date)::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("lastReminderSent", 'DD.MM.YYYY'))::timestamptz
  WHEN "lastReminderSent" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("lastReminderSent", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "last_reminder_sent_at" IS NULL;

-- misrad_cycle_assets
ALTER TABLE "misrad_cycle_assets"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_cycle_assets"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_group_events
ALTER TABLE "misrad_group_events"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "misrad_group_events"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- misrad_notifications
ALTER TABLE "misrad_notifications"
  ADD COLUMN IF NOT EXISTS "timestamp_at" TIMESTAMPTZ(6);

UPDATE "misrad_notifications"
SET "timestamp_at" = CASE
  WHEN "timestamp" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "timestamp"::timestamptz
  ELSE NULL
END
WHERE "timestamp_at" IS NULL;

-- misrad_activity_logs
ALTER TABLE "misrad_activity_logs"
  ADD COLUMN IF NOT EXISTS "date_at" TIMESTAMPTZ(6);

UPDATE "misrad_activity_logs"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "date"::timestamptz
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("date"::date)::timestamptz
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN (to_date("date", 'DD.MM.YYYY'))::timestamptz
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN (to_date("date", 'DD/MM/YYYY'))::timestamptz
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- system_partners
ALTER TABLE "system_partners"
  ADD COLUMN IF NOT EXISTS "last_active_at" TIMESTAMPTZ(6);

UPDATE "system_partners"
SET "last_active_at" = CASE
  WHEN "last_active" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "last_active"::timestamptz
  WHEN "last_active" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("last_active"::date)::timestamptz
  ELSE NULL
END
WHERE "last_active_at" IS NULL;

-- system_portal_approvals
ALTER TABLE "system_portal_approvals"
  ADD COLUMN IF NOT EXISTS "date_at" DATE;

UPDATE "system_portal_approvals"
SET "date_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN "date"::date
  WHEN "date" ~ '^\\d{1,2}\\.\\d{1,2}\\.\\d{4}$' THEN to_date("date", 'DD.MM.YYYY')
  WHEN "date" ~ '^\\d{1,2}/\\d{1,2}/\\d{4}$' THEN to_date("date", 'DD/MM/YYYY')
  ELSE NULL
END
WHERE "date_at" IS NULL;

-- Align existing DateTime fields that were present in schema but missing in DB

-- system_calendar_events.occurs_at
ALTER TABLE "system_calendar_events"
  ADD COLUMN IF NOT EXISTS "occurs_at" TIMESTAMPTZ(6);

UPDATE "system_calendar_events"
SET "occurs_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' AND "time" ~ '^\\d{1,2}:\\d{2}$'
    THEN ("date" || 'T' || lpad("time", 5, '0') || ':00.000Z')::timestamptz
  ELSE NULL
END
WHERE "occurs_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_system_calendar_events_org_occurs_at" ON "system_calendar_events"("organization_id", "occurs_at");

-- system_call_analyses.call_at
ALTER TABLE "system_call_analyses"
  ADD COLUMN IF NOT EXISTS "call_at" TIMESTAMPTZ(6);

UPDATE "system_call_analyses"
SET "call_at" = CASE
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}T' THEN "date"::timestamptz
  WHEN "date" ~ '^\\d{4}-\\d{2}-\\d{2}$' THEN ("date"::date)::timestamptz
  ELSE NULL
END
WHERE "call_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_system_call_analyses_org_call_at" ON "system_call_analyses"("organization_id", "call_at");
