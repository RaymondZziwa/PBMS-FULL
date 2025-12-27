/*
  Warnings:

  - A unique constraint covering the columns `[exhibitionId]` on the table `ExhibitionStore` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `ExhibitionStore_exhibitionId_key` ON `ExhibitionStore`(`exhibitionId`);
