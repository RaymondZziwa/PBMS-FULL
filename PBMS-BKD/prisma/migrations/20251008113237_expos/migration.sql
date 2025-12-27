/*
  Warnings:

  - You are about to drop the column `quantity` on the `exhibition_inventory` table. All the data in the column will be lost.
  - Added the required column `category` to the `exhibition_inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `exhibition_inventory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `exhibition_inventory` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `exhibition_inventory` DROP COLUMN `quantity`,
    ADD COLUMN `category` ENUM('RESTOCK', 'DEPLETION', 'ADJUSTMENT') NOT NULL,
    ADD COLUMN `qty` DOUBLE NOT NULL,
    ADD COLUMN `unitId` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `project_payments` ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `referenceId` VARCHAR(191) NULL,
    ALTER COLUMN `paymentMethod` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `exhibition_inventory` ADD CONSTRAINT `exhibition_inventory_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
