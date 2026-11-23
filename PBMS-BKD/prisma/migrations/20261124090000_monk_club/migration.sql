-- Monk Loyalty Club. Only adds tables and one column; existing data is untouched.

ALTER TABLE `Wallet` ADD COLUMN `isForClub` BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE `club_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(10) NOT NULL,
    `surname` VARCHAR(80) NOT NULL,
    `firstName` VARCHAR(80) NOT NULL,
    `otherName` VARCHAR(80) NULL,
    `idType` VARCHAR(20) NOT NULL,
    `idNumber` VARCHAR(40) NOT NULL,
    `country` VARCHAR(60) NOT NULL,
    `district` VARCHAR(80) NULL,
    `county` VARCHAR(120) NULL,
    `subCounty` VARCHAR(120) NULL,
    `address` VARCHAR(255) NULL,
    `phone1` VARCHAR(20) NOT NULL,
    `phone2` VARCHAR(20) NULL,
    `email` VARCHAR(191) NULL,
    `profession` VARCHAR(120) NULL,
    `photo` VARCHAR(255) NULL,
    `agreedAt` DATETIME(3) NOT NULL,
    `status` ENUM('PENDING', 'REJECTED', 'AWAITING_PAYMENT', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'PENDING',
    `statusNote` TEXT NULL,
    `cardNumber` VARCHAR(20) NULL,
    `password` VARCHAR(100) NULL,
    `mustChangePassword` BOOLEAN NOT NULL DEFAULT true,
    `tokenVersion` INTEGER NOT NULL DEFAULT 0,
    `approvedAt` DATETIME(3) NULL,
    `approvedById` INTEGER NULL,
    `activatedAt` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `club_members_idNumber_key`(`idNumber`),
    UNIQUE INDEX `club_members_phone1_key`(`phone1`),
    UNIQUE INDEX `club_members_email_key`(`email`),
    UNIQUE INDEX `club_members_cardNumber_key`(`cardNumber`),
    INDEX `club_members_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `club_members_surname_firstName_idx`(`surname`, `firstName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_next_of_kin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `fullName` VARCHAR(160) NOT NULL,
    `relationship` VARCHAR(60) NOT NULL,
    `address` VARCHAR(255) NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(191) NULL,
    `profession` VARCHAR(120) NULL,

    UNIQUE INDEX `club_next_of_kin_memberId_position_key`(`memberId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_attachments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NOT NULL,
    `label` VARCHAR(120) NOT NULL,
    `fileName` VARCHAR(255) NOT NULL,
    `mimeType` VARCHAR(100) NOT NULL,
    `size` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `club_attachments_memberId_idx`(`memberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NULL,
    `memberName` VARCHAR(200) NOT NULL,
    `purpose` VARCHAR(30) NOT NULL,
    `baseAmount` DECIMAL(12, 2) NOT NULL,
    `marzFee` DECIMAL(12, 2) NOT NULL,
    `serviceFee` DECIMAL(12, 2) NOT NULL,
    `totalCharged` DECIMAL(12, 2) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `reference` VARCHAR(64) NOT NULL,
    `providerRef` VARCHAR(120) NULL,
    `status` ENUM('PENDING', 'SUCCESSFUL', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `credited` BOOLEAN NOT NULL DEFAULT false,
    `failureNote` VARCHAR(255) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `club_payments_reference_key`(`reference`),
    INDEX `club_payments_memberId_createdAt_idx`(`memberId`, `createdAt`),
    INDEX `club_payments_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(12, 2) NOT NULL,
    `channelId` INTEGER NOT NULL,
    `description` VARCHAR(255) NULL,
    `reference` VARCHAR(120) NOT NULL,
    `status` ENUM('PENDING', 'SUCCESSFUL', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `requestedBy` INTEGER NOT NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `club_payouts_reference_key`(`reference`),
    INDEX `club_payouts_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_tracker_years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `lots` INTEGER NOT NULL DEFAULT 4,

    UNIQUE INDEX `club_tracker_years_memberId_year_key`(`memberId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_tracker_entries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `month` INTEGER NOT NULL,
    `lot` INTEGER NOT NULL,
    `quantity` DECIMAL(12, 2) NULL,
    `receiptNo` VARCHAR(60) NULL,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `club_tracker_entries_memberId_year_month_lot_key`(`memberId`, `year`, `month`, `lot`),
    INDEX `club_tracker_entries_memberId_year_idx`(`memberId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `club_next_of_kin` ADD CONSTRAINT `club_next_of_kin_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `club_attachments` ADD CONSTRAINT `club_attachments_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `club_payments` ADD CONSTRAINT `club_payments_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `club_tracker_years` ADD CONSTRAINT `club_tracker_years_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `club_tracker_entries` ADD CONSTRAINT `club_tracker_entries_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
