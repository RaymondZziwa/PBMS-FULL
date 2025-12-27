/*
  Warnings:

  - Added the required column `totalSpent` to the `PayrollPeriods` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PayrollPeriods` ADD COLUMN `totalSpent` DECIMAL(65, 30) NOT NULL;

-- AlterTable
ALTER TABLE `branch_expenses` ADD COLUMN `receiptImage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `exhibition_inventory` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT') NOT NULL;

-- AlterTable
ALTER TABLE `exhibition_inventory_records` MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT') NOT NULL;

-- AlterTable
ALTER TABLE `inventory_records` ADD COLUMN `initiatedQty` DOUBLE NULL,
    ADD COLUMN `toStoreId` CHAR(36) NULL,
    ADD COLUMN `transferId` VARCHAR(191) NULL,
    ADD COLUMN `transferStatus` ENUM('CONFIRMED', 'PENDING', 'REJECTED') NULL,
    MODIFY `category` ENUM('RESTOCK', 'DEPLETION', 'TRANSFER', 'ADJUSTMENT') NOT NULL;

-- AlterTable
ALTER TABLE `project_payments` ADD COLUMN `bankDepositSlipImage` VARCHAR(191) NULL,
    ADD COLUMN `receiptImage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `project_sales` ADD COLUMN `deliveryNote` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_toStoreId_fkey` FOREIGN KEY (`toStoreId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
