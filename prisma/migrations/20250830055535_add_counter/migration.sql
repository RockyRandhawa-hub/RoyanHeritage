-- CreateTable
CREATE TABLE "public"."Counter" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "count" INTEGER NOT NULL DEFAULT 1000,

    CONSTRAINT "Counter_pkey" PRIMARY KEY ("id")
);
