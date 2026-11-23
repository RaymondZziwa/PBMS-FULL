-- Amatugunda Monk Club marketplace. Only adds tables and one column; existing data is untouched.

ALTER TABLE `club_payments` ADD COLUMN `orderId` INTEGER NULL;
CREATE INDEX `club_payments_orderId_idx` ON `club_payments`(`orderId`);

CREATE TABLE `club_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `storeId` INTEGER NULL,
    `updatedById` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderNumber` VARCHAR(24) NOT NULL,
    `memberId` INTEGER NULL,
    `memberName` VARCHAR(200) NOT NULL,
    `cardNumber` VARCHAR(20) NULL,
    `recipientName` VARCHAR(160) NOT NULL,
    `deliveryPhone` VARCHAR(20) NOT NULL,
    `deliveryAddress` VARCHAR(500) NOT NULL,
    `usedDefaultAddress` BOOLEAN NOT NULL DEFAULT true,
    `paymentMethod` ENUM('CASH', 'ON_DELIVERY', 'MOBILE_MONEY') NOT NULL,
    `status` ENUM('AWAITING_PAYMENT', 'PLACED', 'PROCESSING', 'DISPATCHED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PLACED',
    `paid` BOOLEAN NOT NULL DEFAULT false,
    `subtotal` DECIMAL(12, 2) NOT NULL,
    `discountPercent` INTEGER NOT NULL DEFAULT 0,
    `discountAmount` DECIMAL(12, 2) NOT NULL,
    `total` DECIMAL(12, 2) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `statusNote` VARCHAR(500) NULL,
    `updatedById` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `club_orders_orderNumber_key`(`orderNumber`),
    INDEX `club_orders_memberId_createdAt_idx`(`memberId`, `createdAt`),
    INDEX `club_orders_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `club_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `orderId` INTEGER NOT NULL,
    `itemId` INTEGER NULL,
    `name` VARCHAR(191) NOT NULL,
    `unitPrice` DECIMAL(12, 2) NOT NULL,
    `qty` INTEGER NOT NULL,
    `lineTotal` DECIMAL(12, 2) NOT NULL,

    INDEX `club_order_items_orderId_idx`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `club_orders` ADD CONSTRAINT `club_orders_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `club_members`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `club_order_items` ADD CONSTRAINT `club_order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `club_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
