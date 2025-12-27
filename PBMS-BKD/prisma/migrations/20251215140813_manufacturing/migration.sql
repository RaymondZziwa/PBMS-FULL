/*
  Warnings:

  - You are about to drop the `Manufacturing` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `Manufacturing` DROP FOREIGN KEY `Manufacturing_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `Manufacturing` DROP FOREIGN KEY `Manufacturing_manufacturedBy_fkey`;

-- DropForeignKey
ALTER TABLE `Manufacturing` DROP FOREIGN KEY `Manufacturing_stockMvtId_fkey`;

-- DropForeignKey
ALTER TABLE `Manufacturing` DROP FOREIGN KEY `Manufacturing_unitId_fkey`;

-- AlterTable
ALTER TABLE `inventory_records` ADD COLUMN `expectedOutput` DOUBLE NULL,
    ADD COLUMN `recordedOutput` DOUBLE NULL;

-- DropTable
DROP TABLE `Manufacturing`;

-- CreateTable
CREATE TABLE `manufacturing` (
    `id` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `primaryUnitId` CHAR(36) NOT NULL,
    `unitId` CHAR(36) NOT NULL,
    `totalQuantity` DOUBLE NOT NULL,
    `estimatedOutput` DOUBLE NOT NULL,
    `actualOutput` DOUBLE NULL,
    `items` JSON NOT NULL,
    `manufacturedBy` CHAR(36) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `manufacturing_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `manufacturing_manufacturedBy_createdAt_idx`(`manufacturedBy`, `createdAt`),
    INDEX `manufacturing_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `manufacturing` ADD CONSTRAINT `manufacturing_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing` ADD CONSTRAINT `manufacturing_primaryUnitId_fkey` FOREIGN KEY (`primaryUnitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing` ADD CONSTRAINT `manufacturing_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `manufacturing` ADD CONSTRAINT `manufacturing_manufacturedBy_fkey` FOREIGN KEY (`manufacturedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
