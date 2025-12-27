/*
  Warnings:

  - Added the required column `unitId` to the `Supply` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Supply` ADD COLUMN `unitId` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `Supply` ADD CONSTRAINT `Supply_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
