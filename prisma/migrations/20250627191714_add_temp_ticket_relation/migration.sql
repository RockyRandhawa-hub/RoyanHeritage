-- CreateTable
CREATE TABLE "TempTicket" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "army" BOOLEAN NOT NULL DEFAULT false,
    "tempOrderId" INTEGER NOT NULL,

    CONSTRAINT "TempTicket_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TempTicket" ADD CONSTRAINT "TempTicket_tempOrderId_fkey" FOREIGN KEY ("tempOrderId") REFERENCES "TempOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
