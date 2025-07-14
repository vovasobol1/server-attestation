/*
  Warnings:

  - You are about to drop the column `status` on the `Attestation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attestation" DROP COLUMN "status",
ADD COLUMN     "rank" TEXT;
