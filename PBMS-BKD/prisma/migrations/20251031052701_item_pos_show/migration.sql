-- AlterTable
ALTER TABLE `Supply` ADD COLUMN `proofImage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `SupplyPayments` ADD COLUMN `chequeBankingDate` DATETIME(3) NULL,
    ADD COLUMN `chequeNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `items` ADD COLUMN `showInPos` BOOLEAN NOT NULL DEFAULT false;
