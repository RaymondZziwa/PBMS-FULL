/*
  Warnings:

  - You are about to drop the column `payrollId` on the `Payroll` table. All the data in the column will be lost.
  - Added the required column `payrollPeriodId` to the `Payroll` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Payroll` DROP FOREIGN KEY `Payroll_payrollId_fkey`;

-- DropIndex
DROP INDEX `Payroll_payrollId_fkey` ON `Payroll`;

-- AlterTable
ALTER TABLE `Company` MODIFY `workHours` DOUBLE NULL DEFAULT 8.0;

-- AlterTable
ALTER TABLE `Payroll` DROP COLUMN `payrollId`,
    ADD COLUMN `payrollPeriodId` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_payrollPeriodId_fkey` FOREIGN KEY (`payrollPeriodId`) REFERENCES `PayrollPeriods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
