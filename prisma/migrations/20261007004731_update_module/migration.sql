/*
  Warnings:

  - You are about to drop the `ModuleRol` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `ModuleRol` DROP FOREIGN KEY `ModuleRol_moduleId_fkey`;

-- DropForeignKey
ALTER TABLE `ModuleRol` DROP FOREIGN KEY `ModuleRol_rolId_fkey`;

-- AlterTable
ALTER TABLE `user_roles` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE `ModuleRol`;

-- CreateTable
CREATE TABLE `module_rol` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `moduleId` INTEGER NOT NULL,
    `rolId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `module_rol` ADD CONSTRAINT `module_rol_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `module`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `module_rol` ADD CONSTRAINT `module_rol_rolId_fkey` FOREIGN KEY (`rolId`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
