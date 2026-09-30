CREATE TABLE "email_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'CUSTOM',
    "description" TEXT,
    "thumbnail_url" TEXT,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "email_sections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_sections_organization_id_name_key" ON "email_sections"("organization_id", "name");
CREATE INDEX "email_sections_organization_id_category_idx" ON "email_sections"("organization_id", "category");

ALTER TABLE "email_sections" ADD CONSTRAINT "email_sections_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
