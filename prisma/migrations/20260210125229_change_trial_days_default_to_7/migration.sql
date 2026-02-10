-- Change trial_days default from 14 to 7 days
-- This only affects NEW organizations and team members created after this migration
-- Existing records will keep their current trial_days value

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "trial_days" SET DEFAULT 7;

-- AlterTable
ALTER TABLE "social_team_members" ALTER COLUMN "trial_days" SET DEFAULT 7;
