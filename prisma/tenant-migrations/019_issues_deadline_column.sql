-- Optional deadline on issues (API/UI expect this column; safe if already present).
ALTER TABLE "issues" ADD COLUMN IF NOT EXISTS "deadline" TIMESTAMP(3);
