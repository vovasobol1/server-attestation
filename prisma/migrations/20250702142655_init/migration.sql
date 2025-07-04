-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "passport" TEXT NOT NULL,
    "passportCountry" TEXT NOT NULL,
    "profession" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "conviction" TEXT NOT NULL,
    "rfBan" TEXT NOT NULL,
    "attestationType" TEXT NOT NULL,
    "theory" TEXT,
    "practice" TEXT,
    "photoUrls" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_passport_key" ON "Attestation"("passport");
