/*
  Warnings:

  - You are about to drop the column `serviceId` on the `massage_sales` table. All the data in the column will be lost.
  - Added the required column `items` to the `massage_sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `massage_sales` DROP FOREIGN KEY `massage_sales_serviceId_fkey`;

-- DropIndex
DROP INDEX `massage_sales_serviceId_fkey` ON `massage_sales`;

-- AlterTable
ALTER TABLE `massage_sales` DROP COLUMN `serviceId`,
    ADD COLUMN `items` JSON NOT NULL;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` CHAR(36) NOT NULL,
    `date` VARCHAR(191) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `timeIn` DATETIME(3) NOT NULL,
    `timeOut` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payroll` (
    `id` CHAR(36) NOT NULL,
    `paymentStructure` JSON NOT NULL,
    `periodStart` DATETIME(3) NOT NULL,
    `periodEnd` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `salesPayments` ADD CONSTRAINT `salesPayments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `salesPayments` ADD CONSTRAINT `salesPayments_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
