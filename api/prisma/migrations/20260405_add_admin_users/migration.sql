-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- Seed initial admin
INSERT INTO "admin_users" ("id", "email", "name", "role", "createdAt", "updatedAt")
VALUES (
    gen_random_uuid()::text,
    'johnny@seventyhospitality.com',
    'Johnny',
    'admin',
    NOW(),
    NOW()
);
