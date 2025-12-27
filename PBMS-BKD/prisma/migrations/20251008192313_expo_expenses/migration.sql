/*
  Warnings:

  - Added the required column `exhibitionId` to the `ExhibitionExpenses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ExhibitionExpenses` ADD COLUMN `exhibitionId` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `ExhibitionExpenses` ADD CONSTRAINT `ExhibitionExpenses_exhibitionId_fkey` FOREIGN KEY (`exhibitionId`) REFERENCES `exhibitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
