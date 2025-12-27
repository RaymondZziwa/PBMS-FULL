/*
  Warnings:

  - You are about to drop the column `deliveryNote` on the `project_sales` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `project_sales` DROP COLUMN `deliveryNote`,
    ADD COLUMN `deliveryNoteImage` VARCHAR(191) NULL;
