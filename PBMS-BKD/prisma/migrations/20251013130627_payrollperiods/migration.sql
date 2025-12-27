/*
  Warnings:

  - You are about to drop the column `periodEnd` on the `Payroll` table. All the data in the column will be lost.
  - You are about to drop the column `periodStart` on the `Payroll` table. All the data in the column will be lost.
  - Added the required column `payrollId` to the `Payroll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Payroll` DROP COLUMN `periodEnd`,
    DROP COLUMN `periodStart`,
    ADD COLUMN `payrollId` CHAR(36) NOT NULL;

-- AddForeignKey
ALTER TABLE `Payroll` ADD CONSTRAINT `Payroll_payrollId_fkey` FOREIGN KEY (`payrollId`) REFERENCES `PayrollPeriods`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
