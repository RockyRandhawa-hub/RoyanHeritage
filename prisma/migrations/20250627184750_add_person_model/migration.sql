-- CreateEnum
CREATE TYPE "Slot" AS ENUM ('TUESDAY_EVENING', 'THURSDAY_EVENING', 'SUNDAY_MORNING');

-- CreateTable
CREATE TABLE "SlotAvailability" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" "Slot" NOT NULL,
    "totalLimit" INTEGER NOT NULL DEFAULT 18,
    "remaining" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TempOrder" (
    "id" SERIAL NOT NULL,
    "razorpayOrderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "slot" "Slot" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requestedTickets" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TempOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visitor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "hasVisited" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Visitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slot" "Slot" NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "army" BOOLEAN NOT NULL DEFAULT false,
    "ticketId" INTEGER NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TempOrder_razorpayOrderId_key" ON "TempOrder"("razorpayOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Visitor_mobile_key" ON "Visitor"("mobile");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "Visitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
