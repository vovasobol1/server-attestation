/*
  Warnings:

  - You are about to drop the column `attestationType` on the `Attestation` table. All the data in the column will be lost.
  - You are about to drop the column `practice` on the `Attestation` table. All the data in the column will be lost.
  - You are about to drop the column `theory` on the `Attestation` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Attestation" DROP COLUMN "attestationType",
DROP COLUMN "practice",
DROP COLUMN "theory",
ADD COLUMN     "attestations" JSONB;
