-- AddForeignKey
ALTER TABLE `product_inventory` ADD CONSTRAINT `product_inventory_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
