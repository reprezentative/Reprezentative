-- CreateTable
CREATE TABLE "api_calls" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "platform" TEXT,
    "operation" TEXT NOT NULL,
    "units" DOUBLE PRECISION,
    "unitType" TEXT,
    "estimatedCost" DOUBLE PRECISION,
    "currency" TEXT DEFAULT 'USD',
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_calls_service_createdAt_idx" ON "api_calls"("service", "createdAt");
