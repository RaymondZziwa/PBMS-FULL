/*
  Warnings:

  - Added the required column `destinationStoreId` to the `Supply` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Supply` ADD COLUMN `destinationStoreId` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `Supply` ADD CONSTRAINT `Supply_destinationStoreId_fkey` FOREIGN KEY (`destinationStoreId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
