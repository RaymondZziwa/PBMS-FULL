/*
  Warnings:

  - You are about to drop the column `exhibitionId` on the `exhibition_sales` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `exhibition_sales` DROP FOREIGN KEY `exhibition_sales_exhibitionId_fkey`;

-- DropIndex
DROP INDEX `exhibition_sales_exhibitionId_createdAt_idx` ON `exhibition_sales`;

-- AlterTable
ALTER TABLE `exhibition_sales` DROP COLUMN `exhibitionId`;
