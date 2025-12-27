/*
  Warnings:

  - You are about to drop the column `exhibitionId` on the `ProjectSales` table. All the data in the column will be lost.
  - Added the required column `downPayment` to the `ProjectSales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProjectSales` DROP COLUMN `exhibitionId`,
    ADD COLUMN `downPayment` DECIMAL(65, 30) NOT NULL;

-- CreateTable
CREATE TABLE `ProjectPayments` (
    `id` CHAR(36) NOT NULL,
    `saleId` CHAR(36) NOT NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `exhibitionId` CHAR(36) NOT NULL,
    `cashierId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bank` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NULL,
    `balance` DECIMAL(65, 30) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Cheque` (
    `id` CHAR(36) NOT NULL,
    `chequeNumber` VARCHAR(191) NOT NULL,
    `bankId` CHAR(36) NOT NULL,
    `DraweeFirstName` VARCHAR(191) NOT NULL,
    `DraweeLastName` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `Address` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `amount` DECIMAL(65, 30) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'BOUNCED') NOT NULL DEFAULT 'PENDING',
    `bankingDate` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ProjectPayments` ADD CONSTRAINT `ProjectPayments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `ProjectSales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProjectPayments` ADD CONSTRAINT `ProjectPayments_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `Employee`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Cheque` ADD CONSTRAINT `Cheque_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `Bank`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
