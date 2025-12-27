/*
  Warnings:

  - A unique constraint covering the columns `[storeId,itemId,unitId]` on the table `exhibition_inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `exhibition_inventory` DROP FOREIGN KEY `exhibition_inventory_storeId_fkey`;

-- DropIndex
DROP INDEX `exhibition_inventory_storeId_itemId_key` ON `exhibition_inventory`;

-- CreateIndex
CREATE UNIQUE INDEX `exhibition_inventory_storeId_itemId_unitId_key` ON `exhibition_inventory`(`storeId`, `itemId`, `unitId`);

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_itemId_fnew` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
