-- AlterTable
ALTER TABLE "Household" ADD COLUMN "phone" TEXT;

-- CreateTable
CREATE TABLE "Voucher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "rewardKey" TEXT NOT NULL,
    "rewardLabel" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "redeemedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Voucher_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weekLabel" TEXT NOT NULL,
    "truckWeightKg" REAL NOT NULL,
    "digitalWeightKg" REAL NOT NULL,
    "scanCount" INTEGER NOT NULL,
    "approvedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Scan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "householdId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weightKg" REAL NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Scan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Scan" ("category", "createdAt", "householdId", "id", "photoUrl", "pointsEarned", "rejectedAt", "status", "weightKg") SELECT "category", "createdAt", "householdId", "id", "photoUrl", "pointsEarned", "rejectedAt", "status", "weightKg" FROM "Scan";
DROP TABLE "Scan";
ALTER TABLE "new_Scan" RENAME TO "Scan";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Voucher_code_key" ON "Voucher"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Household_phone_key" ON "Household"("phone");

