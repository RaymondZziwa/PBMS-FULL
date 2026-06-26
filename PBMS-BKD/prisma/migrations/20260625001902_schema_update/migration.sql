/*
  Warnings:

  - You are about to drop the `PatientAccountTransaction` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `PatientAccountTransaction` DROP FOREIGN KEY `PatientAccountTransaction_accountId_fkey`;

-- DropForeignKey
ALTER TABLE `PatientAccountTransaction` DROP FOREIGN KEY `PatientAccountTransaction_saleId_fkey`;

-- DropTable
DROP TABLE `PatientAccountTransaction`;

-- CreateTable
CREATE TABLE `patient_account_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `saleId` INTEGER NOT NULL,
    `accountId` INTEGER NOT NULL,
    `type` ENUM('DEPOSIT', 'PURCHASE_PAYMENT') NOT NULL,
    `amount` DOUBLE NOT NULL DEFAULT 0.00,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `patient_account_transactions_saleId_key`(`saleId`),
    INDEX `patient_account_transactions_accountId_createdAt_idx`(`accountId`, `createdAt`),
    INDEX `patient_account_transactions_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `patient_account_transactions` ADD CONSTRAINT `patient_account_transactions_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `patient_account_transactions` ADD CONSTRAINT `patient_account_transactions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `PatientAccount`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
