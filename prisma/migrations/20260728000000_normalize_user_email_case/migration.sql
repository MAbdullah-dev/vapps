-- Normalize User.email to lowercase and enforce case-insensitive uniqueness.
--
-- The application now lowercases every email before writing (see lib/email-normalize.ts),
-- but the `User_email_key` unique constraint is case-sensitive, so historic rows may
-- contain mixed-case addresses and even case-variant duplicates.

-- 1) Lowercase every address that does NOT collide with an existing lowercase row.
UPDATE "User" u
SET "email" = lower(u."email")
WHERE u."email" IS NOT NULL
  AND u."email" <> lower(u."email")
  AND NOT EXISTS (
    SELECT 1
    FROM "User" o
    WHERE o."id" <> u."id"
      AND lower(o."email") = lower(u."email")
  );

-- 2) Refuse to continue if genuine case-variant duplicates remain. These need a human
--    decision (which account keeps the address), so fail loudly instead of guessing.
DO $$
DECLARE
  dup_groups integer;
  dup_examples text;
BEGIN
  SELECT count(*), string_agg(email_lower, ', ')
  INTO dup_groups, dup_examples
  FROM (
    SELECT lower("email") AS email_lower
    FROM "User"
    WHERE "email" IS NOT NULL
    GROUP BY lower("email")
    HAVING count(*) > 1
    LIMIT 10
  ) d;

  IF dup_groups > 0 THEN
    RAISE EXCEPTION
      'Cannot enforce case-insensitive email uniqueness: % duplicate address group(s) remain (e.g. %). Resolve them first — run: npm run auth:check-duplicate-emails',
      dup_groups, dup_examples;
  END IF;
END $$;

-- 3) Enforce case-insensitive uniqueness going forward.
--    NULL emails stay allowed (Postgres treats NULLs as distinct).
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_lower_key" ON "User" (lower("email"));
