/*
  Warnings:

  - Added the required column `balance` to the `EventParticipant` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `EventParticipant` ADD COLUMN `balance` DECIMAL(65, 30) NOT NULL;
