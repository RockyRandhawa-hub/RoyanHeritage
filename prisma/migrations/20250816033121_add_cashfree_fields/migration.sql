/*
  Warnings:

  - A unique constraint covering the columns `[cashfreeOrderId]` on the table `TempOrder` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `TempOrder` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "public"."TempOrder" ADD COLUMN     "cashfreeOrderId" TEXT,
ADD COLUMN     "cfPaymentId" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "paymentSessionId" TEXT,
ADD COLUMN     "paymentStatus" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "webhookReceived" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "razorpayOrderId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "TempOrder_cashfreeOrderId_key" ON "public"."TempOrder"("cashfreeOrderId");
