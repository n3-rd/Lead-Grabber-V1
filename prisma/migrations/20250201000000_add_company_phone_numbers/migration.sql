-- CreateTable
CREATE TABLE "company_phone_numbers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "telnyxPhoneNumberId" TEXT,
    "created" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_phone_numbers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_phone_numbers_phoneNumber_key" ON "company_phone_numbers"("phoneNumber");

-- CreateIndex
CREATE INDEX "company_phone_numbers_companyId_idx" ON "company_phone_numbers"("companyId");

-- AddForeignKey
ALTER TABLE "company_phone_numbers" ADD CONSTRAINT "company_phone_numbers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
