/*
  Warnings:

  - You are about to drop the column `roleGroup` on the `roles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `roles_roleGroup_idx` ON `roles`;

-- AlterTable
ALTER TABLE `roles` DROP COLUMN `roleGroup`,
    ADD COLUMN `description` VARCHAR(191) NULL;
