-- DropForeignKey
ALTER TABLE `massage_sales` DROP FOREIGN KEY `massage_sales_servedBy_fkey`;

-- DropIndex
DROP INDEX `massage_sales_servedBy_createdAt_idx` ON `massage_sales`;

-- CreateIndex
CREATE INDEX `massage_sales_createdAt_idx` ON `massage_sales`(`createdAt`);
