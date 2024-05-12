/*
  Warnings:

  - You are about to drop the column `balance` on the `Account` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Account" DROP COLUMN "balance";

-- CreateTable
CREATE TABLE "Balance" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Balance" ADD CONSTRAINT "Balance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
