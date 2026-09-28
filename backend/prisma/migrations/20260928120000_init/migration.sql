-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'NETBANKING', 'CASH', 'WALLET');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('COMPLETED', 'PENDING', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('APPOINTMENT', 'TEST', 'MEDICINE');

-- CreateEnum
CREATE TYPE "BillingSource" AS ENUM ('MANUAL', 'APPOINTMENT', 'LAB', 'PHARMACY', 'IPD', 'OT', 'RADIOLOGY', 'PHYSIO', 'DIET');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE', 'PARTIAL', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InsuranceLinkStatus" AS ENUM ('NOT_SUBMITTED', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "CoverageType" AS ENUM ('CASHLESS', 'REIMBURSEMENT');

-- CreateEnum
CREATE TYPE "PreAuthStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('NOT_FILED', 'FILED', 'PROCESSING', 'SETTLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CLINIC', 'LAB', 'PHARMACY');

-- CreateEnum
CREATE TYPE "PayoutSchedule" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ConfigStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "LedgerSource" AS ENUM ('RIDE', 'LAWYER', 'ASSISTANT', 'EMERGENCY_DOCTOR', 'AMBULANCE', 'APPOINTMENT', 'LAB', 'PHARMACY', 'IPD', 'RADIOLOGY', 'OT', 'PHYSIO', 'OTHER');

-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "LedgerStatus" AS ENUM ('COMPLETED', 'HELD_IN_ESCROW', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CARD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
    "invoiceId" TEXT,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'APPOINTMENT',
    "referenceId" TEXT,
    "description" TEXT,
    "provider" TEXT,
    "refundAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "hospitalId" TEXT,
    "lineItems" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "appointmentId" TEXT,
    "admissionId" TEXT,
    "services" JSONB NOT NULL,
    "source" "BillingSource" NOT NULL DEFAULT 'MANUAL',
    "amount" DECIMAL(12,2) NOT NULL,
    "subTotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "paymentMethod" TEXT,
    "paymentId" TEXT,
    "insuranceClaimId" TEXT,
    "insuranceApprovedAmt" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insuranceStatus" "InsuranceLinkStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "hospitalId" TEXT,
    "facilityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insurance" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "patientName" TEXT NOT NULL,
    "admissionId" TEXT,
    "insuranceProvider" TEXT NOT NULL,
    "policyNumber" TEXT NOT NULL,
    "tpaName" TEXT,
    "tpaContact" TEXT,
    "coverageType" "CoverageType" NOT NULL DEFAULT 'CASHLESS',
    "preAuthAmount" DECIMAL(12,2),
    "preAuthStatus" "PreAuthStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "preAuthDate" TIMESTAMP(3),
    "preAuthExpiry" TIMESTAMP(3),
    "claimAmount" DECIMAL(12,2),
    "approvedAmount" DECIMAL(12,2),
    "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'NOT_FILED',
    "claimDate" TIMESTAMP(3),
    "settlementDate" TIMESTAMP(3),
    "documents" JSONB,
    "diagnosis" TEXT,
    "treatmentPlan" TEXT,
    "estimatedCost" DECIMAL(12,2),
    "remarks" TEXT,
    "hospitalId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insurance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionConfig" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "facilityName" TEXT,
    "facilityType" "FacilityType" NOT NULL DEFAULT 'HOSPITAL',
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "commissionCap" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payoutSchedule" "PayoutSchedule" NOT NULL DEFAULT 'MONTHLY',
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lastPayoutDate" TIMESTAMP(3),
    "status" "ConfigStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionLedger" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "facilityId" TEXT,
    "facilityName" TEXT,
    "facilityType" TEXT NOT NULL DEFAULT 'hospital',
    "providerId" TEXT,
    "userId" TEXT,
    "source" "LedgerSource" NOT NULL DEFAULT 'RIDE',
    "sourceId" TEXT,
    "bookingNumber" TEXT,
    "patientName" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "entryType" "EntryType" NOT NULL DEFAULT 'CREDIT',
    "status" "LedgerStatus" NOT NULL DEFAULT 'COMPLETED',
    "paymentId" TEXT,
    "payoutId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "mongoId" TEXT,
    "facilityId" TEXT NOT NULL,
    "facilityName" TEXT,
    "facilityType" TEXT NOT NULL DEFAULT 'hospital',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netPayout" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "transactionCount" INTEGER NOT NULL DEFAULT 0,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "transactionRef" TEXT,
    "notes" TEXT,
    "approvals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_hospitalId_idx" ON "Payment"("hospitalId");

-- CreateIndex
CREATE INDEX "Payment_referenceId_status_idx" ON "Payment"("referenceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_invoiceId_key" ON "Billing"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "Billing_paymentId_key" ON "Billing"("paymentId");

-- CreateIndex
CREATE INDEX "Billing_hospitalId_idx" ON "Billing"("hospitalId");

-- CreateIndex
CREATE INDEX "Billing_facilityId_idx" ON "Billing"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "Insurance_claimId_key" ON "Insurance"("claimId");

-- CreateIndex
CREATE INDEX "Insurance_hospitalId_idx" ON "Insurance"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionConfig_facilityId_key" ON "CommissionConfig"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionLedger_mongoId_key" ON "TransactionLedger"("mongoId");

-- CreateIndex
CREATE INDEX "TransactionLedger_createdAt_idx" ON "TransactionLedger"("createdAt");

-- CreateIndex
CREATE INDEX "TransactionLedger_providerId_createdAt_idx" ON "TransactionLedger"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "TransactionLedger_facilityId_createdAt_idx" ON "TransactionLedger"("facilityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payout_mongoId_key" ON "Payout"("mongoId");

-- CreateIndex
CREATE INDEX "Payout_facilityId_idx" ON "Payout"("facilityId");

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_insuranceClaimId_fkey" FOREIGN KEY ("insuranceClaimId") REFERENCES "Insurance"("claimId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionLedger" ADD CONSTRAINT "TransactionLedger_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "Payout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

