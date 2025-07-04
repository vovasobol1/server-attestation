/*
  Warnings:

  - The `photoUrls` column on the `Attestation` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Attestation" DROP COLUMN "photoUrls",
ADD COLUMN     "photoUrls" TEXT[];
