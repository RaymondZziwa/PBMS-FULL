-- AlterTable
ALTER TABLE `inventory_records` ADD COLUMN `deliveryNoteId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `DeliveryNote` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `deliveryNoteNumber` VARCHAR(191) NOT NULL,
    `images` JSON NOT NULL,
    `registeredBy` CHAR(36) NOT NULL,
    `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_deliveryNoteId_fkey` FOREIGN KEY (`deliveryNoteId`) REFERENCES `DeliveryNote`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryNote` ADD CONSTRAINT `DeliveryNote_registeredBy_fkey` FOREIGN KEY (`registeredBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
