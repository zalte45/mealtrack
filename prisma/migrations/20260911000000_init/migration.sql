-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "memberId4" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_plans" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quota" INTEGER NOT NULL,
    "mealsPerDay" INTEGER NOT NULL DEFAULT 1,
    "validityDays" INTEGER,
    "price" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "quota" INTEGER NOT NULL,
    "mealsPerDay" INTEGER NOT NULL DEFAULT 1,
    "price" DECIMAL(10,2) NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_records" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "consumedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" TEXT,
    "recordedById" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "status" TEXT NOT NULL DEFAULT 'VALID',
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "users_providerId_status_idx" ON "users"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "users_providerId_email_key" ON "users"("providerId", "email");

-- CreateIndex
CREATE INDEX "customers_providerId_memberId4_idx" ON "customers"("providerId", "memberId4");

-- CreateIndex
CREATE INDEX "customers_providerId_status_idx" ON "customers"("providerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_providerId_memberId4_key" ON "customers"("providerId", "memberId4");

-- CreateIndex
CREATE INDEX "meal_plans_providerId_status_idx" ON "meal_plans"("providerId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_customerId_status_idx" ON "subscriptions"("customerId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_status_endDate_idx" ON "subscriptions"("status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "meal_records_idempotencyKey_key" ON "meal_records"("idempotencyKey");

-- CreateIndex
CREATE INDEX "meal_records_subscriptionId_idx" ON "meal_records"("subscriptionId");

-- CreateIndex
CREATE INDEX "meal_records_subscriptionId_businessDate_status_idx" ON "meal_records"("subscriptionId", "businessDate", "status");

-- CreateIndex
CREATE INDEX "meal_records_customerId_businessDate_idx" ON "meal_records"("customerId", "businessDate");

-- CreateIndex
CREATE INDEX "meal_records_businessDate_status_idx" ON "meal_records"("businessDate", "status");

-- CreateIndex
CREATE INDEX "audit_logs_providerId_timestamp_idx" ON "audit_logs"("providerId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "meal_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_records" ADD CONSTRAINT "meal_records_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
