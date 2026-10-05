/*
  Warnings:

  - Added the required column `price` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "jobs" ADD COLUMN     "price" INTEGER NOT NULL;
