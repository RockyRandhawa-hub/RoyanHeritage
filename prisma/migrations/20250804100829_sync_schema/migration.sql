/*
  Warnings:

  - The values [THURSDAY_EVENING] on the enum `Slot` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Slot_new" AS ENUM ('TUESDAY_EVENING', 'SATURDAY_EVENING', 'SUNDAY_MORNING');
ALTER TABLE "SlotAvailability" ALTER COLUMN "slot" TYPE "Slot_new" USING ("slot"::text::"Slot_new");
ALTER TABLE "TempOrder" ALTER COLUMN "slot" TYPE "Slot_new" USING ("slot"::text::"Slot_new");
ALTER TABLE "Ticket" ALTER COLUMN "slot" TYPE "Slot_new" USING ("slot"::text::"Slot_new");
ALTER TYPE "Slot" RENAME TO "Slot_old";
ALTER TYPE "Slot_new" RENAME TO "Slot";
DROP TYPE "Slot_old";
COMMIT;

-- DropIndex
DROP INDEX "Visitor_mobile_key";
