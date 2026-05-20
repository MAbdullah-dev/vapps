-- Add recent activity widget toggle for dashboard settings
ALTER TABLE "dashboard_widgets" ADD COLUMN IF NOT EXISTS "recentActivity" BOOLEAN NOT NULL DEFAULT true;
