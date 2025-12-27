-- DropForeignKey
ALTER TABLE `salesPayments` DROP FOREIGN KEY `salesPayments_cashierId_fkey`;

-- DropForeignKey
ALTER TABLE `salesPayments` DROP FOREIGN KEY `salesPayments_saleId_fkey`;

-- DropIndex
DROP INDEX `salesPayments_cashierId_createdAt_idx` ON `salesPayments`;

-- DropIndex
DROP INDEX `salesPayments_saleId_createdAt_idx` ON `salesPayments`;

-- CreateTable
CREATE TABLE `massage_sales` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `serviceId` CHAR(36) NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('FULLY_PAID', 'UNPAID', 'PARTIALLY_PAID') NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL,
    `paymentMethods` JSON NOT NULL,
    `notes` VARCHAR(191) NULL,
    `servedBy` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `massage_sales_servedBy_createdAt_idx`(`servedBy`, `createdAt`),
    INDEX `massage_sales_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `massageServicePayments` (
    `id` CHAR(36) NOT NULL,
    `saleId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paymentMethod` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO') NOT NULL,
    `referenceId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `cashierId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `massageServicePayments_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `salesPayments_createdAt_idx` ON `salesPayments`(`createdAt`);

-- AddForeignKey
ALTER TABLE `massage_sales` ADD CONSTRAINT `massage_sales_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `massage_sales` ADD CONSTRAINT `massage_sales_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `massage_sales` ADD CONSTRAINT `massage_sales_servedBy_fkey` FOREIGN KEY (`servedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `massageServicePayments` ADD CONSTRAINT `massageServicePayments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `massage_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `massageServicePayments` ADD CONSTRAINT `massageServicePayments_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
