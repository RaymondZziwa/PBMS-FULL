-- AddForeignKey
ALTER TABLE `massage_sales` ADD CONSTRAINT `massage_sales_servedBy_fkey` FOREIGN KEY (`servedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
