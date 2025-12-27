/*
  Warnings:

  - Added the required column `prescribedBy` to the `ClientPrescription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ClientPrescription` ADD COLUMN `isReviewed` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `prescribedBy` CHAR(36) NOT NULL,
    ADD COLUMN `reviewNotes` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `ClientPrescription` ADD CONSTRAINT `ClientPrescription_prescribedBy_fkey` FOREIGN KEY (`prescribedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
