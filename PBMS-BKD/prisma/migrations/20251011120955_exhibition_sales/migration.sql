/*
  Warnings:

  - You are about to drop the column `saleTotal` on the `exhibition_sales` table. All the data in the column will be lost.
  - Added the required column `exhibitionStoreId` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `exhibition_sales` DROP COLUMN `saleTotal`,
    ADD COLUMN `exhibitionStoreId` CHAR(36) NOT NULL,
    ADD COLUMN `total` DECIMAL(10, 2) NOT NULL;

-- AddForeignKey
ALTER TABLE `exhibition_sales` ADD CONSTRAINT `exhibition_sales_exhibitionStoreId_fkey` FOREIGN KEY (`exhibitionStoreId`) REFERENCES `exhibition_stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
