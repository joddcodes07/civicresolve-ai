ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
CREATE TABLE "PasswordResetToken" (
 "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
CREATE TABLE "SensitivePlace" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "lat" DOUBLE PRECISION NOT NULL, "lng" DOUBLE PRECISION NOT NULL,
 "sourceUrl" TEXT NOT NULL, CONSTRAINT "SensitivePlace_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SensitivePlace_lat_lng_idx" ON "SensitivePlace"("lat", "lng");
CREATE INDEX "Complaint_citizenId_createdAt_idx" ON "Complaint"("citizenId", "createdAt");
