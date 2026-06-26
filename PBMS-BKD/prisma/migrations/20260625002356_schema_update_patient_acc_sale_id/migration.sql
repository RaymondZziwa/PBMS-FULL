-- DropForeignKey
ALTER TABLE `patient_account_transactions` DROP FOREIGN KEY `patient_account_transactions_saleId_fkey`;

-- AddForeignKey
ALTER TABLE `patient_account_transactions` ADD CONSTRAINT `patient_account_transactions_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
