-- DropIndex
DROP INDEX `Employee_email_key` ON `Employee`;

-- AlterTable
ALTER TABLE `Employee` MODIFY `email` VARCHAR(191) NULL;
