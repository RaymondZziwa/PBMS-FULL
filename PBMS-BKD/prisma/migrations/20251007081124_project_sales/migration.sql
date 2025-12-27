/*
  Warnings:

  - You are about to drop the `Bank` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cheque` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Client` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailVerification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmployeeLoginLogs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Event` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventParticipant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Exhibition` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExhibitionInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExhibitionInventoryRecords` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExhibitionSales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ExhibitionStore` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InventoryRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Item` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ItemCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductInventory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectPayments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProjectSales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Sales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Service` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Store` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Unit` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name]` on the table `PaymentMethod` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `Cheque` DROP FOREIGN KEY `Cheque_bankId_fkey`;

-- DropForeignKey
ALTER TABLE `Department` DROP FOREIGN KEY `Department_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `EmailVerification` DROP FOREIGN KEY `EmailVerification_userId_fkey`;

-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_deptId_fkey`;

-- DropForeignKey
ALTER TABLE `Employee` DROP FOREIGN KEY `Employee_roleId_fkey`;

-- DropForeignKey
ALTER TABLE `EmployeeLoginLogs` DROP FOREIGN KEY `EmployeeLoginLogs_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `EventParticipant` DROP FOREIGN KEY `EventParticipant_eventId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionInventory` DROP FOREIGN KEY `ExhibitionInventory_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionInventory` DROP FOREIGN KEY `ExhibitionInventory_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionInventoryRecords` DROP FOREIGN KEY `ExhibitionInventoryRecords_employeeId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionInventoryRecords` DROP FOREIGN KEY `ExhibitionInventoryRecords_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionInventoryRecords` DROP FOREIGN KEY `ExhibitionInventoryRecords_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionSales` DROP FOREIGN KEY `ExhibitionSales_cashierId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionSales` DROP FOREIGN KEY `ExhibitionSales_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionSales` DROP FOREIGN KEY `ExhibitionSales_exhibitionId_fkey`;

-- DropForeignKey
ALTER TABLE `ExhibitionStore` DROP FOREIGN KEY `ExhibitionStore_exhibitionId_fkey`;

-- DropForeignKey
ALTER TABLE `InventoryRecord` DROP FOREIGN KEY `InventoryRecord_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `InventoryRecord` DROP FOREIGN KEY `InventoryRecord_recordedBy_fkey`;

-- DropForeignKey
ALTER TABLE `InventoryRecord` DROP FOREIGN KEY `InventoryRecord_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `InventoryRecord` DROP FOREIGN KEY `InventoryRecord_unitId_fkey`;

-- DropForeignKey
ALTER TABLE `Item` DROP FOREIGN KEY `Item_categoryId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductInventory` DROP FOREIGN KEY `ProductInventory_itemId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductInventory` DROP FOREIGN KEY `ProductInventory_storeId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductInventory` DROP FOREIGN KEY `ProductInventory_unitId_fkey`;

-- DropForeignKey
ALTER TABLE `ProjectPayments` DROP FOREIGN KEY `ProjectPayments_cashierId_fkey`;

-- DropForeignKey
ALTER TABLE `ProjectPayments` DROP FOREIGN KEY `ProjectPayments_saleId_fkey`;

-- DropForeignKey
ALTER TABLE `ProjectSales` DROP FOREIGN KEY `ProjectSales_cashierId_fkey`;

-- DropForeignKey
ALTER TABLE `ProjectSales` DROP FOREIGN KEY `ProjectSales_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `Sales` DROP FOREIGN KEY `Sales_clientId_fkey`;

-- DropForeignKey
ALTER TABLE `Sales` DROP FOREIGN KEY `Sales_servedBy_fkey`;

-- DropForeignKey
ALTER TABLE `Store` DROP FOREIGN KEY `Store_branchId_fkey`;

-- DropForeignKey
ALTER TABLE `Store` DROP FOREIGN KEY `Store_deptId_fkey`;

-- DropForeignKey
ALTER TABLE `_PermissionToRole` DROP FOREIGN KEY `_PermissionToRole_A_fkey`;

-- DropForeignKey
ALTER TABLE `_PermissionToRole` DROP FOREIGN KEY `_PermissionToRole_B_fkey`;

-- DropTable
DROP TABLE `Bank`;

-- DropTable
DROP TABLE `Branch`;

-- DropTable
DROP TABLE `Cheque`;

-- DropTable
DROP TABLE `Client`;

-- DropTable
DROP TABLE `Department`;

-- DropTable
DROP TABLE `EmailVerification`;

-- DropTable
DROP TABLE `Employee`;

-- DropTable
DROP TABLE `EmployeeLoginLogs`;

-- DropTable
DROP TABLE `Event`;

-- DropTable
DROP TABLE `EventParticipant`;

-- DropTable
DROP TABLE `Exhibition`;

-- DropTable
DROP TABLE `ExhibitionInventory`;

-- DropTable
DROP TABLE `ExhibitionInventoryRecords`;

-- DropTable
DROP TABLE `ExhibitionSales`;

-- DropTable
DROP TABLE `ExhibitionStore`;

-- DropTable
DROP TABLE `InventoryRecord`;

-- DropTable
DROP TABLE `Item`;

-- DropTable
DROP TABLE `ItemCategory`;

-- DropTable
DROP TABLE `Permission`;

-- DropTable
DROP TABLE `ProductInventory`;

-- DropTable
DROP TABLE `Project`;

-- DropTable
DROP TABLE `ProjectPayments`;

-- DropTable
DROP TABLE `ProjectSales`;

-- DropTable
DROP TABLE `Role`;

-- DropTable
DROP TABLE `Sales`;

-- DropTable
DROP TABLE `Service`;

-- DropTable
DROP TABLE `Store`;

-- DropTable
DROP TABLE `Unit`;

-- CreateTable
CREATE TABLE `stores` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `branchId` CHAR(36) NOT NULL,
    `deptId` CHAR(36) NOT NULL,
    `authorizedPersonnel` JSON NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `stores_branchId_deptId_idx`(`branchId`, `deptId`),
    INDEX `stores_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `units` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `abr` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `units_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `branches` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `branches_name_location_idx`(`name`, `location`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `departments` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `branchId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `departments_branchId_idx`(`branchId`),
    INDEX `departments_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` CHAR(36) NOT NULL,
    `module` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `permissions_value_key`(`value`),
    INDEX `permissions_module_name_idx`(`module`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` CHAR(36) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `tel` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `salary` DECIMAL(10, 2) NOT NULL,
    `hasAccess` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `profileImage` VARCHAR(191) NULL,
    `roleId` CHAR(36) NOT NULL,
    `branchId` CHAR(36) NULL,
    `deptId` CHAR(36) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `employees_email_key`(`email`),
    UNIQUE INDEX `employees_tel_key`(`tel`),
    INDEX `employees_email_isActive_idx`(`email`, `isActive`),
    INDEX `employees_roleId_idx`(`roleId`),
    INDEX `employees_branchId_deptId_idx`(`branchId`, `deptId`),
    INDEX `employees_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_login_logs` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_login_logs_employeeId_createdAt_idx`(`employeeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_verifications` (
    `id` CHAR(36) NOT NULL,
    `userId` CHAR(36) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `email_verifications_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `email_verifications_userId_code_key`(`userId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_categories` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `item_categories_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` CHAR(36) NOT NULL,
    `categoryId` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `items_categoryId_idx`(`categoryId`),
    INDEX `items_name_idx`(`name`),
    INDEX `items_barcode_idx`(`barcode`),
    INDEX `items_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `services_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_inventory` (
    `id` CHAR(36) NOT NULL,
    `itemId` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `unitId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_inventory_storeId_itemId_idx`(`storeId`, `itemId`),
    INDEX `product_inventory_qty_idx`(`qty`),
    UNIQUE INDEX `product_inventory_itemId_storeId_key`(`itemId`, `storeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_records` (
    `id` CHAR(36) NOT NULL,
    `category` ENUM('RESTOCK', 'DEPLETION', 'ADJUSTMENT') NOT NULL,
    `itemId` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `qty` DOUBLE NOT NULL,
    `unitId` CHAR(36) NOT NULL,
    `source` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `recordedBy` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_records_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `inventory_records_itemId_createdAt_idx`(`itemId`, `createdAt`),
    INDEX `inventory_records_category_createdAt_idx`(`category`, `createdAt`),
    INDEX `inventory_records_recordedBy_createdAt_idx`(`recordedBy`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NULL,
    `items` JSON NOT NULL,
    `servedBy` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `status` ENUM('FULLY_PAID', 'UNPAID', 'PARTIALLY_PAID') NOT NULL,
    `total` DECIMAL(10, 2) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL,
    `paymentMethods` JSON NOT NULL,
    `notes` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sales_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `sales_servedBy_createdAt_idx`(`servedBy`, `createdAt`),
    INDEX `sales_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `sales_clientId_createdAt_idx`(`clientId`, `createdAt`),
    INDEX `sales_createdAt_idx`(`createdAt`),
    INDEX `sales_total_idx`(`total`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` CHAR(36) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `contact` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `clients_contact_key`(`contact`),
    INDEX `clients_firstName_lastName_idx`(`firstName`, `lastName`),
    INDEX `clients_contact_idx`(`contact`),
    INDEX `clients_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `events` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `ticketPrice` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `location` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `events_startDate_endDate_idx`(`startDate`, `endDate`),
    INDEX `events_status_idx`(`status`),
    INDEX `events_title_idx`(`title`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `event_participants` (
    `id` CHAR(36) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `tel` VARCHAR(191) NOT NULL,
    `tel2` VARCHAR(191) NOT NULL,
    `amountPaid` DECIMAL(10, 2) NOT NULL,
    `balance` DECIMAL(10, 2) NOT NULL,
    `paymentStatus` ENUM('PAID', 'PARTIALLY_PAID', 'UNPAID') NOT NULL DEFAULT 'UNPAID',
    `eventId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `event_participants_eventId_paymentStatus_idx`(`eventId`, `paymentStatus`),
    INDEX `event_participants_tel_idx`(`tel`),
    INDEX `event_participants_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exhibitions` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exhibitions_startDate_endDate_idx`(`startDate`, `endDate`),
    INDEX `exhibitions_name_idx`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exhibition_stores` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `exhibitionId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exhibition_stores_exhibitionId_idx`(`exhibitionId`),
    UNIQUE INDEX `exhibition_stores_exhibitionId_name_key`(`exhibitionId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exhibition_inventory` (
    `id` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `itemId` CHAR(36) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exhibition_inventory_storeId_idx`(`storeId`),
    UNIQUE INDEX `exhibition_inventory_storeId_itemId_key`(`storeId`, `itemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exhibition_inventory_records` (
    `id` CHAR(36) NOT NULL,
    `storeId` CHAR(36) NOT NULL,
    `category` ENUM('RESTOCK', 'DEPLETION', 'ADJUSTMENT') NOT NULL,
    `itemId` CHAR(36) NOT NULL,
    `quantity` DECIMAL(10, 2) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `employeeId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exhibition_inventory_records_storeId_createdAt_idx`(`storeId`, `createdAt`),
    INDEX `exhibition_inventory_records_employeeId_createdAt_idx`(`employeeId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exhibition_sales` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `items` JSON NOT NULL,
    `saleTotal` DECIMAL(10, 2) NOT NULL,
    `exhibitionId` CHAR(36) NOT NULL,
    `cashierId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `exhibition_sales_exhibitionId_createdAt_idx`(`exhibitionId`, `createdAt`),
    INDEX `exhibition_sales_cashierId_createdAt_idx`(`cashierId`, `createdAt`),
    INDEX `exhibition_sales_clientId_idx`(`clientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `barcode` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `projects_name_idx`(`name`),
    INDEX `projects_barcode_idx`(`barcode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_sales` (
    `id` CHAR(36) NOT NULL,
    `clientId` CHAR(36) NOT NULL,
    `projectId` CHAR(36) NOT NULL,
    `status` ENUM('FULLY_PAID', 'UNPAID', 'PARTIALLY_PAID') NOT NULL,
    `saleTotal` DECIMAL(10, 2) NOT NULL,
    `downPayment` DECIMAL(10, 2) NOT NULL,
    `numberOfInstallments` INTEGER NOT NULL,
    `installmentAmount` DECIMAL(10, 2) NOT NULL,
    `cashierId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_sales_clientId_idx`(`clientId`),
    INDEX `project_sales_cashierId_createdAt_idx`(`cashierId`, `createdAt`),
    INDEX `project_sales_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_payments` (
    `id` CHAR(36) NOT NULL,
    `saleId` CHAR(36) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `exhibitionId` CHAR(36) NOT NULL,
    `cashierId` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_payments_saleId_createdAt_idx`(`saleId`, `createdAt`),
    INDEX `project_payments_cashierId_createdAt_idx`(`cashierId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banks` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `accountNumber` VARCHAR(191) NULL,
    `balance` DECIMAL(10, 2) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `banks_accountNumber_idx`(`accountNumber`),
    UNIQUE INDEX `banks_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cheques` (
    `id` CHAR(36) NOT NULL,
    `chequeNumber` VARCHAR(191) NOT NULL,
    `bankId` CHAR(36) NOT NULL,
    `DraweeFirstName` VARCHAR(191) NOT NULL,
    `DraweeLastName` VARCHAR(191) NULL,
    `contact` VARCHAR(191) NULL,
    `Address` VARCHAR(191) NULL,
    `reason` VARCHAR(191) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'PAID', 'BOUNCED') NOT NULL DEFAULT 'PENDING',
    `bankingDate` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cheques_bankId_status_idx`(`bankId`, `status`),
    INDEX `cheques_chequeNumber_idx`(`chequeNumber`),
    INDEX `cheques_bankingDate_idx`(`bankingDate`),
    INDEX `cheques_status_createdAt_idx`(`status`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Company_email_idx` ON `Company`(`email`);

-- CreateIndex
CREATE INDEX `Company_name_idx` ON `Company`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `PaymentMethod_name_key` ON `PaymentMethod`(`name`);

-- AddForeignKey
ALTER TABLE `stores` ADD CONSTRAINT `stores_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stores` ADD CONSTRAINT `stores_deptId_fkey` FOREIGN KEY (`deptId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `departments` ADD CONSTRAINT `departments_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_branchId_fkey` FOREIGN KEY (`branchId`) REFERENCES `branches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_deptId_fkey` FOREIGN KEY (`deptId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_login_logs` ADD CONSTRAINT `employee_login_logs_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `email_verifications` ADD CONSTRAINT `email_verifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `item_categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_inventory` ADD CONSTRAINT `product_inventory_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_inventory` ADD CONSTRAINT `product_inventory_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_inventory` ADD CONSTRAINT `product_inventory_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_unitId_fkey` FOREIGN KEY (`unitId`) REFERENCES `units`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_records` ADD CONSTRAINT `inventory_records_recordedBy_fkey` FOREIGN KEY (`recordedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_servedBy_fkey` FOREIGN KEY (`servedBy`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_participants` ADD CONSTRAINT `event_participants_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_stores` ADD CONSTRAINT `exhibition_stores_exhibitionId_fkey` FOREIGN KEY (`exhibitionId`) REFERENCES `exhibitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory` ADD CONSTRAINT `exhibition_inventory_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `exhibition_stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory` ADD CONSTRAINT `exhibition_inventory_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory_records` ADD CONSTRAINT `exhibition_inventory_records_storeId_fkey` FOREIGN KEY (`storeId`) REFERENCES `exhibition_stores`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory_records` ADD CONSTRAINT `exhibition_inventory_records_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_inventory_records` ADD CONSTRAINT `exhibition_inventory_records_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_sales` ADD CONSTRAINT `exhibition_sales_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_sales` ADD CONSTRAINT `exhibition_sales_exhibitionId_fkey` FOREIGN KEY (`exhibitionId`) REFERENCES `exhibitions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `exhibition_sales` ADD CONSTRAINT `exhibition_sales_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_sales` ADD CONSTRAINT `project_sales_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_sales` ADD CONSTRAINT `project_sales_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_sales` ADD CONSTRAINT `project_sales_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_payments` ADD CONSTRAINT `project_payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `project_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_payments` ADD CONSTRAINT `project_payments_cashierId_fkey` FOREIGN KEY (`cashierId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cheques` ADD CONSTRAINT `cheques_bankId_fkey` FOREIGN KEY (`bankId`) REFERENCES `banks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_A_fkey` FOREIGN KEY (`A`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PermissionToRole` ADD CONSTRAINT `_PermissionToRole_B_fkey` FOREIGN KEY (`B`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
