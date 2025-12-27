/*
  Warnings:

  - You are about to drop the column `employeeId` on the `exhibition_inventory_records` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `exhibition_inventory_records` table. All the data in the column will be lost.
  - You are about to drop the column `reason` on the `exhibition_inventory_records` table. All the data in the column will be lost.
  - Added the required column `qty` to the `exhibition_inventory_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `recordedBy` to the `exhibition_inventory_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `exhibition_inventory_records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitId` to the `exhibition_inventory_records` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `exhibition_inventory_records` DROP FOREIGN KEY `exhibition_inventory_records_employeeId_fkey`;

-- DropIndex
DROP INDEX `exhibition_inventory_records_employeeId_createdAt_idx` ON `exhibition_inventory_records`;

-- AlterTable
ALTER TABLE `exhibition_inventory_records` DROP COLUMN `employeeId`,
    DROP COLUMN `quantity`,
    DROP COLUMN `reason`,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `qty` DOUBLE NOT NULL,
    ADD COLUMN `recordedBy` CHAR(36) NOT NULL,
    ADD COLUMN `source` VARCHAR(191) NOT NULL,
    ADD COLUMN `unitId` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `exhibition_inventory_records_recordedBy_createdAt_idx` ON `exhibition_inventory_records`(`recordedBy`, `createdAt`);

-- AddForeignKey
ALTER TABLE `exhibition_inventory_records` ADD CONSTRAINT `exhibition_inventory_records_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory_records` ADD CONSTRAINT `exhibition_inventory_records_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
