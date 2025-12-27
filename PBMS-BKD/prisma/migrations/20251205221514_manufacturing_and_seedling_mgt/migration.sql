-- AlterTable
ALTER TABLE `Attendance` ADD COLUMN `notes` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `exhibition_inventory` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT', 'MANUFACTURING') NOT NULL;

-- AlterTable
ALTER TABLE `exhibition_inventory_records` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT', 'MANUFACTURING') NOT NULL;

-- AlterTable
ALTER TABLE `inventory_records` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT', 'MANUFACTURING') NOT NULL;

-- AlterTable
ALTER TABLE `units` ADD COLUMN `value` DOUBLE NULL;

-- CreateTable
CREATE TABLE `SeedlingStages` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `stageDays` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SeedlingStages_name_idx`(`name`),
    INDEX `SeedlingStages_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeedlingBatch` (
    `id` CHAR(36) NOT NULL,
    `batchNumber` VARCHAR(191) NOT NULL,
    `currentStageId` CHAR(36) NOT NULL,
    `seedlings` JSON NOT NULL,
    `daysSpentInCurrentStage` DOUBLE NOT NULL,
    `status` ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeedlingBatchTracker` (
    `id` CHAR(36) NOT NULL,
    `batchId` CHAR(36) NOT NULL,
    `currentStageId` CHAR(36) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `seedlingsLostAtCurrentStage` JSON NOT NULL,
    `daysToNextStage` DOUBLE NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SeedlingDeath` (
    `id` CHAR(36) NOT NULL,
    `batchId` CHAR(36) NOT NULL,
    `stageId` CHAR(36) NOT NULL,
    `seedlings` JSON NOT NULL,
    `reason` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Manufacturing` (
    `id` CHAR(36) NOT NULL,
    `itemId` CHAR(36) NOT NULL,
    `stockMvtId` CHAR(36) NOT NULL,
    `expectedOutputQty` DOUBLE NOT NULL,
    `actualOutputQty` DOUBLE NULL,
    `unitId` CHAR(36) NOT NULL,
    `rawMaterials` JSON NOT NULL,
    `manufacturedBy` CHAR(36) NOT NULL,
    `productionDate` DATETIME(3) NOT NULL,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SeedlingBatch` ADD CONSTRAINT `SeedlingBatch_currentStageId_fkey` FOREIGN KEY (`currentStageId`) REFERENCES `SeedlingStages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeedlingBatchTracker` ADD CONSTRAINT `SeedlingBatchTracker_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `SeedlingBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeedlingBatchTracker` ADD CONSTRAINT `SeedlingBatchTracker_currentStageId_fkey` FOREIGN KEY (`currentStageId`) REFERENCES `SeedlingStages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeedlingDeath` ADD CONSTRAINT `SeedlingDeath_batchId_fkey` FOREIGN KEY (`batchId`) REFERENCES `SeedlingBatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SeedlingDeath` ADD CONSTRAINT `SeedlingDeath_stageId_fkey` FOREIGN KEY (`stageId`) REFERENCES `SeedlingStages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Manufacturing` ADD CONSTRAINT `Manufacturing_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Manufacturing` ADD CONSTRAINT `Manufacturing_stockMvtId_fkey` FOREIGN KEY (`stockMvtId`) REFERENCES `inventory_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Manufacturing` ADD CONSTRAINT `Manufacturing_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Manufacturing` ADD CONSTRAINT `Manufacturing_manufacturedBy_fkey` FOREIGN KEY (`manufacturedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
