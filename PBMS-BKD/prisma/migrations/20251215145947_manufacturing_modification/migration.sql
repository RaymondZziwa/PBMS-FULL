-- AlterTable
ALTER TABLE `manufacturing` ADD COLUMN `status` ENUM('PENDING', 'NORMAL', 'WASTAGE_DETECTED', 'GOOD_UTILIZATION') NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX `manufacturing_status_createdAt_idx` ON `manufacturing`(`status`, `createdAt`);
