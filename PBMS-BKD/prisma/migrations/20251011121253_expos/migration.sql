/*
  Warnings:

  - You are about to drop the column `cashierId` on the `exhibition_sales` table. All the data in the column will be lost.
  - Added the required column `balance` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paymentMethods` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `servedBy` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `exhibition_sales` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `exhibition_sales` DROP FOREIGN KEY `exhibition_sales_cashierId_fkey`;

-- DropIndex
DROP INDEX `exhibition_sales_cashierId_createdAt_idx` ON `exhibition_sales`;

-- AlterTable
ALTER TABLE `exhibition_sales` DROP COLUMN `cashierId`,
    ADD COLUMN `balance` DECIMAL(10, 2) NOT NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `paymentMethods` JSON NOT NULL,
    ADD COLUMN `servedBy` CHAR(36) NOT NULL,
    ADD COLUMN `status` ENUM('FULLY_PAID', 'UNPAID', 'PARTIALLY_PAID') NOT NULL;

-- CreateIndex
CREATE INDEX `exhibition_sales_servedBy_createdAt_idx` ON `exhibition_sales`(`servedBy`, `createdAt`);

-- AddForeignKey
ALTER TABLE `exhibition_sales` ADD CONSTRAINT `exhibition_sales_servedBy_fkey` FOREIGN KEY (`servedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
