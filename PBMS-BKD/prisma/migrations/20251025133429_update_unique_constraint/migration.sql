/*
  Warnings:

  - A unique constraint covering the columns `[itemId,storeId,unitId]` on the table `product_inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `product_inventory` DROP FOREIGN KEY `product_inventory_itemId_fkey`;

-- DropIndex
DROP INDEX `product_inventory_itemId_storeId_key` ON `product_inventory`;

-- CreateIndex
CREATE UNIQUE INDEX `product_inventory_itemId_storeId_unitId_key` ON `product_inventory`(`itemId`, `storeId`, `unitId`);

-- AddForeignKey
ALTER TABLE `project_payments` ADD CONSTRAINT `project_payments_cashierId_fkey_new` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
