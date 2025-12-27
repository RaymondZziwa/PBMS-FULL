-- AlterTable
ALTER TABLE `project_payments` ADD COLUMN `paymentMethod` ENUM('CASH', 'MTN_MOMO', 'AIRTEL_MOMO', 'CARD', 'PROF_MOMO') NOT NULL DEFAULT 'CASH';
