-- Signed membership-card QR codes: a version number to revoke old copies, and scan counts.
ALTER TABLE `club_members`
    ADD COLUMN `cardVersion` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `cardCheckedAt` DATETIME(3) NULL,
    ADD COLUMN `cardChecks` INTEGER NOT NULL DEFAULT 0;
