/*
  Warnings:

  - Added the required column `payDate` to the `PayrollPeriods` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `PayrollPeriods` ADD COLUMN `payDate` DATETIME(3) NOT NULL;
