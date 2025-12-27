/*
  Warnings:

  - Made the column `transferStatus` on table `inventory_records` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `inventory_records` MODIFY `transferStatus` ENUM('CONFIRMED', 'PENDING', 'REJECTED') NOT NULL DEFAULT 'CONFIRMED';
