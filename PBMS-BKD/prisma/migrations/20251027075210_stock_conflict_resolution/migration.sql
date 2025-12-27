/*
  Warnings:

  - You are about to drop the column `isReviewed` on the `DeliveryNote` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `DeliveryNote` DROP COLUMN `isReviewed`;

-- AlterTable
ALTER TABLE `inventory_records` ADD COLUMN `isResolved` BOOLEAN NULL,
    ADD COLUMN `resolveNotes` VARCHAR(191) NULL;
