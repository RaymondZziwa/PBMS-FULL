/*
  Warnings:

  - You are about to drop the column `evidenceImage` on the `inventory_records` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `inventory_records` DROP COLUMN `evidenceImage`,
    ADD COLUMN `images` JSON NULL;
