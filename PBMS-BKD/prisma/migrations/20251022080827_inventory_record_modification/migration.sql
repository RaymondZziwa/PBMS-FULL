-- AlterTable
ALTER TABLE `ClientPrescription` ADD COLUMN `notes` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventory_records` ADD COLUMN `remainingQuantity` DOUBLE NULL;
