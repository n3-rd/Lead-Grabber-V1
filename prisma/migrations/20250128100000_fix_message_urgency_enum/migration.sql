-- Fix MessageUrgency enum: remove duplicate/yellow, keep green, blue, red.
-- Map existing 'yellow' to 'blue' (Level 3).

UPDATE "messages" SET "urgency" = 'blue' WHERE "urgency" = 'yellow';

CREATE TYPE "MessageUrgency_new" AS ENUM ('green', 'blue', 'red');

ALTER TABLE "messages" ALTER COLUMN "urgency" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "urgency" TYPE "MessageUrgency_new" USING ("urgency"::text::"MessageUrgency_new");
ALTER TABLE "messages" ALTER COLUMN "urgency" SET DEFAULT NULL;
DROP TYPE "MessageUrgency";
ALTER TYPE "MessageUrgency_new" RENAME TO "MessageUrgency";
