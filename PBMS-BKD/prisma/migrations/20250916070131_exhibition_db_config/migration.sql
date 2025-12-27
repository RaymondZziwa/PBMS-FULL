/*
  Warnings:

  - The values [OUTSTOCK] on the enum `ExhibitionInventoryRecords_category` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `ExhibitionInventoryRecords` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'ADJUSTMENT') NOT NULL;
