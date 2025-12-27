/*
  Warnings:

  - Added the required column `category` to the `InventoryRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `InventoryRecord` ADD COLUMN `category` ENUM('RESTOCK', 'DEPLETION', 'ADJUSTMENT') NOT NULL;
